import { Component } from '@angular/core';
import { HeaderCreamLogoComponent } from '../header-cream-logo/header-cream-logo.component';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [HeaderCreamLogoComponent],
  templateUrl: './loading-screen.component.html',
  styleUrls: ['./loading-screen.component.scss']
})
export class LoadingScreenComponent {}
