import { Routes } from '@angular/router';
import { LandingpageComponent } from './landingpage/landingpage.component';
import { GenerateRecipeComponent } from './generate-recipe/generate-recipe.component';
import { ChooseYourPreferencesComponent } from './choose-your-preferences/choose-your-preferences.component';
import { RecipeResultsComponent } from './recipe-results/recipe-results.component';
import { RecipeDetailComponent } from './recipe-detail/recipe-detail.component';
import { CookbookComponent } from './cookbook/cookbook.component';
import { RecipeLibraryComponent } from './recipe-library/recipe-library.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingpageComponent
  },
  {
    path: 'generate-recipe',
    component: GenerateRecipeComponent
  },
  {
    path: 'choose-your-preferences',
    component: ChooseYourPreferencesComponent
  },
  {
    path: 'recipe-results',
    component: RecipeResultsComponent
  },
  {
    path: 'recipe-results/:id',
    component: RecipeDetailComponent
  },
  {
    path: 'cookbook/:cuisine/:id',
    component: RecipeDetailComponent,
    data: { source: 'library' }
  },
  {
    path: 'cookbook/:cuisine',
    component: RecipeLibraryComponent
  },
  {
    path: 'cookbook',
    component: CookbookComponent
  }
];
