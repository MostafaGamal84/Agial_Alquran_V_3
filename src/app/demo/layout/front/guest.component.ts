// angular import
import { Component, effect, inject } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';

// service
import { BuyNowLinkService } from 'src/app/@theme/services/buy-now-link.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';

// project import
import { ConfigurationComponent } from '../../../@theme/layouts/configuration/configuration.component';
// data
import { techData } from '../../data/tech-data';

// type
import { TechSection } from 'src/app/@theme/types/tech-data-type';

// const
import { DARK } from 'src/app/@theme/const';

// Angular Material
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss'],
  imports: [
    MatToolbar,
    MatButton,
    NgClass,
    RouterLink,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    MatTooltip,
    NgStyle,
    MatAnchor,
    RouterOutlet,
    ConfigurationComponent
  ]
})
export class GuestComponent {
  buyNowLinkService = inject(BuyNowLinkService);
  authenticationService = inject(AuthenticationService);
  private themeService = inject(ThemeLayoutService);

  // public props
  navDataShow!: boolean;
  dropDownIcon: string = 'custom-arrowDown2';
  drpTechBlock: TechSection[] = techData;
  isDarkMode: boolean;

  // constructor
  constructor() {
    effect(() => {
      this.themeMode(this.themeService.isDarkMode());
    });
  }

  // private method
  private themeMode(isDark: string) {
    this.isDarkMode = isDark === DARK ? true : false;
  }

  // public methods
  open(item: TechSection) {
    window.open(window.location.href.replace(window.location.search, '') + item.url + this.buyNowLinkService.queryString, '_blank');
  }
  openDashboard() {
    window.open(
      window.location.href.replace(window.location.href, '') + 'dashboard/default' + this.buyNowLinkService.queryString,
      '_blank'
    );
  }
  toggleIcon(): void {
    this.dropDownIcon = 'custom-arrowUp2';
  }
  resetIcon(): void {
    this.dropDownIcon = 'custom-arrowDown2';
  }
}
