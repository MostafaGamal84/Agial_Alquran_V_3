import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';

interface Person {
  fullName?: string;
  mobile?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-manager-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, NgxScrollbar],
  templateUrl: './manager-details.component.html',
  styleUrl: './manager-details.component.scss'
})
export class ManagerDetailsComponent {
  manager?: Record<string, unknown>;
  teachers: Person[] = [];
  students: Person[] = [];
  managerCircles: unknown[] = [];
  primitiveEntries: [string, unknown][] = [];

  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  constructor() {
    const user = inject<Record<string, unknown>>(MAT_DIALOG_DATA);
    if (user) {
      this.manager = user;
      const raw = user as Record<string, unknown>;
      this.teachers = Array.isArray(raw['teachers']) ? (raw['teachers'] as Person[]) : [];
      this.students = Array.isArray(raw['students']) ? (raw['students'] as Person[]) : [];
      this.managerCircles = Array.isArray(raw['managerCircles'])
        ? (raw['managerCircles'] as unknown[])
        : [];
      const exclude = ['fullName', 'teachers', 'students', 'managerCircles', 'branchId'];
      this.primitiveEntries = Object.entries(user).filter(
        ([key, value]) =>
          !exclude.includes(key) &&
          !Array.isArray(value) &&
          (typeof value !== 'object' || value === null)
      );
    }
  }

  getBranchLabel(id: number | undefined): string {
    return this.Branch.find((b) => b.id === id)?.label || String(id ?? '');
  }

  formatValue(key: string, value: unknown): unknown {
    if (key === 'branchId') {
      return this.getBranchLabel(typeof value === 'number' ? value : undefined);
    }
    return value;
  }
}

