import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly storageKey = 'screenReaderMode';
  private readonly screenReaderModeSubject = new BehaviorSubject<boolean>(false);

  readonly screenReaderMode$ = this.screenReaderModeSubject.asObservable();

  initialize(): void {
    const storedValue = localStorage.getItem(this.storageKey);
    const isEnabled = storedValue === 'true';
    this.screenReaderModeSubject.next(isEnabled);
    this.applyBodyClass(isEnabled);
  }

  enable(): void {
    this.updateState(true);
  }

  disable(): void {
    this.updateState(false);
  }

  toggle(): boolean {
    const nextState = !this.screenReaderModeSubject.value;
    this.updateState(nextState);
    return nextState;
  }

  isEnabled(): boolean {
    return this.screenReaderModeSubject.value;
  }

  private updateState(enabled: boolean): void {
    this.screenReaderModeSubject.next(enabled);
    localStorage.setItem(this.storageKey, String(enabled));
    this.applyBodyClass(enabled);
  }

  private applyBodyClass(enabled: boolean): void {
    document.body.classList.toggle('sr-mode', enabled);
  }
}
