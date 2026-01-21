import { DOCUMENT } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnDestroy, OnInit } from '@angular/core';
import { HeaderCreamLogoComponent } from '../header-cream-logo/header-cream-logo.component';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [HeaderCreamLogoComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './loading-screen.component.html',
  styleUrls: ['./loading-screen.component.scss']
})
export class LoadingScreenComponent implements OnInit, OnDestroy {
  private previousBodyOverflow = '';

  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousBodyOverflow;
  }
}
