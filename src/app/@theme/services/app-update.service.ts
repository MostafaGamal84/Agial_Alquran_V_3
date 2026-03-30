import { Injectable, signal } from '@angular/core';
import { environment } from 'src/environments/environment';

interface AppVersionPayload {
  version?: string;
  buildId?: string;
  buildTime?: string;
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly checkIntervalMs = 60_000;
  private readonly currentBuildId = environment.buildId;
  private readonly versionUrl = new URL('assets/app-version.json', document.baseURI).toString();
  private intervalId: number | null = null;
  private started = false;
  private isChecking = false;

  readonly isReloading = signal(false);
  readonly reloadMessage = signal('تم رفع نسخة جديدة. جاري تحديث التطبيق الآن...');

  private readonly focusHandler = () => {
    void this.checkForUpdate();
  };

  private readonly visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      void this.checkForUpdate();
    }
  };

  private readonly onlineHandler = () => {
    void this.checkForUpdate();
  };

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return;
    }

    this.started = true;
    this.cleanupVersionQueryParam();
    this.registerEventHandlers();
    void this.checkForUpdate();
    this.intervalId = window.setInterval(() => {
      void this.checkForUpdate();
    }, this.checkIntervalMs);
  }

  private registerEventHandlers(): void {
    window.addEventListener('focus', this.focusHandler);
    window.addEventListener('online', this.onlineHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private cleanupVersionQueryParam(): void {
    const currentUrl = new URL(window.location.href);
    const currentQueryVersion = currentUrl.searchParams.get('appv');

    if (!currentQueryVersion || currentQueryVersion !== this.currentBuildId) {
      return;
    }

    currentUrl.searchParams.delete('appv');
    window.history.replaceState(window.history.state, document.title, currentUrl.toString());
  }

  private async checkForUpdate(): Promise<void> {
    if (this.isChecking || this.isReloading()) {
      return;
    }

    this.isChecking = true;

    try {
      const response = await fetch(this.buildVersionRequestUrl(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });

      if (!response.ok) {
        return;
      }

      const remoteVersion = (await response.json()) as AppVersionPayload;
      if (!remoteVersion.buildId || remoteVersion.buildId === this.currentBuildId) {
        return;
      }

      await this.forceReload(remoteVersion.buildId);
    } catch {
      // Ignore update-check failures and keep the current session running.
    } finally {
      this.isChecking = false;
    }
  }

  private buildVersionRequestUrl(): string {
    const requestUrl = new URL(this.versionUrl);
    requestUrl.searchParams.set('t', Date.now().toString());
    return requestUrl.toString();
  }

  private async forceReload(nextBuildId: string): Promise<void> {
    if (this.isReloading()) {
      return;
    }

    this.isReloading.set(true);
    await this.clearClientCaches();

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('appv', nextBuildId);

    window.setTimeout(() => {
      window.location.replace(nextUrl.toString());
    }, 900);
  }

  private async clearClientCaches(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {
      // Ignore cleanup failures and continue with the forced reload.
    }

    try {
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
      }
    } catch {
      // Ignore cache cleanup failures and continue with the forced reload.
    }
  }
}
