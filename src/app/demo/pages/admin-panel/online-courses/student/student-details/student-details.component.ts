import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
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
    NgxScrollbar
  ],
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.scss'
})
export class StudentDetailsComponent {
  loading = true;
  vm?: StudentVM;

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
    const raw = inject<{ data?: StudentVM } | StudentVM | null>(MAT_DIALOG_DATA);
    const data = raw && typeof raw === 'object' && 'data' in raw ? raw.data : (raw as StudentVM | null);
    this.setData(data);
  }

  setData(data?: StudentVM | null): void {
    this.vm = undefined;
    this.loading = !data;

    this.contactEntries = [];
    this.detailEntries = [];
    this.statEntries = [];

    if (!data) return;

    this.vm = data;
    this.loading = false;

    this.statEntries = this.buildStatEntries([
      { key: 'managerName', label: 'المشرف' },
      { key: 'teacherName', label: 'المعلم' },
      { key: 'circleName', label: 'الحلقة' }
    ], data);

    const contactKeys: Array<keyof StudentVM> = ['email', 'mobile', 'secondMobile'];

    this.contactEntries = contactKeys
      .map((k) => {
        const value = (data[k] ?? '').toString().trim();
        if (!value) return null;

        const icon = this.getContactIcon(k as string);
        const label = this.labelMap[k as string] ?? this.humanizeKey(k as string);

        const href =
          k === 'email' ? `mailto:${value}` :
          (k === 'mobile' || k === 'secondMobile') ? this.buildWhatsAppLink(value) :
          undefined;

        return { key: k as string, label, value, icon, href } as ContactEntry;
      })
      .filter(Boolean) as ContactEntry[];

    const exclude = new Set<string>([
      'email', 'mobile', 'secondMobile',
      'fullName', 'managerName', 'teacherName', 'circleName',  'residentId',
      'governorateId',
      'teacherId',
      'managerId',   'nationalityId',
      'residentId',
      'governorateId',
      'managerId',
      'teacherId',
      'circleId',
      'createdAt',
      'updatedAt',
      'id','branchId','inactive',   'identityNumber',
    ]);

    const preferredOrder = [
      'nationality',
      'resident',
      'governorate',
      'gender',
      'userName',
      'identityNumber',
      'managerName',
      'teacherName',
      'circleName',
      'nationalityId',
      'residentId',
      'governorateId',
      'managerId',
      'teacherId',
      'circleId',
      'createdAt',
      'updatedAt',
      'id'
    ];

    const entries = Object.entries(data as Record<string, unknown>)
      .filter(([key]) => !exclude.has(key))
      .filter(([, val]) => val !== null && val !== undefined)
      .filter(([, val]) => typeof val !== 'object' && !Array.isArray(val))
      .map(([key, val]) => ({
        key,
        label: this.labelMap[key] ?? this.humanizeKey(key),
        value: this.formatValue(key, val)
      }));

    this.detailEntries = entries.sort((a, b) => {
      const ai = preferredOrder.indexOf(a.key);
      const bi = preferredOrder.indexOf(b.key);
      const ax = ai === -1 ? 999 : ai;
      const bx = bi === -1 ? 999 : bi;
      return ax - bx;
    });
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
