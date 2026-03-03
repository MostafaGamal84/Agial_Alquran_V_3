import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ViewStateService {
  private readonly storagePrefix = 'view-state:';

  saveState<T>(key: string, state: T): void {
    try {
      sessionStorage.setItem(this.storagePrefix + key, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }

  getState<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(this.storagePrefix + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  clearState(key: string): void {
    try {
      sessionStorage.removeItem(this.storagePrefix + key);
    } catch {
      // ignore storage errors
    }
  }
}
