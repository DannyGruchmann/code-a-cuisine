import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HeaderCreamLogoComponent } from '../header-cream-logo/header-cream-logo.component';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [HeaderCreamLogoComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './loading-screen.component.html',
  styleUrls: ['./loading-screen.component.scss']
})
export class LoadingScreenComponent {}
