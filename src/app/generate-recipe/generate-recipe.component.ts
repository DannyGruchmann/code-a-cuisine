import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';

@Component({
  selector: 'app-generate-recipe',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent],
  templateUrl: './generate-recipe.component.html',
  styleUrls: ['./generate-recipe.component.scss']
})
export class GenerateRecipeComponent {
  units = ['piece', 'ml', 'gram'];
  selectedUnit = 'gram';
  unitDropdownOpen = false;

  toggleUnitDropdown(event: Event): void {
    event.stopPropagation();
    this.unitDropdownOpen = !this.unitDropdownOpen;
  }

  selectUnit(unit: string, event: Event): void {
    event.stopPropagation();
    this.selectedUnit = unit;
    this.unitDropdownOpen = false;
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.unitDropdownOpen = false;
  }
}
