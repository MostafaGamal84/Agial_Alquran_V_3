import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

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
  circleId?: number;
  circleName?: string;
  inactive?: boolean;

  managers?: any[];
  teachers?: Person[];
  students?: Person[];
  managerCircles?: Circle[];
};

@Component({
  selector: 'app-branch-manager-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatExpansionModule,
    NgxScrollbar
  ],
  templateUrl: './branch-manager-details.component.html',
  styleUrl: './branch-manager-details.component.scss'
})
export class BranchManagerDetailsComponent {
  vm?: ManagerVM;

  teachers: Person[] = [];
  students: Person[] = [];
  managerCircles: Circle[] = [];

  contactEntries: ContactEntry[] = [];
  detailEntries: DetailEntry[] = [];

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
    circleId: 'معرّف الحلقة',
    circleName: 'اسم الحلقة',
    inactive: 'الحالة'
  };

  constructor() {
    const raw = inject<any>(MAT_DIALOG_DATA);

    // ✅ لو الداتا جاية بالشكل: {isSuccess, errors, data}
    const data: ManagerVM = raw?.data ? raw.data : raw;

    if (!data) return;

    this.vm = data;

    // قوائم العلاقات (حسب الريسبونس عندك)
    this.teachers = Array.isArray(data.teachers) ? data.teachers : [];
    this.students = Array.isArray(data.students) ? data.students : [];
    this.managerCircles = Array.isArray(data.managerCircles) ? data.managerCircles : [];

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
          (k === 'mobile' || k === 'secondMobile') ? `tel:${value}` :
          undefined;

        return { key: k as string, label, value, icon, href } as ContactEntry;
      })
      .filter(Boolean) as ContactEntry[];

    // ===== Details (من غير الـ contacts + من غير القوائم) =====
    const exclude = new Set<string>([
      // ما نعرضهمش هنا لأنهم ظاهرين فوق أو قوائم
      'teachers', 'students', 'managers', 'managerCircles',
      'email', 'mobile', 'secondMobile',
      'fullName'
    ]);

    const preferredOrder = [
      'nationality',
      'resident',
      'governorate',
      'teacherName',
      'managerName',
      'circleName',
      'nationalityId',
      'residentId',
      'governorateId',
      'teacherId',
      'managerId',
      'circleId',
      'id'
    ];

    const entries = Object.entries(data as Record<string, any>)
      .filter(([key, val]) => !exclude.has(key))
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

  private formatValue(key: string, val: any): string {
    if (key === 'inactive') return val ? 'غير نشط' : 'نشط';
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
      mobile: 'ti ti-phone',
      secondMobile: 'ti ti-phone'
    }[key] ?? 'ti ti-circle';
  }
}
