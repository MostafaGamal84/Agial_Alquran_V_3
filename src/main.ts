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
import { A11yModule } from '@angular/cdk/a11y';
import { GuestModule } from './app/demo/layout/front';
import { AppComponent } from './app/app.component';
import { MAT_SELECT_CONFIG, MatSelectConfig } from '@angular/material/select';

// 👇 الجديد: إعدادات PrimeNG + الثيم
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura'; // ممكن تغيره لاحقاً لأي ثيم آخر من @primeuix/themes

if (environment.production) {
  enableProdMode();
}

// إعدادات mat-select العامة (مفيش compareWith هنا زي ما انت كاتب)
const matSelectConfig: MatSelectConfig = {
  // تقدر تضيف إعدادات لو محتاج مثلاً: disableOptionCentering: true
};

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(AppRoutingModule, SharedModule, BrowserModule, GuestModule, A11yModule),

    // ✅ Interceptors
    { provide: HTTP_INTERCEPTORS, useClass: BasicAuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },

    // ✅ إعدادات mat-select العامة
    { provide: MAT_SELECT_CONFIG, useValue: matSelectConfig },

    // ✅ HttpClient
    provideHttpClient(withInterceptorsFromDi()),

    // ✅ Animations (مطلوبة لـ PrimeNG و Angular Material)
    provideAnimations(),

    // ✅ PrimeNG Config + Theme
    providePrimeNG({
      theme: {
        preset: Aura
        // تقدر تضيف options هنا لو حابب
        // options: {
        //   darkModeSelector: '.app-dark'
        // }
      }
    })
  ]
}).catch((err) => console.error(err));
