import { enableProdMode, importProvidersFrom } from '@angular/core';

import { environment } from './environments/environment';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BasicAuthInterceptor } from 'src/app/@theme/helpers/basic-auth.interceptor';
import { ErrorInterceptor } from 'src/app/@theme/helpers/error.interceptor';
import { AppRoutingModule } from './app/app-routing.module';
import { SharedModule } from './app/demo/shared/shared.module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { GuestModule } from './app/demo/layout/front';
import { AppComponent } from './app/app.component';
import { MAT_SELECT_CONFIG, MatSelectConfig } from '@angular/material/select';

function coerceSelectValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object') {
    const typedValue = value as Record<string, unknown>;
    const candidateKeys: Array<'id' | 'value' | 'key'> = ['id', 'value', 'key'];
    for (const key of candidateKeys) {
      const candidate = typedValue[key];
      if (candidate !== undefined && candidate !== null) {
        return coerceSelectValue(candidate);
      }
    }
  }

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  return `${value}`.trim();
}

const matSelectConfig: MatSelectConfig = {
  compareWith: (option: unknown, value: unknown) => {
    if (option === value) {
      return true;
    }

    const normalizedOption = coerceSelectValue(option);
    const normalizedValue = coerceSelectValue(value);

    if (normalizedOption === normalizedValue) {
      return true;
    }

    if (normalizedOption === null || normalizedOption === undefined) {
      return false;
    }

    if (normalizedValue === null || normalizedValue === undefined) {
      return false;
    }

    return `${normalizedOption}` === `${normalizedValue}`;
  }
};

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(AppRoutingModule, SharedModule, BrowserModule, GuestModule),
    { provide: HTTP_INTERCEPTORS, useClass: BasicAuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: MAT_SELECT_CONFIG, useValue: matSelectConfig },
    [provideHttpClient(withInterceptorsFromDi())],
    provideAnimations()
  ]
}).catch((err) => console.error(err));
