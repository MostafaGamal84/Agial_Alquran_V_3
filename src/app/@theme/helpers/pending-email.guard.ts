import { Injectable, inject } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { DASHBOARD_PATH } from 'src/app/app-config';

@Injectable({ providedIn: 'root' })
export class PendingEmailGuard implements CanActivate {
  private authService = inject(AuthenticationService);
  private router = inject(Router);

  canActivate(): boolean | UrlTree {
    if (this.authService.isLoggedIn()) {
      return this.router.parseUrl(DASHBOARD_PATH);
    }

    if (this.authService.pendingEmail) {
      return true;
    }

    return this.router.parseUrl('/login');
  }
}
