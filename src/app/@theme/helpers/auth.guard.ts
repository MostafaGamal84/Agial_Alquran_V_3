import { Injectable, inject } from '@angular/core';
import { Router, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthenticationService } from '../services/authentication.service';

@Injectable({ providedIn: 'root' })
export class AuthGuardChild implements CanActivateChild {
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);

  /**
   * Determines whether a child route can be activated based on user authentication and authorization.
   *
   * @param route - The activated route snapshot that contains the route configuration and parameters.
   * @param state - The router state snapshot that contains the current router state.
   * @returns A boolean indicating whether the route can be activated. Redirects to an appropriate page if not.
   *
   * If the user is logged in and their role is authorized for the route, returns true.
   * If the user is logged in but not authorized, redirects to the unauthorized page and returns false.
   * If the user is not logged in, redirects to the login page with the return URL and returns false.
   */

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const userRole = this.authenticationService.getRole();

    if (userRole && this.authenticationService.isLoggedIn()) {
      const { roles } = route.data;
      if (roles && !roles.includes(userRole)) {
        // User not authorized, redirect to unauthorized page
        return this.router.parseUrl('/unauthorized');
      }
      // User is logged in and authorized for child routes
      return true;
    }

    // User not logged in or role unavailable, redirect to login page
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
}
