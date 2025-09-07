import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
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
  imports: [CommonModule, MatDialogModule, MatButtonModule, NgxScrollbar],
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.scss'
})
export class StudentDetailsComponent {
  student?: Record<string, unknown>;
  contactEntries: ContactEntry[] = [];
  detailEntries: [string, unknown][] = [];

  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  constructor() {
    const user = inject<Record<string, unknown>>(MAT_DIALOG_DATA);
    if (user) {
      this.student = user;
      const raw = user as Record<string, unknown>;

      const contactKeys = ['email', 'mobile', 'secondMobile'];
      this.contactEntries = contactKeys
        .filter((k) => raw[k] !== undefined && raw[k] !== null)
        .map((k) => ({ key: k, value: raw[k], icon: this.getContactIcon(k) }));

      const exclude = ['fullName', 'students', 'teachers', 'managers', ...contactKeys];
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

  private getContactIcon(key: string): string {
    const icons: Record<string, string> = {
      email: 'ti ti-mail',
      mobile: 'ti ti-phone',
      secondMobile: 'ti ti-phone'
    };
    return icons[key] || 'ti ti-circle';
  }
}
