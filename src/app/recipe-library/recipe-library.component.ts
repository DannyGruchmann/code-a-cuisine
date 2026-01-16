import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, map, switchMap, tap } from 'rxjs';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { RecipeLibraryService, RecipeLibraryEntry } from '../services/recipe-library.service';

type CuisineKey = 'italian' | 'german' | 'japanese' | 'gourmet' | 'indian' | 'fusion';

const CUISINE_CONFIG: Record<
  CuisineKey,
  { label: string; hero: string; accent: string }
> = {
  italian: {
    label: 'Italian cuisine',
    hero: 'assets/img/libary/Property 1=Italian.svg',
    accent: 'assets/img/cookbook/nice.png'
  },
  german: {
    label: 'German cuisine',
    hero: 'assets/img/libary/Property 1=German.svg',
    accent: 'assets/img/cookbook/braezle.png'
  },
  japanese: {
    label: 'Japanese cuisine',
    hero: 'assets/img/libary/Property 1=Japanese.svg',
    accent: 'assets/img/cookbook/staebche.png'
  },
  gourmet: {
    label: 'Gourmet cuisine',
    hero: 'assets/img/libary/Property 1=Gourmet.svg',
    accent: 'assets/img/cookbook/stars.png'
  },
  indian: {
    label: 'Indian cuisine',
    hero: 'assets/img/libary/Property 1=Indian.svg',
    accent: 'assets/img/cookbook/chicken-rice.png'
  },
  fusion: {
    label: 'Fusion cuisine',
    hero: 'assets/img/libary/Property 1=Fusion.svg',
    accent: 'assets/img/cookbook/fusion.png'
  }
};

const PAGE_SIZE = 20;

@Component({
  selector: 'app-recipe-library',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderGreenLogoComponent],
  templateUrl: './recipe-library.component.html',
  styleUrls: ['./recipe-library.component.scss']
})
export class RecipeLibraryComponent {
  private readonly pageSubject = new BehaviorSubject<number>(1);
  readonly page$ = this.pageSubject.asObservable();
  readonly cuisineKey$ = this.route.paramMap.pipe(
    map((params) => (params.get('cuisine') || 'italian').toLowerCase() as CuisineKey),
    tap(() => this.pageSubject.next(1))
  );
  readonly recipes$ = this.cuisineKey$.pipe(
    switchMap((cuisine) => this.libraryService.getRecipesByCuisine(this.toCuisineLabel(cuisine)))
  );

  readonly viewModel$ = combineLatest([this.recipes$, this.page$, this.cuisineKey$]).pipe(
    map(([recipes, page, cuisineKey]) => {
      const totalPages = Math.max(1, Math.ceil(recipes.length / PAGE_SIZE));
      const currentPage = Math.min(page, totalPages);
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const pageRecipes = recipes.slice(startIndex, startIndex + PAGE_SIZE);
      return {
        cuisineKey,
        config: CUISINE_CONFIG[cuisineKey],
        recipes: pageRecipes,
        currentPage,
        totalPages,
        pages: Array.from({ length: totalPages }, (_, index) => index + 1)
      };
    })
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private libraryService: RecipeLibraryService
  ) {}

  goBack(): void {
    this.router.navigate(['cookbook']);
  }

  setPage(page: number): void {
    this.pageSubject.next(page);
  }

  getRecipeId(recipe: RecipeLibraryEntry): string {
    return recipe.docId ?? recipe.id;
  }

  trackRecipe(_index: number, recipe: RecipeLibraryEntry): string {
    return recipe.docId ?? recipe.id;
  }

  private toCuisineLabel(key: CuisineKey): string {
    return CUISINE_CONFIG[key].label.split(' ')[0];
  }
}
