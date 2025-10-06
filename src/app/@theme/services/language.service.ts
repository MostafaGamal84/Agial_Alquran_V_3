import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { AbleProConfig } from 'src/app/app-config';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'able-pro-language';
  private readonly rtlLanguages = new Set(['ar', 'fa', 'he', 'ur']);
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      this.applyDocumentDirection(this.currentLanguage);
      return;
    }

    this.initialized = true;

    this.translate.setDefaultLang(AbleProConfig.i18n);

    const stored = this.readStoredLanguage();
    const initial = stored || this.translate.currentLang || AbleProConfig.i18n;

    this.translate.use(initial);
    this.applyDocumentDirection(initial);
    this.writeStoredLanguage(initial);

    this.translate.onLangChange.subscribe(({ lang }) => {
      this.applyDocumentDirection(lang);
      this.writeStoredLanguage(lang);
    });
  }

  get currentLanguage(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || AbleProConfig.i18n;
  }

  changeLanguage(language: string): void {
    this.translate.use(language);
  }

  private applyDocumentDirection(language: string): void {
    const isRtl = this.rtlLanguages.has(language);
    const direction = isRtl ? 'rtl' : 'ltr';

    const htmlElement = this.document?.documentElement;
    const body = this.document?.body;

    if (htmlElement) {
      htmlElement.setAttribute('dir', direction);
      htmlElement.setAttribute('lang', language);
    }

    if (body) {
      body.setAttribute('dir', direction);
      body.classList.toggle('able-pro-rtl', isRtl);
    }

    AbleProConfig.isRtlLayout = isRtl;
  }

  private readStoredLanguage(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const value = localStorage.getItem(this.storageKey);
      return value ? value : null;
    } catch (error) {
      console.warn('Unable to read stored language preference', error);
      return null;
    }
  }

  private writeStoredLanguage(language: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, language);
    } catch (error) {
      console.warn('Unable to store language preference', error);
    }
  }
}

