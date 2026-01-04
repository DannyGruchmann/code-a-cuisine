import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderCreamLogoComponent } from '../header-cream-logo/header-cream-logo.component';

@Component({
  selector: 'app-landingpage',
  standalone: true,
  imports: [HeaderCreamLogoComponent, RouterLink],
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss','./landingpage_responisve.component.scss']
})
export class LandingpageComponent {

}
