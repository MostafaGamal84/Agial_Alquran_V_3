// angular import
import { DOCUMENT } from '@angular/common';
import { OnInit, Component, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, ActivatedRoute, RouterOutlet } from '@angular/router';

// project import
import { BuyNowLinkService } from './@theme/services/buy-now-link.service';
import { LanguageService } from './@theme/services/language.service';

// Angular material
import { MatProgressBar } from '@angular/material/progress-bar';
import { AutoTranslateDirective } from './demo/shared/directives/auto-translate.directive';
import { AccessibilityService } from './@theme/services/accessibility.service';
import { AnnouncerService } from './@theme/services/announcer.service';

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
  private announcerService = inject(AnnouncerService);
  private document = inject(DOCUMENT);

  // public props
  isSpinnerVisible = true;
  politeLiveMessage = '';
  assertiveLiveMessage = '';

  ngOnInit() {
    this.languageService.initialize();
    this.accessibilityService.initialize();

    this.announcerService.politeMessage$.subscribe((message) => {
      this.politeLiveMessage = message;
    });

    this.announcerService.assertiveMessage$.subscribe((message) => {
      this.assertiveLiveMessage = message;
    });

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

          if (event instanceof NavigationEnd) {
            this.handleNavigationAccessibility();
          }
        }
      },
      () => {
        setTimeout(() => {
          this.isSpinnerVisible = false;
        });
      }
    );

    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    this.productIdService.setBuyNowLink(params);
  }

  skipToContent(event: Event): void {
    event.preventDefault();
    const main = this.getMainElement();

    if (main) {
      this.focusElement(main);
      this.announcerService.announcePolite('تم الانتقال إلى المحتوى الرئيسي. Skipped to main content.');
    }
  }

  private handleNavigationAccessibility(): void {
    setTimeout(() => {
      const heading = this.document.querySelector('main h1, [role="main"] h1, h1') as HTMLElement | null;
      if (heading) {
        this.focusElement(heading);
      } else {
        const main = this.getMainElement();
        if (main) {
          this.focusElement(main);
        }
      }

      const pageTitle = this.document.title || 'Page loaded';
      this.announcerService.announcePolite(`تم فتح الصفحة: ${pageTitle}. Opened page: ${pageTitle}.`);
    });
  }

  private getMainElement(): HTMLElement | null {
    return this.document.querySelector('main, [role="main"], #main-content') as HTMLElement | null;
  }

  private focusElement(element: HTMLElement): void {
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '-1');
    }
    element.focus({ preventScroll: false });
  }
}
