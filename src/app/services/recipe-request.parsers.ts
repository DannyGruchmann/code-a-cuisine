import { RecipeDetail, RecipeSummary, WorkflowStatus } from '../models/recipe-request.model';

export interface FirestoreRecipeResults {
  summaries?: RecipeSummary[] | Record<string, RecipeSummary>;
  details?: Record<string, RecipeDetail>;
}

export interface FirestoreRecipeRequest {
  status?: WorkflowStatus | 'pending' | 'processing' | 'completed' | 'done';
  results?: FirestoreRecipeResults | RecipeSummary[];
  resultsRaw?: string | { stringValue?: string };
  summaries?: RecipeSummary[] | Record<string, RecipeSummary>;
  details?: Record<string, RecipeDetail>;
  recipes?: RecipeSummary[] | Record<string, RecipeSummary>;
  recipeSummaries?: RecipeSummary[] | Record<string, RecipeSummary>;
  recipeDetails?: Record<string, RecipeDetail>;
  items?: RecipeSummary[] | Record<string, RecipeSummary>;
  errorMessage?: string;
}

export function normalizeWorkflowStatus(
  status: FirestoreRecipeRequest['status']
): WorkflowStatus {
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

export function normalizeSummaries(
  summaries?: FirestoreRecipeResults['summaries'],
  details?: FirestoreRecipeResults['details']
): RecipeSummary[] | null {
  if (Array.isArray(summaries)) {
    return summaries;
  }
  const summaryList = extractSummaryList(summaries);
  if (summaryList) {
    return summaryList;
  }
  return buildSummariesFromDetails(details);
}

export function extractResults(data: FirestoreRecipeRequest): {
  summaries?: FirestoreRecipeResults['summaries'];
  details?: FirestoreRecipeResults['details'];
} {
  const raw = extractRawResults(data.resultsRaw);
  if (raw) {
    return raw;
  }
  const results = data.results;
  if (Array.isArray(results)) {
    return { summaries: results };
  }
  const resultsAny = asRecord(results);
  return {
    summaries: pickSummaries(results, resultsAny, data),
    details: pickDetails(results, data)
  };
}

function extractRawResults(
  resultsRaw: FirestoreRecipeRequest['resultsRaw']
): { summaries?: FirestoreRecipeResults['summaries']; details?: FirestoreRecipeResults['details'] } | null {
  const raw =
    typeof resultsRaw === 'string'
      ? resultsRaw
      : resultsRaw && typeof resultsRaw === 'object'
        ? resultsRaw.stringValue
        : undefined;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as {
      summaries?: FirestoreRecipeResults['summaries'];
      details?: FirestoreRecipeResults['details'];
    };
    if (parsed && (parsed.summaries || parsed.details)) {
      return { summaries: parsed.summaries, details: parsed.details };
    }
  } catch {
    return null;
  }
  return null;
}

function extractSummaryList(
  summaries?: FirestoreRecipeResults['summaries']
): RecipeSummary[] | null {
  if (summaries && typeof summaries === 'object') {
    return Object.values(summaries as Record<string, RecipeSummary>);
  }
  return null;
}

function buildSummariesFromDetails(
  details?: FirestoreRecipeResults['details']
): RecipeSummary[] | null {
  if (!details || typeof details !== 'object') {
    return null;
  }
  return Object.entries(details).map(([id, detail], index) => ({
    id: detail.id ?? id,
    order: detail.order ?? index + 1,
    title: detail.title,
    cookingTimeMinutes: detail.cookingTimeMinutes,
    cookingTimeLabel: detail.cookingTimeLabel ?? '',
    tags: detail.tags ?? []
  }));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function pickSummaries(
  results: FirestoreRecipeRequest['results'],
  resultsAny: Record<string, unknown> | undefined,
  data: FirestoreRecipeRequest
): FirestoreRecipeResults['summaries'] | undefined {
  const candidates = [
    (results as FirestoreRecipeResults | undefined)?.summaries,
    data.summaries,
    resultsAny?.['recipes'] as FirestoreRecipeResults['summaries'],
    resultsAny?.['recipeSummaries'] as FirestoreRecipeResults['summaries'],
    resultsAny?.['items'] as FirestoreRecipeResults['summaries'],
    data.recipes,
    data.recipeSummaries,
    data.items
  ];
  return candidates.find((value) => value !== undefined);
}

function pickDetails(
  results: FirestoreRecipeRequest['results'],
  data: FirestoreRecipeRequest
): FirestoreRecipeResults['details'] | undefined {
  const resultsTyped = results as FirestoreRecipeResults | undefined;
  return resultsTyped?.details ?? data.details ?? data.recipeDetails;
}
