import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-choose-your-preferences',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent, RouterLink],
  templateUrl: './choose-your-preferences.component.html',
  styleUrls: ['./choose-your-preferences.component.scss']
})
export class ChooseYourPreferencesComponent {
  cookingOptions = [
    { label: 'Quick', description: 'up to 20min' },
    { label: 'Medium', description: '25-40min' },
    { label: 'Complex', description: 'over 45min' }
  ];

  cuisineOptions = ['German', 'Italian', 'Indian', 'Japanese', 'Gourmet', 'Fusion'];

  dietOptions = ['Vegetarian', 'Vegan', 'Keto', 'No preferences'];

  portions = 2;
  cooks = 1;
  selectedCooking = this.cookingOptions[0].label;
  selectedCuisine: string | null = null;
  selectedDiet: string | null = null;

  adjustPortions(amount: number): void {
    this.portions = Math.min(12, Math.max(1, this.portions + amount));
  }

  adjustCooks(amount: number): void {
    this.cooks = Math.min(3, Math.max(1, this.cooks + amount));
  }

  selectCooking(option: string): void {
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
}
