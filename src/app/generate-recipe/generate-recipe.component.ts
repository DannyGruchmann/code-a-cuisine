import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';

@Component({
  selector: 'app-generate-recipe',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent, ReactiveFormsModule],
  templateUrl: './generate-recipe.component.html',
  styleUrls: ['./generate-recipe.component.scss']
})
export class GenerateRecipeComponent {
  units = ['piece', 'ml', 'gram'];
  selectedUnit = 'gram';
  unitDropdownOpen = false;
  ingredientForm: FormGroup;
  ingredients: FormArray = this.fb.array([]);
  editingIndex: number | null = null;
  editingUnitDropdownIndex: number | null = null;

  constructor(private fb: FormBuilder) {
    this.ingredientForm = this.fb.group({
      name: ['', Validators.required],
      amount: [100, [Validators.required, Validators.min(1)]],
      unit: [this.selectedUnit, Validators.required]
    });
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
      this.fb.group({
        name: [this.ingredientForm.value.name, Validators.required],
        amount: [this.ingredientForm.value.amount, [Validators.required, Validators.min(1)]],
        unit: [this.ingredientForm.value.unit, Validators.required]
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
}
