import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';
import { IngredientEntry } from '../models/recipe-request.model';
import { RecipeRequestService } from '../services/recipe-request.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-generate-recipe',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent, ReactiveFormsModule],
  templateUrl: './generate-recipe.component.html',
  styleUrls: ['./generate-recipe.component.scss', './generate-recipe_responsive.component.scss']
})
export class GenerateRecipeComponent implements OnInit {
  units = ['piece', 'ml', 'gram'];
  selectedUnit = 'gram';
  unitDropdownOpen = false;
  ingredientForm: FormGroup;
  ingredients: FormArray = this.fb.array([]);
  editingIndex: number | null = null;
  editingUnitDropdownIndex: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private recipeRequestService: RecipeRequestService,
  ) {
    this.ingredientForm = this.fb.group({
      name: ['', Validators.required],
      amount: [100, [Validators.required, Validators.min(1)]],
      unit: [this.selectedUnit, Validators.required]
    });
    const nameControl = this.ingredientForm.get('name') as FormControl;
    this.normalizeNameControl(nameControl);
  }

  ngOnInit(): void {
    const savedIngredients = this.recipeRequestService.getIngredientsSnapshot();
    if (savedIngredients.length > 0) {
      savedIngredients.forEach((ingredient: IngredientEntry) => {
        this.ingredients.push(this.createIngredientGroup(ingredient));
      });
    }
  }

  get ingredientControls() {
    return this.ingredients.controls as FormGroup[];
  }

  get hasIngredients(): boolean {
    return this.ingredients.length > 0;
  }

  addIngredient(): void {
    if (this.ingredientForm.invalid) {
      this.ingredientForm.markAllAsTouched();
      return;
    }

    this.ingredients.push(
      this.createIngredientGroup({
        name: this.ingredientForm.value.name,
        amount: this.ingredientForm.value.amount,
        unit: this.ingredientForm.value.unit
      })
    );

    this.ingredientForm.reset({
      name: '',
      amount: 100,
      unit: this.selectedUnit
    });
  }

  removeIngredient(index: number): void {
    this.ingredients.removeAt(index);
    if (this.editingIndex !== null) {
      if (this.editingIndex === index) {
        this.editingIndex = null;
        this.editingUnitDropdownIndex = null;
      } else if (this.editingIndex > index) {
        this.editingIndex = this.editingIndex - 1;
      }
    }
  }

  editIngredient(index: number): void {
    this.editingIndex = index;
    this.editingUnitDropdownIndex = null;
  }

  confirmIngredientEdit(index: number): void {
    const ingredientGroup = this.ingredients.at(index) as FormGroup;
    if (ingredientGroup.invalid) {
      ingredientGroup.markAllAsTouched();
      return;
    }
    this.editingIndex = null;
    this.editingUnitDropdownIndex = null;
  }

  isEditing(index: number): boolean {
    return this.editingIndex === index;
  }

  toggleEditingUnitDropdown(index: number, event: Event): void {
    event.stopPropagation();
    this.editingUnitDropdownIndex =
      this.editingUnitDropdownIndex === index ? null : index;
  }

  selectEditingUnit(unit: string, index: number, event: Event): void {
    event.stopPropagation();
    const ingredientGroup = this.ingredients.at(index) as FormGroup;
    ingredientGroup.patchValue({ unit });
    this.editingUnitDropdownIndex = null;
  }

  onSubmit(): void {
    if (!this.hasIngredients) {
      this.ingredientForm.markAllAsTouched();
      return;
    }
    // Placeholder for Firebase call
    console.log('Submitting ingredients', this.ingredients.value);
  }

  toggleUnitDropdown(event: Event): void {
    event.stopPropagation();
    this.unitDropdownOpen = !this.unitDropdownOpen;
  }

  selectUnit(unit: string, event: Event): void {
    event.stopPropagation();
    this.selectedUnit = unit;
    this.unitDropdownOpen = false;
    this.ingredientForm.patchValue({ unit });
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.unitDropdownOpen = false;
    this.editingUnitDropdownIndex = null;
  }

  goToPreferences(): void {
    if (!this.hasIngredients) {
      return;
    }
    this.recipeRequestService.setIngredients(this.ingredients.value as IngredientEntry[]);
    this.router.navigate(['choose-your-preferences']);
  }

  private createIngredientGroup(ingredient?: IngredientEntry): FormGroup {
    const group = this.fb.group({
      name: [ingredient?.name ?? '', Validators.required],
      amount: [ingredient?.amount ?? 100, [Validators.required, Validators.min(1)]],
      unit: [ingredient?.unit ?? this.selectedUnit, Validators.required]
    });
    this.normalizeNameControl(group.get('name') as FormControl);
    return group;
  }

  private normalizeNameControl(control: FormControl): void {
    control.valueChanges.subscribe((value) => {
      if (typeof value !== 'string') {
        return;
      }
      const normalized = this.capitalizeFirst(value);
      if (value !== normalized) {
        control.setValue(normalized, { emitEvent: false });
      }
    });
  }

  private capitalizeFirst(value: string): string {
    if (!value) {
      return value;
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
