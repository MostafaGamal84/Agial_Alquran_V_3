import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const ACCESSIBILITY_STORAGE_KEY = 'accessibilityModeEnabled';
const ACCESSIBILITY_BODY_CLASS = 'accessibility-mode';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private readonly document = inject(DOCUMENT);
  private readonly accessibilityModeSubject = new BehaviorSubject<boolean>(false);

  readonly accessibilityMode$ = this.accessibilityModeSubject.asObservable();

  initializeMode(): void {
    const persistedValue = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    this.setMode(persistedValue === 'true', false);
  }

  setMode(enabled: boolean, persist = true): void {
    this.accessibilityModeSubject.next(enabled);
    this.document.body.classList.toggle(ACCESSIBILITY_BODY_CLASS, enabled);

    if (persist) {
      localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, String(enabled));
    }
  }

  toggleMode(): void {
    this.setMode(!this.accessibilityModeSubject.value);
  }

  isAccessibilityModeEnabled(): boolean {
    return this.accessibilityModeSubject.value;
  }
}
