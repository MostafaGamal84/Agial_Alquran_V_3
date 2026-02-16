import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityModeService {
  private readonly storageKey = 'blindModeEnabled';
  private isBlindModeEnabled = false;

  initialize(): void {
    const savedValue = localStorage.getItem(this.storageKey);
    this.isBlindModeEnabled = savedValue === 'true';
    this.applyBlindModeClass();
  }

  isEnabled(): boolean {
    return this.isBlindModeEnabled;
  }

  toggle(): boolean {
    this.isBlindModeEnabled = !this.isBlindModeEnabled;
    localStorage.setItem(this.storageKey, String(this.isBlindModeEnabled));
    this.applyBlindModeClass();
    return this.isBlindModeEnabled;
  }

  private applyBlindModeClass(): void {
    document.body.classList.toggle('blind-mode', this.isBlindModeEnabled);
  }
}
