export type CookTimePreference = 'under20' | '25to40' | 'over45';
export type WorkflowStatus = 'idle' | 'loading' | 'success' | 'error';

export interface IngredientEntry {
  name: string;
  amount: number;
  unit: string;
}

export interface PreferenceSelection {
  portions: number;
  helpers: number;
  cookTime: CookTimePreference;
  cuisine: string | null;
  dietPreferences: string[];
}

export interface RecipeRequestPayload {
  ingredients: IngredientEntry[];
  preferences: PreferenceSelection;
}

export interface NutritionalInformation {
  energyKcal: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}

export interface RecipeSummary {
  id: string;
  order: number;
  title: string;
  cookingTimeMinutes: number;
  cookingTimeLabel: string;
  tags: string[];
}

export type IngredientSource = 'user' | 'extra';

export interface RecipeIngredientBreakdown {
  name: string;
  amount: number;
  unit: string;
  source: IngredientSource;
}

export interface RecipeDirectionStep {
  order: number;
  title: string;
  instruction: string;
  assignedChefIndex: number;
}

export interface RecipeDetail extends RecipeSummary {
  description: string;
  helperLabels: string[];
  nutritionalInformation: NutritionalInformation;
  primaryIngredients: RecipeIngredientBreakdown[];
  extraIngredients: RecipeIngredientBreakdown[];
  directions: RecipeDirectionStep[];
  hearts: number;
}
