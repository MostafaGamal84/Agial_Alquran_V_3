import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

interface Person {
  fullName?: string;
  mobile?: string;
}

interface DetailEntry {
  key: string;
  label: string;
  value: string;
}

interface ContactEntry {
  key: string;
  label: string;
  value: string;
  icon: string;
  href?: string;
}

type TeacherVM = {
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
  circleId?: number;
  circleName?: string;
  gender?: string;
  userName?: string;
  identityNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  inactive?: boolean;

  managers?: unknown[];
  students?: Person[];
};

@Component({
  selector: 'app-teacher-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatExpansionModule,
    NgxScrollbar
  ],
  templateUrl: './teacher-details.component.html',
  styleUrl: './teacher-details.component.scss'
})
export class TeacherDetailsComponent {
  loading = true;
  vm?: TeacherVM;

  students: Person[] = [];

  contactEntries: ContactEntry[] = [];
  detailEntries: DetailEntry[] = [];
  statEntries: Array<{ label: string; value: string | undefined }> = [];

  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  /** خريطة أسماء الحقول -> عربي */
  private readonly labelMap: Record<string, string> = {
    id: 'المعرّف',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    mobile: 'رقم الجوال',
    secondMobile: 'جوال إضافي',
    nationality: 'الجنسية',
    nationalityId: 'معرّف الجنسية',
    resident: 'الإقامة',
    residentId: 'معرّف الإقامة',
    governorate: 'المحافظة',
    governorateId: 'معرّف المحافظة',
    branchId: 'الفرع',
    managerId: 'معرّف المشرف',
    managerName: 'اسم المشرف',
    circleId: 'معرّف الحلقة',
    circleName: 'اسم الحلقة',
    gender: 'النوع',
    userName: 'اسم المستخدم',
    identityNumber: 'رقم الهوية',
    createdAt: 'تاريخ الإنشاء',
    updatedAt: 'آخر تحديث',
    inactive: 'الحالة'
  };

  constructor() {
    const raw = inject<{ data?: TeacherVM } | TeacherVM | null>(MAT_DIALOG_DATA);

    const data = raw && typeof raw === 'object' && 'data' in raw ? raw.data : (raw as TeacherVM | null);
    this.setData(data);
  }

  setData(data?: TeacherVM | null): void {
    this.vm = undefined;
    this.loading = !data;

    this.students = [];
    this.contactEntries = [];
    this.detailEntries = [];
    this.statEntries = [];

    if (!data) return;

    this.vm = data;
    this.loading = false;

    this.students = Array.isArray(data.students) ? data.students : [];

    this.statEntries = this.buildStatEntries([
      { key: 'managerName', label: 'المشرف' },
      { key: 'circleName', label: 'الحلقة' }
    ], data);

    const contactKeys: Array<keyof TeacherVM> = ['email', 'mobile', 'secondMobile'];

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
      'students', 'managers',
      'email', 'mobile', 'secondMobile',
      'fullName', 'managerName', 'circleName',  'residentId',
      'governorateId',
      'teacherId',
      'managerId',      'identityNumber',
    ]);

    const preferredOrder = [
      'nationality',
      'resident',
      'governorate',
      'gender',
      'userName',
      'identityNumber',
      'managerName',
      'circleName',
      'nationalityId',
      'residentId',
      'governorateId',
      'managerId',
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
    pairs: Array<{ key: keyof TeacherVM; label: string }>,
    data: TeacherVM
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
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim();
  }

  private getContactIcon(key: string): string {
    return {
      email: 'ti ti-mail',
      mobile: 'ti ti-brand-whatsapp',
      secondMobile: 'ti ti-brand-whatsapp'
    }[key] ?? 'ti ti-circle';
  }

  buildWhatsAppLink(phone: string): string | undefined {
    const digits = phone.replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : undefined;
  }
}
