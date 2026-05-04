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
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { CountryService, Country } from 'src/app/@theme/services/country.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';
import { TranslateService } from '@ngx-translate/core';
import { finalize, merge, startWith } from 'rxjs';
import { FieldErrorComponent } from 'src/app/shared/validation/field-error/field-error.component';
import { ValidationService } from 'src/app/shared/validation/validation.service';
import { LiveErrorStateMatcher } from 'src/app/shared/validation/live-error-state-matcher';
import { computeEducationSystemTypeId } from 'src/app/@theme/utils/education-system.utils';

@Component({
  selector: 'app-branch-manager-add',
  imports: [CommonModule, SharedModule, NgxMaskDirective, FieldErrorComponent],
  templateUrl: './branch-manager-add.component.html',
  styleUrl: './branch-manager-add.component.scss',
  providers: [provideNgxMask()]
})
export class BranchManagerAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private lookupService = inject(LookupService);
  private countryService = inject(CountryService);
  private translate = inject(TranslateService);
  readonly validationService = inject(ValidationService);
  liveErrorStateMatcher = new LiveErrorStateMatcher();

  basicInfoForm!: FormGroup;
  submitted = false;
  isSubmitting = false;

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
      includeQuranSystem: [true],
      includeAcademicSystem: [false],
      educationSystemTypeId: [1, Validators.required],
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

    this.setupEducationSystemMembershipHandling();
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

  private normalizeLocalPhoneNumber(value: string | null | undefined): string {
    return `${value ?? ''}`
      .replace(/\D/g, '')
      .replace(/^0+/, '');
  }

  private buildInternationalPhoneNumber(
    dialCode: string | null | undefined,
    value: string | null | undefined
  ): string | undefined {
    const normalizedDialCode = `${dialCode ?? ''}`.trim();
    const normalizedLocalNumber = this.normalizeLocalPhoneNumber(value);

    if (!normalizedDialCode || !normalizedLocalNumber) {
      return undefined;
    }

    return `${normalizedDialCode}${normalizedLocalNumber}`;
  }

  private setupEducationSystemMembershipHandling(): void {
    const quranControl = this.basicInfoForm.get('includeQuranSystem');
    const academicControl = this.basicInfoForm.get('includeAcademicSystem');

    merge(quranControl!.valueChanges, academicControl!.valueChanges)
      .pipe(startWith(null))
      .subscribe(() => this.updateEducationSystemTypeControl());
  }

  private updateEducationSystemTypeControl(): void {
    const membershipControl = this.basicInfoForm.get('educationSystemTypeId');
    const computedValue = computeEducationSystemTypeId(
      !!this.basicInfoForm.get('includeQuranSystem')?.value,
      !!this.basicInfoForm.get('includeAcademicSystem')?.value
    );

    membershipControl?.setValue(computedValue, { emitEvent: false });
    if (computedValue === null) {
      membershipControl?.setErrors({ required: true });
      return;
    }

    membershipControl?.setErrors(null);
    membershipControl?.updateValueAndValidity({ emitEvent: false });
  }

  onSubmit() {
    if (this.isSubmitting) {
      return;
    }

    this.submitted = true;
    if (this.basicInfoForm.valid) {
      const formValue = this.basicInfoForm.value;
      const model: CreateUserDto = {
        fullName: formValue.fullName,
        email: formValue.email,
        mobile:
          this.buildInternationalPhoneNumber(
            formValue.mobileCountryDialCode,
            formValue.mobile
          ) ?? '',
        secondMobile: this.buildInternationalPhoneNumber(
          formValue.secondMobileCountryDialCode,
          formValue.secondMobile
        ),
        educationSystemTypeId: formValue.educationSystemTypeId,
        passwordHash: formValue.passwordHash,
        nationalityId: formValue.nationalityId,
        residentId: formValue.residentId,
        governorateId: formValue.governorateId,
        branchId: formValue.branchId,
        userTypeId: Number(UserTypesEnum.BranchLeader)
      };
      this.isSubmitting = true;
      this.userService
        .createUser(model)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: (res) => {
            if (res?.isSuccess) {
              this.toast.success(res.message || this.translate.instant('تمت الإضافة بنجاح'));
              this.basicInfoForm.reset({
                includeQuranSystem: true,
                includeAcademicSystem: false,
                educationSystemTypeId: 1
              });
              this.updateEducationSystemTypeControl();
              this.submitted = false;
            } else if (res?.errors?.length) {
              res.errors.forEach((e) => this.toast.error(e.message));
            } else {
              this.toast.error(this.translate.instant('خطأ في الإضافة'));
            }
          },
          error: () => this.toast.error(this.translate.instant('خطأ في الإضافة'))
        });
    } else {
      this.validationService.markAllAsTouched(this.basicInfoForm);
    }
  }
}
