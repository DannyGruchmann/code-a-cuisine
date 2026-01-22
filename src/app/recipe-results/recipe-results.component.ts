import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderCreamLogoComponent } from '../header-cream-logo/header-cream-logo.component';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';
import { RecipeDetail, RecipeSummary } from '../models/recipe-request.model';
import { RecipeRequestService } from '../services/recipe-request.service';
import { Subject, combineLatest, map, takeUntil } from 'rxjs';

@Component({
  selector: 'app-recipe-results',
  standalone: true,
  imports: [CommonModule, HeaderCreamLogoComponent, LoadingScreenComponent],
  templateUrl: './recipe-results.component.html',
  styleUrls: ['./recipe-results.component.scss', './recipe-results_responsive.component.scss']
})
export class RecipeResultsComponent implements OnInit, OnDestroy {
  generating$ = this.recipeRequestService.generating$;
  recipeSummaries$ = this.recipeRequestService.recipeSummaries$;
  recipeResults$ = combineLatest([
    this.recipeSummaries$,
    this.recipeRequestService.recipeDetails$
  ]).pipe(
    map(([summaries, details]) => this.buildRecipeResults(summaries, details))
  );
  preferences$ = this.recipeRequestService.preferences$;
  readonly cookTimeLabels: Record<string, string> = {
    under20: 'Quick',
    '25to40': 'Medium',
    over45: 'Complex'
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private recipeRequestService: RecipeRequestService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.hasValidPayload()) {
      this.router.navigate(['generate-recipe']);
      return;
    }
    this.subscribeToQuotaErrors();
    this.subscribeToWorkflowErrors();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private hasValidPayload(): boolean {
    return Boolean(this.recipeRequestService.getRequestPayload());
  }

  private buildRecipeResults(
    summaries: RecipeSummary[],
    details: Record<string, RecipeDetail>
  ): RecipeSummary[] {
    if (summaries.length > 0) {
      return summaries;
    }
    return this.buildResultsFromDetails(details);
  }

  private buildResultsFromDetails(details: Record<string, RecipeDetail>): RecipeSummary[] {
    const detailEntries = Object.entries(details);
    if (detailEntries.length === 0) {
      return [];
    }
    return detailEntries.map(([id, detail], index) =>
      this.mapDetailToSummary(id, detail, index)
    );
  }

  private mapDetailToSummary(id: string, detail: RecipeDetail, index: number): RecipeSummary {
    return {
      id: detail.id ?? id,
      order: detail.order ?? index + 1,
      title: detail.title,
      cookingTimeMinutes: detail.cookingTimeMinutes,
      cookingTimeLabel: detail.cookingTimeLabel ?? '',
      tags: detail.tags ?? []
    };
  }

  private subscribeToQuotaErrors(): void {
    this.recipeRequestService.quotaError$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        if (error) {
          this.router.navigate(['choose-your-preferences']);
        }
      });
  }

  private subscribeToWorkflowErrors(): void {
    this.recipeRequestService.workflowStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        if (status === 'error') {
          this.router.navigate(['choose-your-preferences']);
        }
      });
  }
}
