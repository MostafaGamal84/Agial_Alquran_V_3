import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

interface Person {
  fullName?: string;
  mobile?: string;
}

interface Circle {
  circle?: string;
}

interface DetailEntry {
  key: string;
  labelKey: string;
  value: unknown;
}

interface ContactEntry {
  key: string;
  value: unknown;
  icon: string;
}

@Component({
  selector: 'app-branch-manager-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatExpansionModule,
    NgxScrollbar,
    TranslateModule
  ],
  templateUrl: './branch-manager-details.component.html',
  styleUrl: './branch-manager-details.component.scss'
})
export class BranchManagerDetailsComponent {
  manager?: Record<string, unknown>;
  teachers: Person[] = [];
  students: Person[] = [];
  managerCircles: Circle[] = [];
  contactEntries: ContactEntry[] = [];
  detailEntries: DetailEntry[] = [];

  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  private readonly labelTranslationMap: Record<string, string> = {
    nationality: 'الجنسية',
    gender: 'الجنس',
    userName: 'اسم المستخدم',
    identityNumber: 'رقم الهوية',
    createdAt: 'تاريخ الإنشاء'
  };

  constructor() {
    const raw = inject<Record<string, unknown>>(MAT_DIALOG_DATA);

    if (raw) {
      this.manager = raw;
      this.teachers = Array.isArray(raw['teachers']) ? raw['teachers'] as Person[] : [];
      this.students = Array.isArray(raw['students']) ? raw['students'] as Person[] : [];
      this.managerCircles = Array.isArray(raw['managerCircles']) ? raw['managerCircles'] as Circle[] : [];

      const contactKeys = ['email', 'mobile', 'secondMobile'];
      this.contactEntries = contactKeys
        .filter(k => raw[k])
        .map(k => ({ key: k, value: raw[k], icon: this.getContactIcon(k) }));

      const exclude = ['fullName',  'managerCircles', ...contactKeys];

      this.detailEntries = Object.entries(raw)
        .filter(([key, val]) =>
          !exclude.includes(key) &&
          val !== null &&
          typeof val !== 'object' &&
          !Array.isArray(val)
        )
        .map(([key, value]) => ({
          key,
          labelKey: this.labelTranslationMap[key] ?? this.humanizeKey(key),
          value
        }));
    }
  }

  getBranchLabel(id: unknown): string {
    const item = this.Branch.find(b => b.id === id);
    return item ? item.label : String(id);
  }

  private humanizeKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').trim();
  }

  private getContactIcon(key: string): string {
    return {
      email: 'ti ti-mail',
      mobile: 'ti ti-phone',
      secondMobile: 'ti ti-phone'
    }[key] ?? 'ti ti-circle';
  }
}
