import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { RecipeDetail } from '../models/recipe-request.model';
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

  private readonly isLibraryDetail = this.route.snapshot.data['source'] === 'library';
  detail$: Observable<RecipeDetail | RecipeLibraryDetail | null> = this.route.data.pipe(
    switchMap((data) => {
      if (data['source'] === 'library') {
        return this.route.paramMap.pipe(
          switchMap((params) => {
            const recipeId = params.get('id');
            if (!recipeId) {
              this.router.navigate(['cookbook']);
              return of(null);
            }
            return this.libraryService.getRecipeById(recipeId);
          })
        );
      }

      return combineLatest([
        this.route.paramMap,
        this.recipeRequestService.recipeDetails$,
        this.recipeRequestService.recipeSummaries$
      ]).pipe(
        map(([params, details, summaries]) => {
          const recipeId = params.get('id');
          if (!recipeId) {
            this.router.navigate(['recipe-results']);
            return null;
          }
          const detail = details[recipeId] as RecipeDetail | undefined;
          const summary = summaries.find((recipe) => recipe.id === recipeId);
          const mergedDetail = detail
            ? ({ ...(summary ?? {}), ...detail } as RecipeDetail)
            : undefined;
          if (!mergedDetail && this.recipeRequestService.getWorkflowStatusSnapshot() === 'success') {
            this.router.navigate(['recipe-results']);
          }
          return mergedDetail ?? null;
        })
      );
    })
  );

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
    this.isRecipeLiked = !this.isRecipeLiked;
  }

  trackByOrder(_index: number, step: { order: number }): number {
    return step.order;
  }

}
