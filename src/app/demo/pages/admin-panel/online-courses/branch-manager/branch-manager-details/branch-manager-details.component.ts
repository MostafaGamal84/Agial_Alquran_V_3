import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

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
  selector: 'app-branch-manager-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, NgxScrollbar, TranslateModule],
  templateUrl: './branch-manager-details.component.html',
  styleUrl: './branch-manager-details.component.scss'
})
export class BranchManagerDetailsComponent {
  manager?: Record<string, unknown>;
  teachers: Person[] = [];
  students: Person[] = [];
  managerCircles: Circle[] = [];
  contactEntries: ContactEntry[] = [];
  detailEntries: [string, unknown][] = [];
  private readonly labelTranslationMap: Record<string, string> = {
    branchId: 'Branch',
    gender: 'Gender',
    userName: 'Username',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    managerName: 'Manager Name',
    identityNumber: 'Identity Number',
    residentId: 'Resident ID',
    resident: 'Resident',
    nationality: 'Nationality',
    nationalityId: 'Nationality',
    governorate: 'Governorate',
    governorateId: 'Governorate'
  };

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

      const exclude = [
        'fullName',
        'teachers',
        'students',
        'managerCircles',
        'managers',
        'teacherName',
        'managerName',
        'circleName',
        'inactive',
        ...contactKeys
      ];

      this.detailEntries = Object.entries(user).filter(
        ([key, value]) =>
          !exclude.includes(key) &&
          !/id$/i.test(key) &&
          key.toLowerCase() !== 'id' &&
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

  formatLabel(key: string): string {
    return this.labelTranslationMap[key] ?? this.humanizeKey(key);
  }

  private humanizeKey(key: string): string {
    const spaced = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (!spaced) {
      return key;
    }
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
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
