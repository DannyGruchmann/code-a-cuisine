import { Routes } from '@angular/router';
import { LandingpageComponent } from './landingpage/landingpage.component';
import { GenerateRecipeComponent } from './generate-recipe/generate-recipe.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingpageComponent
  },
  {
    path: 'generate-recipe',
    component: GenerateRecipeComponent
  }
];
