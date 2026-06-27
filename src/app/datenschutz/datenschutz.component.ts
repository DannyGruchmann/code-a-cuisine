import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';

@Component({
  selector: 'app-datenschutz',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent],
  templateUrl: './datenschutz.component.html',
  styleUrls: [
    '../impressum/impressum.component.scss',
    '../impressum/impressum_responsive.component.scss'
  ]
})
export class DatenschutzComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['']);
  }
}
