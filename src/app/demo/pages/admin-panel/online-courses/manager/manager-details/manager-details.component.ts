import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { TranslateModule } from '@ngx-translate/core';

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
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatExpansionModule,
    NgxScrollbar,
    TranslateModule
  ],
  templateUrl: './manager-details.component.html',
  styleUrl: './manager-details.component.scss'
})
export class ManagerDetailsComponent {
  loading = true;
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
    circleName: 'Circle Name',
    identityNumber: 'Identity Number',
    residentId: 'Resident ID',
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
    const raw = inject<Record<string, unknown> | { data?: Record<string, unknown> } | null>(MAT_DIALOG_DATA);
    const data = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
    this.setData(data ?? undefined);
  }

  setData(data?: Record<string, unknown> | null): void {
    this.manager = undefined;
    this.loading = !data;
    this.teachers = [];
    this.students = [];
    this.managerCircles = [];
    this.contactEntries = [];
    this.detailEntries = [];

    if (!data) {
      return;
    }

    this.manager = data;
    this.loading = false;
    const raw = data as Record<string, unknown>;
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
      ...contactKeys
    ];

    this.detailEntries = Object.entries(data).filter(
      ([key, value]) =>
        !exclude.includes(key) &&
        !/id$/i.test(key) &&
        key.toLowerCase() !== 'id' &&
        !Array.isArray(value) &&
        (typeof value !== 'object' || value === null)
    );
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

