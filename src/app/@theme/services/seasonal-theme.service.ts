import { Injectable } from '@angular/core';

import { AbleProConfig } from 'src/app/app-config';

@Injectable({
  providedIn: 'root'
})
export class SeasonalThemeService {
  private readonly ramadanClassName = 'ramadan-theme';

  applySeasonalTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const isRamadanThemeActive = this.isDateWithinRange(
      AbleProConfig.ramadanTheme.startDate,
      AbleProConfig.ramadanTheme.endDate
    );

    document.body.classList.toggle(this.ramadanClassName, AbleProConfig.ramadanTheme.enabled && isRamadanThemeActive);
  }

  private isDateWithinRange(startDate: string, endDate: string): boolean {
    const today = this.normalizeDate(new Date());
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);

    if (!start || !end) {
      return false;
    }

    return today >= start && today <= end;
  }

  private parseDate(value: string): Date | null {
    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }
    return this.normalizeDate(parsedDate);
  }

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }
}
