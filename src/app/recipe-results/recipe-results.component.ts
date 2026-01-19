import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderCreamLogoComponent } from '../header-cream-logo/header-cream-logo.component';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';
import { RecipeRequestService } from '../services/recipe-request.service';
import { combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-recipe-results',
  standalone: true,
  imports: [CommonModule, HeaderCreamLogoComponent, LoadingScreenComponent],
  templateUrl: './recipe-results.component.html',
  styleUrls: ['./recipe-results.component.scss', './recipe-results_responsive.component.scss']
})
export class RecipeResultsComponent implements OnInit {
  generating$ = this.recipeRequestService.generating$;
  recipeSummaries$ = this.recipeRequestService.recipeSummaries$;
  recipeResults$ = combineLatest([
    this.recipeSummaries$,
    this.recipeRequestService.recipeDetails$
  ]).pipe(
    map(([summaries, details]) => {
      if (summaries.length > 0) {
        return summaries;
      }
      const detailEntries = Object.entries(details);
      if (detailEntries.length === 0) {
        return [];
      }
      return detailEntries.map(([id, detail], index) => ({
        id: detail.id ?? id,
        order: detail.order ?? index + 1,
        title: detail.title,
        cookingTimeMinutes: detail.cookingTimeMinutes,
        cookingTimeLabel: detail.cookingTimeLabel ?? '',
        tags: detail.tags ?? []
      }));
    })
  );
  preferences$ = this.recipeRequestService.preferences$;
  readonly cookTimeLabels: Record<string, string> = {
    under20: 'Quick',
    '25to40': 'Medium',
    over45: 'Complex'
  };

  constructor(
    private recipeRequestService: RecipeRequestService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const payload = this.recipeRequestService.getRequestPayload();
    if (!payload) {
      this.router.navigate(['generate-recipe']);
      return;
    }
  }

  viewRecipe(recipeId: string): void {
    this.router.navigate(['recipe-results', recipeId]);
  }

  async retryWorkflow(): Promise<void> {
    const hasStarted = await this.recipeRequestService.beginWorkflowSimulation();
    if (!hasStarted) {
      this.router.navigate(['generate-recipe']);
    }
  }

  startOver(): void {
    this.recipeRequestService.reset();
    this.router.navigate(['generate-recipe']);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
