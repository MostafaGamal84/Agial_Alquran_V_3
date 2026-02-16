// angular import
import { Component, effect, inject, Input } from '@angular/core';
import { NgIf, NgStyle } from '@angular/common';

// project import
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';
import { LTR, RTL } from '../../const';

// third party
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'app-scrollbar',
  imports: [NgScrollbarModule, NgIf, NgStyle],
  templateUrl: './ngx-scrollbar.html',
  styleUrl: './ngx-scrollbar.scss'
})
export class NgxScrollbar {
  private themeService = inject(ThemeLayoutService);

  @Input() customStyle: { [key: string]: string } = {};

  direction: string = LTR;
  useNativeScroll = false;

  // constructor
  constructor() {
    this.useNativeScroll =
      typeof window !== 'undefined' &&
      (window.matchMedia('(hover: none), (pointer: coarse)').matches || navigator.maxTouchPoints > 0);

    effect(() => {
      this.themeDirection(this.themeService.directionChange());
    });
  }

  // private method
  private themeDirection(direction: string) {
    this.direction = direction === RTL ? RTL : LTR;
  }
}
