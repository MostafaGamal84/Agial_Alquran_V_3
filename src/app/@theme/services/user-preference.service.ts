import { Injectable, inject } from '@angular/core';

import { AbleProConfig } from 'src/app/app-config';
import { AuthenticationService } from './authentication.service';

export interface UserPreferences {
  layout: string; // vertical, horizontal, compact
  themeMode: string; // light, dark
  themeColor: string; // theme class name
  contrast: boolean;
  caption: boolean;
  rtlLayout: boolean;
  boxLayout: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferenceService {
  private authService = inject(AuthenticationService);
  private readonly storagePrefix = 'user-preferences';
  private readonly defaultPreferences: UserPreferences = {
    layout: AbleProConfig.layout,
    themeMode: AbleProConfig.isDarkMode,
    themeColor: AbleProConfig.theme_color,
    contrast: AbleProConfig.theme_contrast,
    caption: AbleProConfig.menu_caption,
    rtlLayout: AbleProConfig.isRtlLayout,
    boxLayout: AbleProConfig.isBox_container
  };

  getDefaultPreferences(): UserPreferences {
    return { ...this.defaultPreferences };
  }

  loadPreferences(): UserPreferences {
    const preferences = this.readStoredPreferences();
    this.applyToConfig(preferences);
    return preferences;
  }

  updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
    const updated = { ...this.readStoredPreferences(), ...partial } as UserPreferences;
    this.writeStoredPreferences(updated);
    this.applyToConfig(updated);
    return updated;
  }

  clearPreferences(): UserPreferences {
    const defaults = this.getDefaultPreferences();
    this.removeStoredPreferences();
    this.applyToConfig(defaults);
    return defaults;
  }

  private getStorageKey(): string | null {
    const currentUser = this.authService.currentUserValue;
    const identifier = currentUser?.user?.id|| currentUser?.user?.email?.trim();
    if (identifier) {
      return `${this.storagePrefix}:${identifier}`;
    }
    return `${this.storagePrefix}:guest`;
  }

  private readStoredPreferences(): UserPreferences {
    const defaults = this.getDefaultPreferences();
    if (typeof localStorage === 'undefined') {
      return defaults;
    }

    const key = this.getStorageKey();
    if (!key) {
      return defaults;
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return defaults;
      }
      const parsed = JSON.parse(stored) as Partial<UserPreferences>;
      return { ...defaults, ...parsed } as UserPreferences;
    } catch (error) {
      console.warn('Failed to parse stored preferences', error);
      localStorage.removeItem(key);
      return defaults;
    }
  }

  private writeStoredPreferences(preferences: UserPreferences): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const key = this.getStorageKey();
    if (!key) {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to store user preferences', error);
    }
  }

  private removeStoredPreferences(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const key = this.getStorageKey();
    if (!key) {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear stored preferences', error);
    }
  }

  private applyToConfig(preferences: UserPreferences): void {
    AbleProConfig.layout = preferences.layout;
    AbleProConfig.isDarkMode = preferences.themeMode;
    AbleProConfig.theme_color = preferences.themeColor;
    AbleProConfig.theme_contrast = preferences.contrast;
    AbleProConfig.menu_caption = preferences.caption;
    AbleProConfig.isRtlLayout = preferences.rtlLayout;
    AbleProConfig.isBox_container = preferences.boxLayout;
  }
}
