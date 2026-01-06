import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { RecipeDetail } from '../models/recipe-request.model';
import { RecipeRequestService } from '../services/recipe-request.service';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss']
})
export class RecipeDetailComponent {
  detail$ = combineLatest([this.route.paramMap, this.recipeRequestService.recipeDetails$]).pipe(
    map(([params, details]) => {
      const recipeId = params.get('id');
      if (!recipeId) {
        this.router.navigate(['recipe-results']);
        return null;
      }
      const detail = details[recipeId] as RecipeDetail | undefined;
      if (!detail && this.recipeRequestService.getWorkflowStatusSnapshot() === 'success') {
        this.router.navigate(['recipe-results']);
      }
      return detail ?? null;
    })
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeRequestService: RecipeRequestService
  ) {}

  goBack(): void {
    this.router.navigate(['recipe-results']);
  }

  trackByOrder(_index: number, step: { order: number }): number {
    return step.order;
  }
}
