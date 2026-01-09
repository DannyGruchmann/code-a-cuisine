import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderCreamLogoComponent } from '../header-cream-logo/header-cream-logo.component';
import { RecipeRequestService } from '../services/recipe-request.service';

@Component({
  selector: 'app-recipe-results',
  standalone: true,
  imports: [CommonModule, HeaderCreamLogoComponent],
  templateUrl: './recipe-results.component.html',
  styleUrls: ['./recipe-results.component.scss']
})
export class RecipeResultsComponent implements OnInit {
  workflowStatus$ = this.recipeRequestService.workflowStatus$;
  recipeSummaries$ = this.recipeRequestService.recipeSummaries$;

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
