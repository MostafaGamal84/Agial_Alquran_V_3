import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';

@Component({
  selector: 'app-manager-details',
  standalone: true,
  imports: [CommonModule, SharedModule, NgxScrollbar],
  templateUrl: './manager-details.component.html',
  styleUrls: ['./manager-details.component.scss']
})
export class ManagerDetailsComponent {
  dialogRef = inject<MatDialogRef<ManagerDetailsComponent>>(MatDialogRef);
  private data = inject<Record<string, unknown>>(MAT_DIALOG_DATA);

  manager?: Record<string, unknown>;
  teachers: unknown[] = [];
  students: unknown[] = [];
  managerCircles: unknown[] = [];
  primitiveEntries: [string, unknown][] = [];

  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  constructor() {
    const user = this.data;
    if (user) {
      this.manager = user;
      const raw = user as Record<string, unknown>;
      this.teachers = Array.isArray(raw['teachers']) ? (raw['teachers'] as unknown[]) : [];
      this.students = Array.isArray(raw['students']) ? (raw['students'] as unknown[]) : [];
      this.managerCircles = Array.isArray(raw['managerCircles']) ? (raw['managerCircles'] as unknown[]) : [];
      const exclude = ['fullName', 'teachers', 'students', 'managerCircles', 'branchId'];
      this.primitiveEntries = Object.entries(user).filter(
        ([key, value]) =>
          !exclude.includes(key) &&
          !Array.isArray(value) &&
          (typeof value !== 'object' || value === null)
      );
    }
  }

  getEntries(person: unknown): [string, unknown][] {
    if (typeof person === 'object' && person !== null) {
      const exclude = ['fullName', 'teachers', 'students', 'managers', 'managerCircles'];
      return Object.entries(person).filter(
        ([key, value]) =>
          !exclude.includes(key) &&
          (typeof value !== 'object' || value === null)
      );
    }
    return [];
  }

  getBranchLabel(id: number | undefined): string {
    return this.Branch.find((b) => b.id === id)?.label || String(id ?? '');
  }

  formatPerson(person: unknown): string {
    if (typeof person === 'object' && person !== null) {
      const obj = person as Record<string, unknown>;
      const name = obj['fullName'] ?? obj['name'];
      if (name) {
        return String(name);
      }
    }
    return String(person);
  }

  formatValue(key: string, value: unknown): unknown {
    if (key === 'branchId') {
      return this.getBranchLabel(typeof value === 'number' ? value : undefined);
    }
    return value;
  }
}

