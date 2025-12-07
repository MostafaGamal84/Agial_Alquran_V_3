import { Directive, OnInit } from '@angular/core';
import { MatSelect } from '@angular/material/select';

import { normalizeSelectCompare } from '../utils/select-compare';

@Directive({
  selector: 'mat-select:not([compareWith])',
  standalone: true
})
export class NormalizeSelectCompareDirective implements OnInit {
  constructor(private matSelect: MatSelect) {}

  ngOnInit(): void {
    this.matSelect.compareWith = (option: unknown, value: unknown) => {
      return normalizeSelectCompare(option, value);
    };
  }
}
