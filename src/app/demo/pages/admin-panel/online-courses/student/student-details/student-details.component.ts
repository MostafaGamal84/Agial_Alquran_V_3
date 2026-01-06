import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

interface ContactEntry {
  key: string;
  value: unknown;
  icon: string;
}

@Component({
  selector: 'app-student-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    NgxScrollbar,
    TranslateModule
  ],
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.scss'
})
export class StudentDetailsComponent {
  loading = true;
  student?: Record<string, unknown>;
  contactEntries: ContactEntry[] = [];
  detailEntries: [string, unknown][] = [];

  private readonly labelMap: Record<string, string> = {
    nationality: 'Nationality',
    governorate: 'Governorate',
    managerName: 'Manager Name',
    circleName: 'Circle Name',
    branchId: 'Branch',
    gender: 'Gender',
    userName: 'Username',
    identityNumber: 'Identity Number',
    residentId: 'Resident ID',
    createdAt: 'Created At',
    updatedAt: 'Updated At'
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
    this.student = undefined;
    this.loading = !data;
    this.contactEntries = [];
    this.detailEntries = [];

    if (!data) {
      return;
    }

    this.student = data;
    this.loading = false;
    const raw = data as Record<string, unknown>;

    const contactKeys = ['email', 'mobile', 'secondMobile'];
    this.contactEntries = contactKeys
      .filter((k) => raw[k] !== undefined && raw[k] !== null)
      .map((k) => ({ key: k, value: raw[k], icon: this.getContactIcon(k) }));

    const exclude = ['fullName', 'students', 'teachers', 'managers', ...contactKeys];
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

  getLabel(key: string): string {
    return this.labelMap[key] ?? this.humanizeKey(key);
  }

  private humanizeKey(key: string): string {
    const normalised = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalised) {
      return key;
    }

    return normalised.charAt(0).toUpperCase() + normalised.slice(1);
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
