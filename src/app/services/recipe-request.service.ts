import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  docSnapshots,
  serverTimestamp,
  updateDoc,
  DocumentReference,
  DocumentData
} from '@angular/fire/firestore';
import {
  IngredientEntry,
  PreferenceSelection,
  RecipeDetail,
  RecipeRequestPayload,
  RecipeSummary,
  WorkflowStatus
} from '../models/recipe-request.model';
import { environment } from '../../environments/environment';
import {
  FirestoreRecipeRequest,
  FirestoreRecipeResults,
  extractResults,
  normalizeSummaries,
  normalizeWorkflowStatus
} from './recipe-request.parsers';
import {
  QuotaStatus,
  buildWebhookResult,
  parseJson,
  beginQuotaLoad,
  handleQuotaResponse,
  handleQuotaFailure,
  logWebhookError
} from './recipe-request.workflow';
import {
  clearStoredRequestId,
  getStoredRequestId,
  storeRequestId
} from './recipe-request.storage';

@Injectable({
  providedIn: 'root'
})
export class RecipeRequestService implements OnDestroy {
  private readonly ingredientsSubject = new BehaviorSubject<IngredientEntry[]>([]);
  private readonly preferencesSubject = new BehaviorSubject<PreferenceSelection | null>(null);
  private readonly workflowStatusSubject = new BehaviorSubject<WorkflowStatus>('idle');
  private readonly generatingSubject = new BehaviorSubject<boolean>(false);
  private readonly recipeSummariesSubject = new BehaviorSubject<RecipeSummary[]>([]);
  private readonly recipeDetailsSubject = new BehaviorSubject<Record<string, RecipeDetail>>({});
  private readonly quotaSubject = new BehaviorSubject<QuotaStatus | null>(null);
  private readonly quotaErrorSubject = new BehaviorSubject<string | null>(null);
  private readonly quotaLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly webhookUrl = environment.n8nWebhookUrl;
  private readonly quotaUrl = environment.n8nQuotaUrl;
  private readonly workflowTimeoutMs = 30000;
  private workflowTimeoutId: number | null = null;

  private activeRequestId: string | null = null;
  private activeRequestSubscription: Subscription | null = null;

  readonly ingredients$ = this.ingredientsSubject.asObservable();
  readonly preferences$ = this.preferencesSubject.asObservable();
  readonly workflowStatus$ = this.workflowStatusSubject.asObservable();
  readonly generating$ = this.generatingSubject.asObservable();
  readonly recipeSummaries$ = this.recipeSummariesSubject.asObservable();
  readonly recipeDetails$ = this.recipeDetailsSubject.asObservable();
  readonly quota$ = this.quotaSubject.asObservable();
  readonly quotaError$ = this.quotaErrorSubject.asObservable();
  readonly quotaLoading$ = this.quotaLoadingSubject.asObservable();

  constructor(private firestore: Firestore) {
    const existingRequestId = getStoredRequestId();
    if (existingRequestId) {
      this.attachRequestListener(existingRequestId);
    }
  }

  ngOnDestroy(): void {
    this.detachRequestListener();
    this.clearWorkflowTimeout();
  }

  setIngredients(ingredients: IngredientEntry[]): void {
    this.ingredientsSubject.next(ingredients);
  }

  setPreferences(preferences: PreferenceSelection): void {
    this.preferencesSubject.next(preferences);
  }

  getIngredientsSnapshot(): IngredientEntry[] {
    return this.ingredientsSubject.getValue();
  }

  getPreferencesSnapshot(): PreferenceSelection | null {
    return this.preferencesSubject.getValue();
  }

  getRequestPayload(): RecipeRequestPayload | null {
    const preferences = this.preferencesSubject.getValue();
    const ingredients = this.ingredientsSubject.getValue();

    if (!preferences || ingredients.length === 0) {
      return null;
    }

    return {
      ingredients,
      preferences
    };
  }

  getWorkflowStatusSnapshot(): WorkflowStatus {
    return this.workflowStatusSubject.getValue();
  }

  getQuotaErrorSnapshot(): string | null {
    return this.quotaErrorSubject.getValue();
  }

  async beginWorkflowSimulation(): Promise<boolean> {
    this.generatingSubject.next(true);
    const payload = this.getRequestPayload();
    if (!payload) {
      return this.failMissingPayload();
    }
    return this.startWorkflowRequest(payload);
  }

  private failMissingPayload(): boolean {
    this.workflowStatusSubject.next('error');
    this.generatingSubject.next(false);
    return false;
  }

  private async startWorkflowRequest(payload: RecipeRequestPayload): Promise<boolean> {
    this.prepareWorkflowRequest();
    return this.executeWorkflowRequest(payload);
  }

  private async executeWorkflowRequest(payload: RecipeRequestPayload): Promise<boolean> {
    try {
      const docRef = await this.createRequestDocument(payload);
      const webhookResult = await this.triggerWorkflowWebhook(docRef.id, payload);
      if (!webhookResult.ok) {
        return await this.handleWebhookFailure(docRef, webhookResult);
      }
      this.updateQuotaFromWebhook(webhookResult);
      this.activateRequest(docRef.id);
      return true;
    } catch (error) {
      return this.handleWorkflowError(error);
    }
  }

  private prepareWorkflowRequest(): void {
    this.workflowStatusSubject.next('loading');
    this.recipeSummariesSubject.next([]);
    this.recipeDetailsSubject.next({});
    this.detachRequestListener();
    this.startWorkflowTimeout();
    this.quotaErrorSubject.next(null);
  }

  private async createRequestDocument(
    payload: RecipeRequestPayload
  ): Promise<DocumentReference<DocumentData>> {
    return addDoc(collection(this.firestore, 'recipeRequests'), {
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      payload,
      results: {
        summaries: [],
        details: {}
      }
    });
  }

  private async handleWebhookFailure(
    docRef: DocumentReference<DocumentData>,
    webhookResult: { message?: string }
  ): Promise<boolean> {
    const errorMessage = webhookResult.message ?? 'All requests used. Please try again tomorrow.';
    this.quotaErrorSubject.next(errorMessage);
    await this.updateRequestErrorStatus(docRef, errorMessage);
    this.setWorkflowErrorState();
    return false;
  }

  private async updateRequestErrorStatus(
    docRef: DocumentReference<DocumentData>,
    errorMessage: string
  ): Promise<void> {
    try {
      await updateDoc(docRef, {
        status: 'error',
        errorMessage,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Failed to update request error status', err);
    }
  }

  private updateQuotaFromWebhook(webhookResult: { quota?: QuotaStatus }): void {
    if (webhookResult.quota) {
      this.quotaSubject.next(webhookResult.quota);
    }
  }

  private activateRequest(requestId: string): void {
    this.activeRequestId = requestId;
    storeRequestId(requestId);
    this.attachRequestListener(requestId);
  }

  private handleWorkflowError(error: unknown): boolean {
    console.error('Failed to create recipe request', error);
    this.setWorkflowErrorState();
    return false;
  }

  private setWorkflowErrorState(): void {
    this.workflowStatusSubject.next('error');
    this.generatingSubject.next(false);
    this.clearWorkflowTimeout();
  }

  reset(): void {
    this.ingredientsSubject.next([]);
    this.preferencesSubject.next(null);
    this.workflowStatusSubject.next('idle');
    this.generatingSubject.next(false);
    this.recipeSummariesSubject.next([]);
    this.recipeDetailsSubject.next({});
    this.quotaErrorSubject.next(null);
    clearStoredRequestId();
    this.detachRequestListener();
    this.clearWorkflowTimeout();
  }

  getRecipeDetailSnapshot(recipeId: string): RecipeDetail | null {
    const details = this.recipeDetailsSubject.getValue();
    return details[recipeId] ?? null;
  }

  private attachRequestListener(requestId: string): void {
    const requestDoc = doc(this.firestore, 'recipeRequests', requestId);
    this.activeRequestId = requestId;
    this.activeRequestSubscription = docSnapshots(requestDoc).subscribe({
      next: (snapshot) => this.handleRequestSnapshot(snapshot),
      error: (err) => this.handleRequestListenerError(err)
    });
  }

  private handleRequestSnapshot(snapshot: { exists: () => boolean; data: () => unknown }): void {
    if (!snapshot.exists()) {
      return;
    }
    const data = snapshot.data() as FirestoreRecipeRequest;
    this.applyStatusFromData(data);
    this.applyResultsFromData(data);
    this.logWorkflowError(data);
  }

  private applyStatusFromData(data: FirestoreRecipeRequest): void {
    if (!data.status) {
      return;
    }
    const normalizedStatus = normalizeWorkflowStatus(data.status);
    this.workflowStatusSubject.next(normalizedStatus);
    if (normalizedStatus === 'success' || normalizedStatus === 'error') {
      this.stopGeneration();
    }
  }

  private applyResultsFromData(data: FirestoreRecipeRequest): void {
    const { summaries, details } = extractResults(data);
    this.applySummaries(summaries, details);
    this.applyDetails(details);
  }

  private applySummaries(
    summaries?: FirestoreRecipeResults['summaries'],
    details?: FirestoreRecipeResults['details']
  ): void {
    const normalized = normalizeSummaries(summaries, details);
    if (!normalized) {
      return;
    }
    this.recipeSummariesSubject.next(normalized);
    if (normalized.length > 0) {
      this.stopGeneration();
    }
  }

  private applyDetails(details?: FirestoreRecipeResults['details']): void {
    if (!details) {
      return;
    }
    this.recipeDetailsSubject.next(details);
    if (Object.keys(details).length > 0) {
      this.stopGeneration();
    }
  }

  private stopGeneration(): void {
    this.generatingSubject.next(false);
    this.clearWorkflowTimeout();
  }

  private logWorkflowError(data: FirestoreRecipeRequest): void {
    if (data.status === 'error' && data.errorMessage) {
      console.error('Recipe workflow error:', data.errorMessage);
    }
  }

  private handleRequestListenerError(err: unknown): void {
    console.error('Error listening to recipe request', err);
    this.workflowStatusSubject.next('error');
    this.quotaErrorSubject.next('All requests used. Please try again tomorrow.');
    this.stopGeneration();
  }

  private detachRequestListener(): void {
    if (this.activeRequestSubscription) {
      this.activeRequestSubscription.unsubscribe();
      this.activeRequestSubscription = null;
    }
    this.activeRequestId = null;
  }

  private startWorkflowTimeout(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.clearWorkflowTimeout();
    this.workflowTimeoutId = window.setTimeout(() => {
      if (this.workflowStatusSubject.getValue() === 'loading') {
        this.quotaErrorSubject.next('All requests used. Please try again tomorrow.');
        this.workflowStatusSubject.next('error');
        this.generatingSubject.next(false);
      }
      this.clearWorkflowTimeout();
    }, this.workflowTimeoutMs);
  }

  private clearWorkflowTimeout(): void {
    if (this.workflowTimeoutId !== null) {
      window.clearTimeout(this.workflowTimeoutId);
      this.workflowTimeoutId = null;
    }
  }

  async refreshQuota(): Promise<void> {
    if (!this.quotaUrl) {
      return;
    }
    beginQuotaLoad(this.quotaLoadingSubject, this.quotaErrorSubject);
    try {
      const response = await fetch(this.quotaUrl);
      const data = await parseJson(response);
      handleQuotaResponse(this.quotaSubject, this.quotaErrorSubject, response, data);
    } catch (error) {
      handleQuotaFailure(this.quotaErrorSubject, error);
    } finally {
      this.quotaLoadingSubject.next(false);
    }
  }

  private async triggerWorkflowWebhook(
    requestId: string,
    payload: RecipeRequestPayload
  ): Promise<{ ok: boolean; message?: string; quota?: QuotaStatus }> {
    if (!this.webhookUrl) {
      return { ok: false, message: 'Webhook URL missing. Please contact support.' };
    }
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, payload })
      });
      const data = await parseJson(response);
      return buildWebhookResult(response, data);
    } catch (error) {
      logWebhookError(error);
      return { ok: false, message: 'All requests used. Please try again tomorrow.' };
    }
  }
}
