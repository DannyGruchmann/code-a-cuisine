import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header-green-logo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header-green-logo.component.html',
  styleUrls: ['./header-green-logo.component.scss']
})
export class HeaderGreenLogoComponent {}
