import { Component } from '@angular/core';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { Router } from '@angular/router';
import { RecipeRequestService } from '../services/recipe-request.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cookbook',
  standalone: true,
  imports: [HeaderGreenLogoComponent, RouterModule],
  templateUrl: './cookbook.component.html',
  styleUrls: ['./cookbook.component.scss', './cookbook_responsive.component.scss']
})
export class CookbookComponent {

  constructor(
    private recipeRequestService: RecipeRequestService,
    private router: Router,
  ) { }


  goBack(): void {
    this.router.navigate(['recipe-results']);
  }

  startOver(): void {
    this.recipeRequestService.reset();
    this.router.navigate(['generate-recipe']);
  }
}
