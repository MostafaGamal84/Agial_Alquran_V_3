import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityModeService {
  private readonly storageKey = 'blind-mode-enabled';
  private readonly className = 'blind-mode-enabled';
  private readonly document = inject(DOCUMENT);
  private readonly renderer: Renderer2;

  private isBlindModeEnabled = false;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.isBlindModeEnabled = this.readFromStorage();
    this.apply(this.isBlindModeEnabled);
  }

  get enabled(): boolean {
    return this.isBlindModeEnabled;
  }

  toggle(): void {
    this.setEnabled(!this.isBlindModeEnabled);
  }

  setEnabled(isEnabled: boolean): void {
    this.isBlindModeEnabled = isEnabled;
    this.apply(isEnabled);
    this.writeToStorage(isEnabled);
  }

  private apply(isEnabled: boolean): void {
    const body = this.document?.body;

    if (!body) {
      return;
    }

    if (isEnabled) {
      this.renderer.addClass(body, this.className);
      this.renderer.setAttribute(body, 'data-blind-mode', 'enabled');
    } else {
      this.renderer.removeClass(body, this.className);
      this.renderer.removeAttribute(body, 'data-blind-mode');
    }
  }

  private readFromStorage(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(this.storageKey) === 'true';
    } catch {
      return false;
    }
  }

  private writeToStorage(isEnabled: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(this.storageKey, String(isEnabled));
    } catch {
      // Ignore write errors in restricted environments.
    }
  }
}
