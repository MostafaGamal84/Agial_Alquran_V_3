import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../services/authentication.service';

const AUDIT_SCREEN_ROUTES: Array<{ route: string; key: string }> = [
  { route: '/online-course/student', key: 'students' },
  { route: '/online-course/teacher', key: 'teachers' },
  { route: '/online-course/manager', key: 'managers' },
  { route: '/online-course/branch-manager', key: 'branch-managers' },
  { route: '/online-course/courses', key: 'circles' },
  { route: '/online-course/report', key: 'reports' },
  { route: '/online-course/pricing', key: 'pricing' },
  { route: '/online-course/site', key: 'site' },
  { route: '/online-course/setting', key: 'settings' },
  { route: '/online-course/deleted-objects', key: 'deleted-objects' },
  { route: '/online-course/operations-log', key: 'operations-log' },
  { route: '/online-course/dashboard', key: 'dashboard' },
  { route: '/auth/login', key: 'login' }
];

@Injectable()
export class BasicAuthInterceptor implements HttpInterceptor {
  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  intercept(request: HttpRequest<string>, next: HttpHandler): Observable<HttpEvent<string>> {
    const currentUser = this.authenticationService.currentUserValue;
    const isLoggedIn = currentUser && currentUser.serviceToken;
    const isApiUrl = request.url.startsWith(environment.apiUrl);

    if (isApiUrl) {
      const currentRoute = this.getCurrentRoute();
      const sourceScreenKey = this.resolveSourceScreenKey(currentRoute);
      const headers: Record<string, string> = {};

      if (isLoggedIn) {
        headers['Authorization'] = `Bearer ${currentUser.serviceToken}`;
      }

      if (currentRoute) {
        headers['X-Audit-Source-Route'] = currentRoute;
      }

      if (sourceScreenKey) {
        headers['X-Audit-Source-Screen'] = sourceScreenKey;
      }

      request = request.clone({
        setHeaders: headers
      });
    }

    return next.handle(request);
  }

  private getCurrentRoute(): string | null {
    const routerUrl = this.normalizeText(this.router.url?.split('?')[0]);
    if (routerUrl) {
      return routerUrl;
    }

    if (typeof window !== 'undefined') {
      return this.normalizeText(window.location.pathname);
    }

    return null;
  }

  private resolveSourceScreenKey(route: string | null): string | null {
    const normalizedRoute = route?.toLowerCase();
    if (!normalizedRoute) {
      return null;
    }

    return AUDIT_SCREEN_ROUTES.find((item) => normalizedRoute.includes(item.route))?.key ?? null;
  }

  private normalizeText(value: string | null | undefined): string | null {
    const normalizedValue = `${value ?? ''}`.trim();
    return normalizedValue || null;
  }
}
