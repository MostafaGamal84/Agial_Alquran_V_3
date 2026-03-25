import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthenticationService } from '../services/authentication.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private authenticationService = inject(AuthenticationService);

  intercept(request: HttpRequest<string>, next: HttpHandler): Observable<HttpEvent<string>> {
    return next.handle(request).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          // auto logout if 401 response returned from api
          this.authenticationService.logout();
        }

        return throwError(() => this.resolveErrorMessage(err));
      })
    );
  }

  private resolveErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      const trimmedError = error.trim();
      return trimmedError || 'تعذر إتمام الطلب';
    }

    if (error instanceof HttpErrorResponse) {
      return (
        this.extractMessage(error.error) ||
        this.extractValidationMessage(error.error) ||
        this.extractMessage(error.message) ||
        this.extractMessage(error.statusText) ||
        'تعذر إتمام الطلب'
      );
    }

    return this.extractMessage(error) || 'تعذر إتمام الطلب';
  }

  private extractValidationMessage(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const errors = (value as { errors?: Array<{ message?: string | null }> }).errors;
    if (!Array.isArray(errors)) {
      return null;
    }

    for (const item of errors) {
      const message = item?.message?.trim();
      if (message) {
        return message;
      }
    }

    return null;
  }

  private extractMessage(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return null;
      }

      try {
        const parsedValue = JSON.parse(trimmedValue) as unknown;
        return this.extractMessage(parsedValue) || trimmedValue;
      } catch {
        return trimmedValue;
      }
    }

    if (typeof value !== 'object') {
      return null;
    }

    const objectValue = value as {
      message?: unknown;
      error?: unknown;
      title?: unknown;
      detail?: unknown;
    };

    return (
      this.extractMessage(objectValue.message) ||
      this.extractMessage(objectValue.error) ||
      this.extractMessage(objectValue.title) ||
      this.extractMessage(objectValue.detail)
    );
  }
}
