import { Directive, OnInit } from '@angular/core';
import { MatSelect } from '@angular/material/select';

@Directive({
  selector: 'mat-select:not([compareWith])',
  standalone: true
})
export class NormalizeSelectCompareDirective implements OnInit {
  constructor(private matSelect: MatSelect) {}

  ngOnInit(): void {
    this.matSelect.compareWith = (option: unknown, value: unknown) => {
      if (option === value) {
        return true;
      }

      if (option == null || value == null) {
        return option === value;
      }

      return this.normalizeComparable(option) === this.normalizeComparable(value);
    };
  }

  private normalizeComparable(value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      const candidate = (value as { id?: unknown; value?: unknown }).id ?? (value as { value?: unknown }).value;
      return this.normalizePrimitive(candidate ?? value);
    }

    return this.normalizePrimitive(value);
  }

  private normalizePrimitive(value: unknown): unknown {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
}
