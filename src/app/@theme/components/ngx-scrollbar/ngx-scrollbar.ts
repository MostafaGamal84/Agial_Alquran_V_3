// angular import
import { Component, effect, inject, Input } from '@angular/core';

// project import
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';
import { LTR, RTL } from '../../const';

// third party
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'app-scrollbar',
  imports: [NgScrollbarModule],
  templateUrl: './ngx-scrollbar.html',
  styleUrl: './ngx-scrollbar.scss'
})
export class NgxScrollbar {
  private themeService = inject(ThemeLayoutService);

  @Input() customStyle: { [key: string]: string } = {};

  direction: string = LTR;

  // constructor
  constructor() {
    effect(() => {
      this.themeDirection(this.themeService.directionChange());
    });
  }

  // private method
  private themeDirection(direction: string) {
    this.direction = direction === RTL ? RTL : LTR;
  }
}
