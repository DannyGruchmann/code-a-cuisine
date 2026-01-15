import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  docSnapshots,
  serverTimestamp
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

interface FirestoreRecipeResults {
  summaries?: RecipeSummary[] | Record<string, RecipeSummary>;
  details?: Record<string, RecipeDetail>;
}

interface FirestoreRecipeRequest {
  status?: WorkflowStatus | 'pending' | 'processing' | 'completed' | 'done';
  results?: FirestoreRecipeResults | RecipeSummary[];
  summaries?: RecipeSummary[] | Record<string, RecipeSummary>;
  details?: Record<string, RecipeDetail>;
  recipes?: RecipeSummary[] | Record<string, RecipeSummary>;
  recipeSummaries?: RecipeSummary[] | Record<string, RecipeSummary>;
  recipeDetails?: Record<string, RecipeDetail>;
  items?: RecipeSummary[] | Record<string, RecipeSummary>;
  errorMessage?: string;
}

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
  private readonly webhookUrl = environment.n8nWebhookUrl;

  private activeRequestId: string | null = null;
  private activeRequestSubscription: Subscription | null = null;

  readonly ingredients$ = this.ingredientsSubject.asObservable();
  readonly preferences$ = this.preferencesSubject.asObservable();
  readonly workflowStatus$ = this.workflowStatusSubject.asObservable();
  readonly generating$ = this.generatingSubject.asObservable();
  readonly recipeSummaries$ = this.recipeSummariesSubject.asObservable();
  readonly recipeDetails$ = this.recipeDetailsSubject.asObservable();

  constructor(private firestore: Firestore) {
    const existingRequestId = this.getStoredRequestId();
    if (existingRequestId) {
      this.attachRequestListener(existingRequestId);
    }
  }

  ngOnDestroy(): void {
    this.detachRequestListener();
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

  async beginWorkflowSimulation(): Promise<boolean> {
    this.generatingSubject.next(true);
    const payload = this.getRequestPayload();
    if (!payload) {
      this.workflowStatusSubject.next('error');
      this.generatingSubject.next(false);
      return false;
    }

    this.workflowStatusSubject.next('loading');
    this.recipeSummariesSubject.next([]);
    this.recipeDetailsSubject.next({});
    this.detachRequestListener();

    try {
      const docRef = await addDoc(collection(this.firestore, 'recipeRequests'), {
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        payload,
        results: {
          summaries: [],
          details: {}
        }
      });

      this.activeRequestId = docRef.id;
      this.storeRequestId(docRef.id);
      this.attachRequestListener(docRef.id);
      void this.triggerWorkflowWebhook(docRef.id, payload);
      return true;
    } catch (error) {
      console.error('Failed to create recipe request', error);
      this.workflowStatusSubject.next('error');
      this.generatingSubject.next(false);
      return false;
    }
  }

  reset(): void {
    this.ingredientsSubject.next([]);
    this.preferencesSubject.next(null);
    this.workflowStatusSubject.next('idle');
    this.generatingSubject.next(false);
    this.recipeSummariesSubject.next([]);
    this.recipeDetailsSubject.next({});
    this.clearStoredRequestId();
    this.detachRequestListener();
  }

  getRecipeDetailSnapshot(recipeId: string): RecipeDetail | null {
    const details = this.recipeDetailsSubject.getValue();
    return details[recipeId] ?? null;
  }

  private attachRequestListener(requestId: string): void {
    const requestDoc = doc(this.firestore, 'recipeRequests', requestId);
    this.activeRequestId = requestId;
    this.activeRequestSubscription = docSnapshots(requestDoc).subscribe({
      next: (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }
        const data = snapshot.data() as FirestoreRecipeRequest;
        if (data.status) {
          const normalizedStatus = this.normalizeWorkflowStatus(data.status);
          this.workflowStatusSubject.next(normalizedStatus);
          if (normalizedStatus === 'success' || normalizedStatus === 'error') {
            this.generatingSubject.next(false);
          }
        }
        const { summaries, details } = this.extractResults(data);
        const normalizedSummaries = this.normalizeSummaries(summaries, details);
        if (normalizedSummaries) {
          this.recipeSummariesSubject.next(normalizedSummaries);
          if (normalizedSummaries.length > 0) {
            this.generatingSubject.next(false);
          }
        }
        if (details) {
          this.recipeDetailsSubject.next(details);
          if (Object.keys(details).length > 0) {
            this.generatingSubject.next(false);
          }
        }
        if (data.status === 'error' && data.errorMessage) {
          console.error('Recipe workflow error:', data.errorMessage);
        }
      },
      error: (err) => {
        console.error('Error listening to recipe request', err);
        this.workflowStatusSubject.next('error');
      }
    });
  }

  private detachRequestListener(): void {
    if (this.activeRequestSubscription) {
      this.activeRequestSubscription.unsubscribe();
      this.activeRequestSubscription = null;
    }
    this.activeRequestId = null;
  }

  private normalizeWorkflowStatus(status: FirestoreRecipeRequest['status']): WorkflowStatus {
    if (!status) {
      return 'idle';
    }
    if (status === 'pending' || status === 'processing') {
      return 'loading';
    }
    if (status === 'completed' || status === 'done') {
      return 'success';
    }
    if (status === 'idle' || status === 'loading' || status === 'success' || status === 'error') {
      return status;
    }
    return 'loading';
  }

  private normalizeSummaries(
    summaries?: FirestoreRecipeResults['summaries'],
    details?: FirestoreRecipeResults['details']
  ): RecipeSummary[] | null {
    if (Array.isArray(summaries)) {
      return summaries;
    }
    if (summaries && typeof summaries === 'object') {
      return Object.values(summaries as Record<string, RecipeSummary>);
    }
    if (details && typeof details === 'object') {
      return Object.entries(details).map(([id, detail], index) => ({
        id: detail.id ?? id,
        order: detail.order ?? index + 1,
        title: detail.title,
        cookingTimeMinutes: detail.cookingTimeMinutes,
        cookingTimeLabel: detail.cookingTimeLabel ?? '',
        tags: detail.tags ?? []
      }));
    }
    return null;
  }

  private extractResults(data: FirestoreRecipeRequest): {
    summaries?: FirestoreRecipeResults['summaries'];
    details?: FirestoreRecipeResults['details'];
  } {
    const results = data.results;
    if (Array.isArray(results)) {
      return { summaries: results };
    }
    const resultsAny =
      results && typeof results === 'object' ? (results as Record<string, unknown>) : undefined;
    return {
      summaries:
        (results as FirestoreRecipeResults | undefined)?.summaries ??
        data.summaries ??
        (resultsAny?.['recipes'] as FirestoreRecipeResults['summaries']) ??
        (resultsAny?.['recipeSummaries'] as FirestoreRecipeResults['summaries']) ??
        (resultsAny?.['items'] as FirestoreRecipeResults['summaries']) ??
        data.recipes ??
        data.recipeSummaries ??
        data.items,
      details:
        (results as FirestoreRecipeResults | undefined)?.details ??
        data.details ??
        data.recipeDetails
    };
  }

  private storeRequestId(id: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.setItem('activeRecipeRequestId', id);
    } catch (err) {
      console.warn('Unable to persist request id', err);
    }
  }

  private clearStoredRequestId(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.removeItem('activeRecipeRequestId');
    } catch (err) {
      console.warn('Unable to clear request id', err);
    }
  }

  private getStoredRequestId(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.sessionStorage.getItem('activeRecipeRequestId');
    } catch {
      return null;
    }
  }

  private async triggerWorkflowWebhook(requestId: string, payload: RecipeRequestPayload): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('n8n webhook URL missing; skip webhook trigger');
      return;
    }
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          payload
        })
      });
      if (!response.ok) {
        console.error('Webhook responded with non-OK status', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to trigger n8n webhook', error);
    }
  }
}
