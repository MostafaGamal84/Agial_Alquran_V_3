// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Router } from '@angular/router';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { UserService, UpdateUserDto } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import {
  LookupService,
  NationalityDto,
  GovernorateDto,
  LookUpUserDto,
  FilteredResultRequestDto,
} from 'src/app/@theme/services/lookup.service';
import { CircleService, CircleDto } from 'src/app/@theme/services/circle.service';
import { CountryService, Country } from 'src/app/@theme/services/country.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-user-edit',
  imports: [CommonModule, SharedModule, NgxMaskDirective],
  templateUrl: './user-edit.component.html',
  styleUrl: './user-edit.component.scss',
  providers: [provideNgxMask()]
})
export class UserEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private lookupService = inject(LookupService);
  private circleService = inject(CircleService);
  private countryService = inject(CountryService);
  private router = inject(Router);

  basicInfoForm!: FormGroup;
  userId!: number;
  currentUser?: LookUpUserDto & {
    teachers?: LookUpUserDto[];
    students?: LookUpUserDto[];
    managers?: LookUpUserDto[];
    managerCircles?: { circleId: number; circle?: string }[];
  };
  nationalities: NationalityDto[] = [];
  governorates: GovernorateDto[] = [];
  countries: Country[] = [];
  teachers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  circles: CircleDto[] = [];
  isManager = false;
  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  phoneFormats: Record<string, { mask: string; placeholder: string }> = {
    '+1': { mask: '000-000-0000', placeholder: '123-456-7890' },
    '+44': { mask: '0000 000000', placeholder: '7123 456789' },
    '+966': { mask: '0000000000', placeholder: '5XXXXXXXXX' }
  };
  mobileMask = '';
  mobilePlaceholder = '';
  secondMobileMask = '';
  secondMobilePlaceholder = '';

  ngOnInit(): void {
    this.isManager = this.router.url.includes('/manager/');
    this.basicInfoForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobileCountryDialCode: [null, Validators.required],
      mobile: ['', Validators.required],
      secondMobileCountryDialCode: [''],
      secondMobile: [''],
      nationalityId: [null, Validators.required],
      governorateId: [null, Validators.required],
      branchId: [null, Validators.required],
      teacherIds: [[]],
      studentIds: [[]],
      circleIds: [[]],
    });

    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess) {
        this.nationalities = res.data;
      }
    });

    this.lookupService.getAllGovernorates().subscribe((res) => {
      if (res.isSuccess) {
        this.governorates = res.data;
      }
    });

    this.currentUser = history.state['user'] as typeof this.currentUser;
    if (this.currentUser) {
      this.userId = this.currentUser.id;
      const clean = (phone: string) => phone.replace(/\D/g, '');
      this.basicInfoForm.patchValue({
        fullName: this.currentUser.fullName,
        email: this.currentUser.email,
        mobile: clean(this.currentUser.mobile),
        secondMobile: this.currentUser.secondMobile
          ? clean(this.currentUser.secondMobile)
          : '',
        nationalityId: this.currentUser.nationalityId,
        governorateId: this.currentUser.governorateId,
        branchId: this.currentUser.branchId
      });
      if (this.isManager) {
        const teacherList =
          this.currentUser.teachers ?? this.currentUser.managers ?? [];
        if (teacherList.length) {
          this.teachers = teacherList;
          this.basicInfoForm.patchValue({
            teacherIds: teacherList.map((t) => t.id)
          });
        }
        if (this.currentUser.students?.length) {
          this.students = this.currentUser.students;
          this.basicInfoForm.patchValue({
            studentIds: this.currentUser.students.map((s) => s.id)
          });
        }
        if (this.currentUser.managerCircles?.length) {
          const circleList: CircleDto[] = this.currentUser.managerCircles.map((c) => ({
            id: c.circleId,
            name: c.circle || ''
          }));
          this.circles = circleList;
          this.basicInfoForm.patchValue({
            circleIds: this.currentUser.managerCircles.map((c) => c.circleId)
          });
        }
        this.loadRelatedUsers();
        this.loadCircles();
      }
    }

    this.countryService.getCountries().subscribe((data) => {
      this.countries = data;
      if (this.currentUser) {
        const detected = this.detectDialCode(
          this.currentUser.mobile,
          this.countries
        );

        if (detected) {
          this.basicInfoForm.patchValue({
            mobileCountryDialCode: detected.dialCode,
            mobile: detected.number
          });
          this.onCountryCodeChange('mobileCountryDialCode');
        }
        if (this.currentUser.secondMobile) {
          const secondDetected = this.detectDialCode(
            this.currentUser.secondMobile,
            this.countries
          );

          if (secondDetected) {
            this.basicInfoForm.patchValue({
              secondMobileCountryDialCode: secondDetected.dialCode,
              secondMobile: secondDetected.number
            });
            this.onCountryCodeChange('secondMobileCountryDialCode');
          }
        }
      }
    });

  }

  private loadRelatedUsers() {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.lookupService
      .getUsersForSelects(
        filter,
        Number(UserTypesEnum.Teacher),
        0,
        0,
        this.currentUser?.branchId || 0
      )
      .subscribe((res) => {
        if (res.isSuccess) {
          const existing = new Map(this.teachers.map((t) => [t.id, t]));
          res.data.items.forEach((t) => existing.set(t.id, t));
          this.teachers = Array.from(existing.values());
        }
      });
    this.lookupService
      .getUsersForSelects(
        filter,
        Number(UserTypesEnum.Student),
        0,
        0,
        this.currentUser?.branchId || 0
      )
      .subscribe((res) => {
        if (res.isSuccess) {
          const existing = new Map(this.students.map((s) => [s.id, s]));
          res.data.items.forEach((s) => existing.set(s.id, s));
          this.students = Array.from(existing.values());
        }
      });
  }

  private loadCircles() {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.circleService.getAll(filter).subscribe((res) => {
      if (res.isSuccess) {
        const existing = new Map(this.circles.map((c) => [c.id, c]));
        res.data.items.forEach((c) => existing.set(c.id, c));
        this.circles = Array.from(existing.values());
      }
    });
  }

  onCountryCodeChange(control: 'mobileCountryDialCode' | 'secondMobileCountryDialCode') {
    const code = this.basicInfoForm.get(control)?.value;
    const format = this.phoneFormats[code] || { mask: '', placeholder: '' };
    if (control === 'mobileCountryDialCode') {
      this.mobileMask = format.mask;
      this.mobilePlaceholder = format.placeholder;
    } else {
      this.secondMobileMask = format.mask;
      this.secondMobilePlaceholder = format.placeholder;
    }
  }

  private detectDialCode(phone: string, countries: Country[]):
    | { dialCode: string; number: string }
    | null {
    const digits = phone.replace(/\D/g, '');
    const codes = countries
      .map((c) => c.dialCode.replace('+', ''))
      .sort((a, b) => b.length - a.length);
    for (const code of codes) {
      if (digits.startsWith(code)) {
        return { dialCode: `+${code}`, number: digits.slice(code.length) };
      }
    }
    return null;
  }

  onSubmit() {
    if (this.basicInfoForm.valid) {
      const formValue = this.basicInfoForm.value;
      const clean = (v: string) => v.replace(/\D/g, '');
      const model: UpdateUserDto = {
        id: this.userId,
        fullName: formValue.fullName,
        email: formValue.email,
        mobile: `${formValue.mobileCountryDialCode}${clean(formValue.mobile)}`,
        secondMobile: formValue.secondMobile ? `${formValue.secondMobileCountryDialCode}${clean(formValue.secondMobile)}` : undefined,
        nationalityId: formValue.nationalityId,
        governorateId: formValue.governorateId,
        branchId: formValue.branchId,
        teacherIds: this.isManager ? formValue.teacherIds : undefined,
        studentIds: this.isManager ? formValue.studentIds : undefined,
        circleIds: this.isManager ? formValue.circleIds : undefined,
      };
      this.userService.updateUser(model).subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            this.toast.success(res.message || 'User updated successfully');
          } else if (res?.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error('Error updating user');
          }
        },
        error: () => this.toast.error('Error updating user')
      });
    } else {
      this.basicInfoForm.markAllAsTouched();
    }
  }
}
