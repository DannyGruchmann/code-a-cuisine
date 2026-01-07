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
  summaries?: RecipeSummary[];
  details?: Record<string, RecipeDetail>;
}

interface FirestoreRecipeRequest {
  status?: WorkflowStatus;
  results?: FirestoreRecipeResults;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeRequestService implements OnDestroy {
  private readonly ingredientsSubject = new BehaviorSubject<IngredientEntry[]>([]);
  private readonly preferencesSubject = new BehaviorSubject<PreferenceSelection | null>(null);
  private readonly workflowStatusSubject = new BehaviorSubject<WorkflowStatus>('idle');
  private readonly recipeSummariesSubject = new BehaviorSubject<RecipeSummary[]>([]);
  private readonly recipeDetailsSubject = new BehaviorSubject<Record<string, RecipeDetail>>({});
  private readonly webhookUrl = environment.n8nWebhookUrl;

  private activeRequestId: string | null = null;
  private activeRequestSubscription: Subscription | null = null;

  readonly ingredients$ = this.ingredientsSubject.asObservable();
  readonly preferences$ = this.preferencesSubject.asObservable();
  readonly workflowStatus$ = this.workflowStatusSubject.asObservable();
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
    const payload = this.getRequestPayload();
    if (!payload) {
      this.workflowStatusSubject.next('error');
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
      await this.triggerWorkflowWebhook(docRef.id, payload);
      return true;
    } catch (error) {
      console.error('Failed to create recipe request', error);
      this.workflowStatusSubject.next('error');
      return false;
    }
  }

  reset(): void {
    this.ingredientsSubject.next([]);
    this.preferencesSubject.next(null);
    this.workflowStatusSubject.next('idle');
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
          this.workflowStatusSubject.next(data.status);
        }
        if (data.results?.summaries) {
          this.recipeSummariesSubject.next(data.results.summaries);
        }
        if (data.results?.details) {
          this.recipeDetailsSubject.next(data.results.details);
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
