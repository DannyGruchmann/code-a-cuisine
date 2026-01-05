import { Routes } from '@angular/router';
import { LandingpageComponent } from './landingpage/landingpage.component';
import { GenerateRecipeComponent } from './generate-recipe/generate-recipe.component';
import { ChooseYourPreferencesComponent } from './choose-your-preferences/choose-your-preferences.component';

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
  }
];
