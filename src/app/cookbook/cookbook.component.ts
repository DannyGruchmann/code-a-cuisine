import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { Router } from '@angular/router';
import { RecipeRequestService } from '../services/recipe-request.service';
import { RouterModule } from '@angular/router';
import { RecipeLibraryEntry, RecipeLibraryService } from '../services/recipe-library.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-cookbook',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent, RouterModule],
  templateUrl: './cookbook.component.html',
  styleUrls: ['./cookbook.component.scss', './cookbook_responsive.component.scss']
})
export class CookbookComponent {
  readonly mostLikedRecipes$: Observable<RecipeLibraryEntry[]>;

  constructor(
    private recipeRequestService: RecipeRequestService,
    private router: Router,
    private recipeLibraryService: RecipeLibraryService
  ) {
    this.mostLikedRecipes$ = this.recipeLibraryService.getMostLikedRecipes(5);
  }


  goBack(): void {
    this.router.navigate(['recipe-results']);
  }

  startOver(): void {
    this.recipeRequestService.reset();
    this.router.navigate(['generate-recipe']);
  }

  getRecipeRoute(recipe: RecipeLibraryEntry): string[] {
    const recipeId = recipe.docId ?? recipe.id;
    const cuisineKey = this.normalizeCuisineKey(recipe.cuisine);
    if (!recipeId) {
      return ['/cookbook'];
    }
    return ['/cookbook', cuisineKey, recipeId];
  }

  navigateToRecipe(recipe: RecipeLibraryEntry): void {
    this.router.navigate(this.getRecipeRoute(recipe));
  }

  trackByRecipe(_index: number, recipe: RecipeLibraryEntry): string {
    return recipe.docId ?? recipe.id;
  }

  private normalizeCuisineKey(cuisine: string | undefined | null): string {
    const normalized = (cuisine ?? '').trim().toLowerCase();
    if (!normalized) {
      return 'italian';
    }
    const firstWord = normalized.split(' ')[0];
    const knownKeys = ['italian', 'german', 'japanese', 'gourmet', 'indian', 'fusion'];
    return knownKeys.includes(firstWord) ? firstWord : normalized;
  }
}
