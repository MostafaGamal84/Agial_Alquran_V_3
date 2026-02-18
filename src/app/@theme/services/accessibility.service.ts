import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly storageKey = 'screenReaderMode';
  private readonly bodyClass = 'sr-mode';
  private readonly document = inject(DOCUMENT);
  private readonly screenReaderModeSubject = new BehaviorSubject<boolean>(false);

  readonly screenReaderMode$ = this.screenReaderModeSubject.asObservable();

  constructor() {
    this.initialize();
  }

  initialize(): void {
    const value = this.readFromStorage();
    this.screenReaderModeSubject.next(value);
    this.applyBodyClass(value);
  }

  enable(): void {
    this.setMode(true);
  }

  disable(): void {
    this.setMode(false);
  }

  toggle(): boolean {
    const nextValue = !this.screenReaderModeSubject.value;
    this.setMode(nextValue);
    return nextValue;
  }

  isEnabled(): boolean {
    return this.screenReaderModeSubject.value;
  }

  private setMode(value: boolean): void {
    this.screenReaderModeSubject.next(value);
    this.writeToStorage(value);
    this.applyBodyClass(value);
  }

  private applyBodyClass(isEnabled: boolean): void {
    const body = this.document?.body;
    if (!body) {
      return;
    }

    body.classList.toggle(this.bodyClass, isEnabled);
  }

  private readFromStorage(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.storageKey) === 'true';
  }

  private writeToStorage(value: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, String(value));
  }
}
