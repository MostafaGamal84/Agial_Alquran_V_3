import { enableProdMode, importProvidersFrom } from '@angular/core';

import { environment } from './environments/environment';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { BasicAuthInterceptor } from 'src/app/@theme/helpers/basic-auth.interceptor';
import { ErrorInterceptor } from 'src/app/@theme/helpers/error.interceptor';
import { AppRoutingModule } from './app/app-routing.module';
import { SharedModule } from './app/demo/shared/shared.module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { GuestModule } from './app/demo/layout/front';
import { AppComponent } from './app/app.component';
import { MAT_SELECT_CONFIG, MatSelectConfig } from '@angular/material/select';

if (environment.production) {
  enableProdMode();
}

// مافيش compareWith هنا خالص
const matSelectConfig: MatSelectConfig = {
  // ممكن تحط أي إعداد تاني لو حابب
};

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(AppRoutingModule, SharedModule, BrowserModule, GuestModule),
    { provide: HTTP_INTERCEPTORS, useClass: BasicAuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: MAT_SELECT_CONFIG, useValue: matSelectConfig },
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations()
  ]
}).catch((err) => console.error(err));
