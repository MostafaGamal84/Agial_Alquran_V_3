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

interface Circle {
  circleId?: number;
  circle?: string;
  [key: string]: unknown;
}

interface ContactEntry {
  key: string;
  value: unknown;
  icon: string;
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
  managerCircles: Circle[] = [];
  contactEntries: ContactEntry[] = [];
  detailEntries: [string, unknown][] = [];


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
        ? (raw['managerCircles'] as Circle[])
        : [];

      const contactKeys = ['email', 'mobile', 'secondMobile'];
      this.contactEntries = contactKeys
        .filter((k) => raw[k] !== undefined && raw[k] !== null)
        .map((k) => ({ key: k, value: raw[k], icon: this.getContactIcon(k) }));

      const exclude = ['fullName', 'teachers', 'students', 'managerCircles', ...contactKeys];
      this.detailEntries = Object.entries(user).filter(

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

  private getContactIcon(key: string): string {
    const icons: Record<string, string> = {
      email: 'ti ti-mail',
      mobile: 'ti ti-phone',
      secondMobile: 'ti ti-phone'
    };
    return icons[key] || 'ti ti-circle';
  }
}


