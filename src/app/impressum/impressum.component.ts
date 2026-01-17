import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderGreenLogoComponent } from '../header-green-logo/header-green-logo.component';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, HeaderGreenLogoComponent],
  templateUrl: './impressum.component.html',
  styleUrls: ['./impressum.component.scss']
})
export class ImpressumComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['cookbook']);
  }
}
