// angular import
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { UserService, CreateUserDto } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LookupService, NationalityDto, GovernorateDto } from 'src/app/@theme/services/lookup.service';
import { CountryService, Country } from 'src/app/@theme/services/country.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { TranslateService } from '@ngx-translate/core';
import { finalize, merge, startWith } from 'rxjs';
import { isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';

@Component({
  selector: 'app-teacher-add',
  imports: [CommonModule, SharedModule, NgxMaskDirective],
  templateUrl: './teacher-add.component.html',
  styleUrl: './teacher-add.component.scss',
  providers: [provideNgxMask()]
})
export class TeacherAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private lookupService = inject(LookupService);
  private countryService = inject(CountryService);
  private translate = inject(TranslateService);

  basicInfoForm!: FormGroup;
  submitted = false;
  isSubmitting = false;
  missingRequiredFields: string[] = [];

  nationalities: NationalityDto[] = [];
  governorates: GovernorateDto[] = [];
  countries: Country[] = [];
  showGovernorateSelect = false;
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
    this.basicInfoForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobileCountryDialCode: [null, Validators.required],
      mobile: ['', Validators.required],
      secondMobileCountryDialCode: [''],
      secondMobile: [''],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      nationalityId: [null, Validators.required],
      residentId: [null, Validators.required],
      governorateId: [null],
      branchId: [null, Validators.required]
    });

    this.basicInfoForm
      .get('residentId')
      ?.valueChanges.subscribe((residentId) => this.updateGovernorateVisibility(residentId));

    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess) {
        this.nationalities = res.data;
        this.updateGovernorateVisibility(this.basicInfoForm.get('residentId')?.value);
      }
    });

    this.lookupService.getAllGovernorates().subscribe((res) => {
      if (res.isSuccess) {
        this.governorates = res.data;
      }
    });

    this.countryService.getCountries().subscribe((data) => {
      this.countries = data;
    });

    this.setupMissingRequiredFieldsTracking();
  }

  private updateGovernorateVisibility(residentId: number | null): void {
    const governorateControl = this.basicInfoForm.get('governorateId');
    if (!governorateControl) {
      return;
    }

    const nationality = this.nationalities.find((n) => n.id === Number(residentId)) ?? null;
    this.showGovernorateSelect = isEgyptianNationality(nationality);
    if (!this.showGovernorateSelect) {
      governorateControl.setValue(null);
    }
  }

  onCountryCodeChange(
    control: 'mobileCountryDialCode' | 'secondMobileCountryDialCode'
  ) {
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

  get isSubmitDisabled(): boolean {
    return this.isSubmitting || this.basicInfoForm.invalid;
  }

  get submitValidationMessage(): string {
    if (this.isSubmitting || this.basicInfoForm.valid) {
      return '';
    }

    if (this.missingRequiredFields.length) {
      return `البيانات المطلوبة غير مكتملة: ${this.missingRequiredFields.join('، ')}`;
    }

    return 'يرجى مراجعة الحقول غير الصحيحة قبل الإرسال.';
  }

  private getMissingRequiredFields(): string[] {
    const requiredFieldLabels: Record<string, string> = {
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      mobileCountryDialCode: 'مفتاح الدولة للجوال',
      mobile: 'رقم الجوال',
      passwordHash: 'كلمة المرور',
      nationalityId: 'الجنسية',
      residentId: 'مكان الإقامة',
      governorateId: 'المحافظة',
      branchId: 'الفرع'
    };

    return Object.entries(requiredFieldLabels)
      .filter(([controlName]) => this.isRequiredControlMissing(controlName))
      .map(([, label]) => label);
  }

  private isRequiredControlMissing(controlName: string): boolean {
    const control = this.basicInfoForm.get(controlName);
    return !!control && control.enabled && control.hasError('required');
  }

  private refreshMissingRequiredFields(): void {
    this.missingRequiredFields = this.getMissingRequiredFields();
  }

  private setupMissingRequiredFieldsTracking(): void {
    merge(this.basicInfoForm.statusChanges, this.basicInfoForm.valueChanges)
      .pipe(startWith(null))
      .subscribe(() => this.refreshMissingRequiredFields());
  }

  onSubmit() {
    if (this.isSubmitting) {
      return;
    }

    this.submitted = true;
    if (this.basicInfoForm.valid) {
      const formValue = this.basicInfoForm.value;
      const clean = (v: string) => v.replace(/\D/g, '');
      const model: CreateUserDto = {
        fullName: formValue.fullName,
        email: formValue.email,
        mobile: `${formValue.mobileCountryDialCode}${clean(formValue.mobile)}`,
        secondMobile: formValue.secondMobile
          ? `${formValue.secondMobileCountryDialCode}${clean(formValue.secondMobile)}`
          : undefined,
        passwordHash: formValue.passwordHash,
        nationalityId: formValue.nationalityId,
        residentId: formValue.residentId,
        governorateId: formValue.governorateId,
        branchId: formValue.branchId,
        userTypeId: Number(UserTypesEnum.Teacher),
      };
      this.isSubmitting = true;
      this.userService
        .createUser(model)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            this.toast.success(res.message || this.translate.instant('تمت الاضافة بنجاح'));
            this.basicInfoForm.reset();
            this.submitted = false;
          } else if (res?.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error(this.translate.instant('خطا في الاضافة'));
          }
        },
          error: () => this.toast.error(this.translate.instant('خطا في الاضافة'))
        });
    } else {
      this.basicInfoForm.markAllAsTouched();
    }
  }
}
