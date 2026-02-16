// angular import
import { OnInit, Component, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, ActivatedRoute, RouterOutlet } from '@angular/router';

// project import
import { BuyNowLinkService } from './@theme/services/buy-now-link.service';
import { LanguageService } from './@theme/services/language.service';
import { AccessibilityService } from './core/services/accessibility.service';

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

  // public props
  isSpinnerVisible = true;

  ngOnInit() {
    this.languageService.initialize();
    this.accessibilityService.initializeMode();
    // Use ngOnInit instead of ngAfterViewInit
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
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    this.productIdService.setBuyNowLink(params);
  }
}
