import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Observable, combineLatest, map, of, switchMap, tap } from 'rxjs';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { RecipeDetail, RecipeSummary } from '../models/recipe-request.model';
import { RecipeLibraryDetail, RecipeLibraryService } from '../services/recipe-library.service';
import { RecipeRequestService } from '../services/recipe-request.service';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss', './recipe-detail_responsive.component.scss']
})
export class RecipeDetailComponent {
  ingredientsCollapsed = false;
  directionsCollapsed = false;
  isRecipeLiked = false;
  likeCount = 0;
  likePending = false;
  currentRecipeId: string | null = null;
  readonly chefAssets = [
    {
      bg: '#D7DFD7',
      img: 'assets/img/recipe-detail/chef-hut.svg'
    },
    {
      bg: '#FFD9B3',
      img: 'assets/img/recipe-detail/soup-chef.svg'
    },
    {
      bg: '#F2F3B2',
      img: 'assets/img/recipe-detail/beginner-chef.svg'
    },
    {
      bg: '#99CC99',
      img: 'assets/img/recipe-detail/helper-chef-hut.svg'
    }
  ];
  preferences$ = this.recipeRequestService.preferences$;
  readonly cookTimeLabels: Record<string, string> = {
    under20: 'Quick',
    '25to40': 'Medium',
    over45: 'Complex'
  };

  readonly isLibraryDetail = this.route.snapshot.data['source'] === 'library';
  detail$: Observable<RecipeDetail | RecipeLibraryDetail | null> = this.createDetailStream();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeRequestService: RecipeRequestService,
    private libraryService: RecipeLibraryService
  ) {}

  goBack(): void {
    if (this.isLibraryDetail) {
      const cuisine = this.route.snapshot.paramMap.get('cuisine');
      this.router.navigate(cuisine ? ['cookbook', cuisine] : ['cookbook']);
      return;
    }
    this.router.navigate(['recipe-results']);
  }

  goToCookbook(): void {
    this.router.navigate(['cookbook']);
  }

  startOver(): void {
    this.recipeRequestService.reset();
    this.router.navigate(['generate-recipe']);
  }

  toggleIngredients(): void {
    this.ingredientsCollapsed = !this.ingredientsCollapsed;
  }

  toggleDirections(): void {
    this.directionsCollapsed = !this.directionsCollapsed;
  }

  toggleLike(): void {
    if (!this.canToggleLike()) {
      return;
    }
    const recipeId = this.currentRecipeId as string;
    const shouldLike = !this.isRecipeLiked;
    this.likePending = true;
    this.applyLikeChange(recipeId, shouldLike);
  }

  trackByOrder(_index: number, step: { order: number }): number {
    return step.order;
  }

  private syncLikeState(detail: RecipeDetail | RecipeLibraryDetail | null): void {
    if (!detail) {
      this.resetLikeState();
      return;
    }
    this.applyDetailLikeState(detail);
  }

  private createDetailStream(): Observable<RecipeDetail | RecipeLibraryDetail | null> {
    return this.route.data.pipe(
      switchMap((data) => this.getDetailSourceStream(data)),
      tap((detail) => this.syncLikeState(detail))
    );
  }

  private getDetailSourceStream(data: Record<string, unknown>) {
    return data['source'] === 'library' ? this.getLibraryDetailStream() : this.getGeneratedDetailStream();
  }

  private getLibraryDetailStream(): Observable<RecipeLibraryDetail | null> {
    return this.route.paramMap.pipe(switchMap((params) => this.fetchLibraryDetail(params)));
  }

  private fetchLibraryDetail(params: ParamMap) {
    const recipeId = params.get('id');
    if (!recipeId) {
      this.router.navigate(['cookbook']);
      return of(null);
    }
    return this.libraryService.getRecipeById(recipeId);
  }

  private getGeneratedDetailStream(): Observable<RecipeDetail | null> {
    return combineLatest([
      this.route.paramMap,
      this.recipeRequestService.recipeDetails$,
      this.recipeRequestService.recipeSummaries$
    ]).pipe(map(([params, details, summaries]) => this.resolveGeneratedDetail(params, details, summaries)));
  }

  private resolveGeneratedDetail(params: ParamMap, details: Record<string, RecipeDetail>, summaries: RecipeSummary[]): RecipeDetail | null {
    const recipeId = params.get('id');
    if (!recipeId) {
      this.router.navigate(['recipe-results']);
      return null;
    }
    const detail = details[recipeId] as RecipeDetail | undefined;
    const summary = summaries.find((recipe) => recipe.id === recipeId);
    if (!detail && summary) {
      return this.hydrateGeneratedDetail(this.buildFallbackDetail(summary));
    }
    const merged = this.mergeSummaryDetail(summary, detail);
    return this.handleMissingGeneratedDetail(this.hydrateGeneratedDetail(merged));
  }

  private mergeSummaryDetail(
    summary: RecipeSummary | undefined,
    detail: RecipeDetail | undefined
  ): RecipeDetail | undefined {
    return detail ? ({ ...(summary ?? {}), ...detail } as RecipeDetail) : undefined;
  }

  private handleMissingGeneratedDetail(merged: RecipeDetail | null): RecipeDetail | null {
    if (!merged && this.recipeRequestService.getWorkflowStatusSnapshot() === 'success') {
      this.router.navigate(['recipe-results']);
    }
    return merged ?? null;
  }

  private buildFallbackDetail(summary: RecipeSummary): RecipeDetail {
    return {
      id: summary.id,
      order: summary.order,
      title: summary.title,
      cookingTimeMinutes: summary.cookingTimeMinutes,
      cookingTimeLabel: summary.cookingTimeLabel ?? '',
      tags: summary.tags ?? [],
      description: '',
      helperLabels: [],
      nutritionalInformation: {
        energyKcal: 0,
        proteinGrams: 0,
        fatGrams: 0,
        carbsGrams: 0
      },
      primaryIngredients: [],
      extraIngredients: [],
      directions: [],
      hearts: 0
    };
  }

  private hydrateGeneratedDetail(detail: RecipeDetail | null | undefined): RecipeDetail | null {
    if (!detail || this.isLibraryDetail) {
      return detail ?? null;
    }
    const ingredients = this.recipeRequestService.getIngredientsSnapshot();
    const primary = detail.primaryIngredients ?? [];
    const extra = detail.extraIngredients ?? [];
    if (primary.length > 0 || ingredients.length === 0) {
      return { ...detail, primaryIngredients: primary, extraIngredients: extra };
    }
    const fallbackPrimary = ingredients.map((item) => ({
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      source: 'user' as const
    }));
    return {
      ...detail,
      primaryIngredients: fallbackPrimary,
      extraIngredients: extra
    };
  }

  private canToggleLike(): boolean {
    return Boolean(this.isLibraryDetail && this.currentRecipeId && !this.likePending);
  }

  private applyLikeChange(recipeId: string, shouldLike: boolean): void {
    this.libraryService
      .toggleRecipeLike(recipeId, shouldLike)
      .then((nextHearts) => this.handleLikeResult(nextHearts, recipeId, shouldLike))
      .finally(() => {
        this.likePending = false;
      });
  }

  private handleLikeResult(nextHearts: number | null, recipeId: string, shouldLike: boolean): void {
    if (nextHearts === null) {
      return;
    }
    this.isRecipeLiked = shouldLike;
    this.likeCount = nextHearts;
    this.updateStoredLikes(recipeId, shouldLike);
  }

  private resetLikeState(): void {
    this.currentRecipeId = null;
    this.likeCount = 0;
    this.isRecipeLiked = false;
  }

  private applyDetailLikeState(detail: RecipeDetail | RecipeLibraryDetail): void {
    if (this.isLibraryDetail) {
      const recipeId = 'docId' in detail ? detail.docId ?? detail.id : detail.id;
      this.currentRecipeId = recipeId;
      this.likeCount = detail.hearts ?? 0;
      this.isRecipeLiked = this.isRecipeLikedByUser(recipeId);
      return;
    }
    this.currentRecipeId = null;
    this.likeCount = detail.hearts ?? 0;
    this.isRecipeLiked = false;
  }

  private isRecipeLikedByUser(recipeId: string): boolean {
    return this.loadStoredLikes().has(recipeId);
  }

  private updateStoredLikes(recipeId: string, shouldLike: boolean): void {
    const likedIds = this.loadStoredLikes();
    if (shouldLike) {
      likedIds.add(recipeId);
    } else {
      likedIds.delete(recipeId);
    }
    this.persistStoredLikes(likedIds);
  }

  private loadStoredLikes(): Set<string> {
    if (typeof window === 'undefined') {
      return new Set();
    }
    try {
      const raw = window.localStorage.getItem('likedRecipeIds');
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw) as string[];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.warn('Failed to read liked recipes', error);
      return new Set();
    }
  }

  private persistStoredLikes(likedIds: Set<string>): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem('likedRecipeIds', JSON.stringify(Array.from(likedIds)));
    } catch (error) {
      console.warn('Failed to persist liked recipes', error);
    }
  }
}
