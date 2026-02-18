// angular import
import { OnInit, Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

// project import
import { BuyNowLinkService } from './@theme/services/buy-now-link.service';
import { LanguageService } from './@theme/services/language.service';
import { AccessibilityService } from './core/services/accessibility.service';
import { AnnouncerService } from './core/services/announcer.service';

// Angular material
import { MatProgressBar } from '@angular/material/progress-bar';
import { AutoTranslateDirective } from './demo/shared/directives/auto-translate.directive';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatProgressBar, AutoTranslateDirective],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  activeRoute = inject(ActivatedRoute);
  private productIdService = inject(BuyNowLinkService);
  private languageService = inject(LanguageService);
  private accessibilityService = inject(AccessibilityService);
  readonly announcerService = inject(AnnouncerService);

  // public props
  isSpinnerVisible = true;

  ngOnInit() {
    this.languageService.initialize();
    this.accessibilityService.initialize();

    this.router.events.subscribe(
      (event) => {
        if (event instanceof NavigationStart) {
          setTimeout(() => {
            this.isSpinnerVisible = true;
          });
        } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
          setTimeout(() => {
            this.isSpinnerVisible = false;
          });
        }
      },
      () => {
        setTimeout(() => {
          this.isSpinnerVisible = false;
        });
      }
    );

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      setTimeout(() => {
        this.handleRouteAccessibility();
      }, 50);
    });

    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    this.productIdService.setBuyNowLink(params);
  }

  onSkipToContent(event: Event): void {
    event.preventDefault();
    this.focusMainContent();
  }

  private focusMainContent(): void {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
    }
  }

  private handleRouteAccessibility(): void {
    const mainContent = document.getElementById('main-content');
    const mainHeading = document.querySelector('#main-content h1, #main-content [data-main-heading="true"]') as HTMLElement | null;

    if (mainHeading) {
      if (!mainHeading.hasAttribute('tabindex')) {
        mainHeading.setAttribute('tabindex', '-1');
      }
      mainHeading.focus();
    } else if (mainContent) {
      mainContent.focus();
    }

    const pageTitle = document.title || 'Page loaded';
    this.announcerService.announcePolite(pageTitle);
  }
}
