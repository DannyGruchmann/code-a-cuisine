import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CookTimePreference, PreferenceSelection } from '../models/recipe-request.model';
import { RecipeRequestService } from '../services/recipe-request.service';

@Component({
  selector: 'app-choose-your-preferences',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent],
  templateUrl: './choose-your-preferences.component.html',
  styleUrls: ['./choose-your-preferences.component.scss']
})

export class ChooseYourPreferencesComponent implements OnInit {
  cookingOptions = [
    { label: 'Quick', description: 'up to 20min', value: 'under20' as CookTimePreference },
    { label: 'Medium', description: '25-40min', value: '25to40' as CookTimePreference },
    { label: 'Complex', description: 'over 45min', value: 'over45' as CookTimePreference }
  ];

  cuisineOptions = ['German', 'Italian', 'Indian', 'Japanese', 'Gourmet', 'Fusion'];

  dietOptions = ['Vegetarian', 'Vegan', 'Keto', 'No preferences'];

  portions = 2;
  cooks = 1;
  selectedCooking: CookTimePreference = this.cookingOptions[0].value;
  selectedCuisine: string | null = null;
  selectedDiet: string | null = null;
  hasTriedGenerate = false;
  readonly quota$ = this.recipeRequestService.quota$;
  readonly quotaError$ = this.recipeRequestService.quotaError$;
  readonly quotaLoading$ = this.recipeRequestService.quotaLoading$;

  constructor(
    private recipeRequestService: RecipeRequestService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    const savedPreferences = this.recipeRequestService.getPreferencesSnapshot();
    if (savedPreferences) {
      this.applySavedPreferences(savedPreferences);
    }
    void this.recipeRequestService.refreshQuota();
  }

  adjustPortions(amount: number): void {
    this.portions = Math.min(12, Math.max(1, this.portions + amount));
  }

  adjustCooks(amount: number): void {
    this.cooks = Math.min(4, Math.max(1, this.cooks + amount));
  }

  selectCooking(option: CookTimePreference): void {
    this.selectedCooking = option;
  }

  selectCuisine(option: string): void {
    this.selectedCuisine = option;
  }

  isCuisineSelected(option: string): boolean {
    return this.selectedCuisine === option;
  }

  selectDiet(option: string): void {
    this.selectedDiet = option;
  }

  isDietSelected(option: string): boolean {
    return this.selectedDiet === option;
  }

  async generateRecipe(): Promise<void> {
    this.hasTriedGenerate = true;
    const preferences: PreferenceSelection = {
      portions: this.portions,
      helpers: this.cooks,
      cookTime: this.selectedCooking,
      cuisine: this.selectedCuisine,
      dietPreferences: this.selectedDiet ? [this.selectedDiet] : []
    };
    this.recipeRequestService.setPreferences(preferences);
    const started = await this.recipeRequestService.beginWorkflowSimulation();
    if (started) {
      this.router.navigate(['recipe-results']);
    }
  }

  goBack(): void {
    this.location.back();
  }

  private applySavedPreferences(preferences: PreferenceSelection): void {
    this.portions = preferences.portions;
    this.cooks = preferences.helpers;
    this.selectedCooking = preferences.cookTime;
    this.selectedCuisine = preferences.cuisine;
    this.selectedDiet = preferences.dietPreferences[0] ?? null;
  }
}
