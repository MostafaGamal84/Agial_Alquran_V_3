import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { getUserManagers } from 'src/app/demo/shared/utils/user-managers';

interface Person {
  fullName?: string;
  mobile?: string;
}

interface Circle {
  circle?: string;
  circleId?: number;
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

type ManagerVM = {
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
  teacherId?: number;
  teacherName?: string;
  managerId?: number;
  managerName?: string;
  managerIds?: number[];
  managerNames?: string[];
  circleId?: number;
  circleName?: string;
  gender?: string;
  userName?: string;
  identityNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  inactive?: boolean;

  managers?: unknown[];
  teachers?: Person[];
  students?: Person[];
  managerCircles?: Circle[];
};

@Component({
  selector: 'app-manager-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatExpansionModule,
    NgxScrollbar
  ],
  templateUrl: './manager-details.component.html',
  styleUrl: './manager-details.component.scss'
})
export class ManagerDetailsComponent {
  private readonly longPressDuration = 500;
  private longPressTimer?: ReturnType<typeof setTimeout>;
  private longPressTriggered = false;
  loading = true;
  vm?: ManagerVM;

  teachers: Person[] = [];
  students: Person[] = [];
  managerCircles: Circle[] = [];

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
    teacherId: 'معرّف المعلم',
    teacherName: 'اسم المعلم',
    managerId: 'معرّف المشرف',
    managerName: 'اسم المشرف',
    managerNames: 'المشرفون',
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
    const raw = inject<{ data?: ManagerVM } | ManagerVM | null>(MAT_DIALOG_DATA);

    // ✅ لو الداتا جاية بالشكل: {isSuccess, errors, data}
    const data = raw && typeof raw === 'object' && 'data' in raw ? raw.data : (raw as ManagerVM | null);
    this.setData(data);
  }

  setData(data?: ManagerVM | null): void {
    this.vm = undefined;
    this.loading = !data;

    this.teachers = [];
    this.students = [];
    this.managerCircles = [];
    this.contactEntries = [];
    this.detailEntries = [];
    this.statEntries = [];

    if (!data) return;

    this.vm = data;
    this.loading = false;

    // قوائم العلاقات (حسب الريسبونس عندك)
    this.teachers = Array.isArray(data.teachers) ? data.teachers : [];
    this.students = Array.isArray(data.students) ? data.students : [];
    this.managerCircles = Array.isArray(data.managerCircles) ? data.managerCircles : [];

    // بيانات موجزة في الأعلى
    const managerNames = getUserManagers(data);
    this.statEntries = [
      ...(managerNames.length
        ? [{ label: 'المشرف', value: managerNames.join('، ') }]
        : []),
      ...this.buildStatEntries([
        { key: 'teacherName', label: 'المعلم' },
        { key: 'circleName', label: 'الحلقة' }
      ], data)
    ];

    // ===== Contacts =====
    const contactKeys: Array<keyof ManagerVM> = ['email', 'mobile', 'secondMobile'];

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

    // ===== Details (من غير الـ contacts + من غير القوائم) =====
    const exclude = new Set<string>([
      // ما نعرضهمش هنا لأنهم ظاهرين فوق أو قوائم
      'teachers', 'students', 'managers', 'managerCircles',
      'email', 'mobile', 'secondMobile',
      'fullName', 'managerName', 'managerNames', 'teacherName', 'circleName', 'nationalityId',
      'residentId',
      'governorateId',
      'teacherId',
      'managerId',  'inactive',     'id', 'branchId',  'identityNumber',

    ]);

    const preferredOrder = [
      'nationality',
      'resident',
      'governorate',
      'gender',
      'userName',
      'teacherName',
      'managerName',
      'managerNames',
      'circleName',
     
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

    // ترتيب لطيف
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
    pairs: Array<{ key: keyof ManagerVM; label: string }>,
    data: ManagerVM
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
    // fallback لو ظهر حقل جديد
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


  isCompactContact(key: string): boolean {
    return key === 'email' || key === 'mobile' || key === 'secondMobile';
  }

  onContactPressStart(value: string, event: Event): void {
    this.longPressTriggered = false;
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      this.longPressTriggered = true;
      void this.copyToClipboard(value);
      event.preventDefault();
    }, this.longPressDuration);
  }

  onContactPressEnd(): void {
    this.clearLongPressTimer();
  }

  onContactClick(event: Event): void {
    if (!this.longPressTriggered) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.longPressTriggered = false;
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

  private async copyToClipboard(value: string): Promise<void> {
    if (!value) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  buildWhatsAppLink(phone: string): string | undefined {
    const digits = phone.replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : undefined;
  }
}
