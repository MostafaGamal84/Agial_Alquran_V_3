import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

interface ContactEntry {
  key: string;
  label: string;
  value: string;
  icon: string;
  href?: string;
}

interface DetailEntry {
  key: string;
  label: string;
  value: string;
}

type StudentVM = {
  id?: number;
  fullName?: string;
  email?: string;
  mobile?: string;
  secondMobile?: string;
  nationality?: string;
  nationalityId?: number;
  resident?: string;
  residentId?: number;
  governorate?: string;
  governorateId?: number;
  branchId?: number;
  managerId?: number;
  managerName?: string;
  teacherId?: number;
  teacherName?: string;
  circleId?: number;
  circleName?: string;
  gender?: string;
  userName?: string;
  identityNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  inactive?: boolean;
};

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
  detailEntries: DetailEntry[] = [];
  statEntries: Array<{ label: string; value: string | undefined }> = [];

  private readonly labelMap: Record<string, string> = {
    nationality: 'الجنسية',
    governorate: 'المحافظة',
    managerName: 'اسم المشرف',
    teacherName: 'اسم المعلم',
    circleName: 'اسم الحلقة',
    branchId: 'الفرع',
    gender: 'النوع',
    userName: 'اسم المستخدم',
    identityNumber: 'رقم الهوية',
    residentId: 'معرّف الإقامة',
    nationalityId: 'معرّف الجنسية',
    governorateId: 'معرّف المحافظة',
    createdAt: 'تاريخ الإنشاء',
    updatedAt: 'آخر تحديث',
    inactive: 'الحالة'
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

  getBranchLabel(id: unknown): string {
    const item = this.Branch.find(b => b.id === id);
    return item ? item.label : (id === null || id === undefined ? '—' : String(id));
  }

  private buildStatEntries(
    pairs: Array<{ key: keyof StudentVM; label: string }>,
    data: StudentVM
  ): Array<{ label: string; value: string | undefined }> {
    return pairs
      .map((p) => ({ label: p.label, value: (data[p.key] ?? '') as string | undefined }))
      .filter((p) => !!(p.value && p.value.toString().trim()));
  }

  private formatValue(key: string, val: unknown): string {
    if (key === 'inactive') return val ? 'غير نشط' : 'نشط';
    if (key === 'branchId') return this.getBranchLabel(val);
    return String(val);
  }

  private humanizeKey(key: string): string {
    const normalised = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
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
      mobile: 'ti ti-brand-whatsapp',
      secondMobile: 'ti ti-brand-whatsapp'
    };
    return icons[key] || 'ti ti-circle';
  }

  buildWhatsAppLink(phone: string): string | undefined {
    const digits = phone.replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : undefined;
  }
}
