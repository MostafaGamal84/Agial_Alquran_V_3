import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface Person {
  fullName?: string;
  mobile?: string;
  [key: string]: unknown;
}

interface ContactEntry {
  key: string;
  value: unknown;
  icon: string;
}

@Component({
  selector: 'app-teacher-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, NgxScrollbar, TranslateModule],
  templateUrl: './teacher-details.component.html',
  styleUrl: './teacher-details.component.scss'
})
export class TeacherDetailsComponent {
  teacher?: Record<string, unknown>;
  students: Person[] = [];
  contactEntries: ContactEntry[] = [];
  detailEntries: [string, unknown][] = [];
  private translate = inject(TranslateService);

  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  constructor() {
    const user = inject<Record<string, unknown>>(MAT_DIALOG_DATA);
    if (user) {
      this.teacher = user;
      const raw = user as Record<string, unknown>;
      this.students = Array.isArray(raw['students']) ? (raw['students'] as Person[]) : [];

      const contactKeys = ['email', 'mobile', 'secondMobile'];
      this.contactEntries = contactKeys
        .filter((k) => raw[k] !== undefined && raw[k] !== null)
        .map((k) => ({ key: k, value: raw[k], icon: this.getContactIcon(k) }));

      const exclude = ['fullName', 'students', 'managers', ...contactKeys];
      this.detailEntries = Object.entries(user).filter(
        ([key, value]) =>
          !exclude.includes(key) &&
          !key.toLowerCase().includes('teacher') &&
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
    const base = this.getLabelForKey(key);
    return this.translate.instant(base);
  }

  private getContactIcon(key: string): string {
    const icons: Record<string, string> = {
      email: 'ti ti-mail',
      mobile: 'ti ti-phone',
      secondMobile: 'ti ti-phone'
    };
    return icons[key] || 'ti ti-circle';
  }

  private getLabelForKey(key: string): string {
    const predefined: Record<string, string> = {
      branchId: 'Branch',
      gender: 'Gender',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      userName: 'User Name'
    };
    if (predefined[key]) {
      return predefined[key];
    }
    const spaced = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }
}
