import { Injectable, inject } from '@angular/core';
import { Router, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthenticationService } from '../services/authentication.service';

@Injectable({ providedIn: 'root' })
export class AuthGuardChild implements CanActivateChild {
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);

  /**
   * Determines whether a child route can be activated based on user authentication.
   *
   * @param _route - The activated route snapshot (unused).
   * @param state - The router state snapshot that contains the current router state.
   * @returns True if the user is logged in; otherwise, redirects to the login page.
   */

  canActivateChild(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.authenticationService.isLoggedIn()) {
      // User is logged in; allow access regardless of role
      return true;
    }

    // User not logged in, redirect to login page
    const encodedReturnUrl = encodeURIComponent(state.url ?? '/');
    return this.router.parseUrl(`/login?returnUrl=${encodedReturnUrl}`);
  }
}
