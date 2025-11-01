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
import { isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';


@Component({
  selector: 'app-student-add',
  imports: [CommonModule, SharedModule, NgxMaskDirective],
  templateUrl: './student-add.component.html',
  styleUrl: './student-add.component.scss',
  providers: [provideNgxMask()]
})
export class StudentAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private lookupService = inject(LookupService);
  private countryService = inject(CountryService);

  basicInfoForm!: FormGroup;

  nationalities: NationalityDto[] = [];
  governorates: GovernorateDto[] = [];
  countries: Country[] = [];
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
      governorateId: [null],
      branchId: [null, Validators.required]
    });

    this.basicInfoForm
      .get('nationalityId')
      ?.valueChanges.subscribe((nationalityId) => this.applyGovernorateRequirement(nationalityId));

    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess) {
        this.nationalities = res.data;
        this.applyGovernorateRequirement(this.basicInfoForm.get('nationalityId')?.value);
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
  }

  private applyGovernorateRequirement(nationalityId: number | null): void {
    const governorateControl = this.basicInfoForm.get('governorateId');
    if (!governorateControl) {
      return;
    }

    const nationality = this.nationalities.find((n) => n.id === Number(nationalityId)) ?? null;
    if (isEgyptianNationality(nationality)) {
      governorateControl.setValidators([Validators.required]);
    } else {
      governorateControl.clearValidators();
    }

    governorateControl.updateValueAndValidity({ emitEvent: false });
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

  onSubmit() {
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
        governorateId: formValue.governorateId,
        branchId: formValue.branchId,
        userTypeId: Number(UserTypesEnum.Student),
      };

      this.userService.createUser(model).subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            this.toast.success(res.message || 'User created successfully');
            this.basicInfoForm.reset();
          } else if (res?.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error('Error creating user');
          }
        },
        error: () => this.toast.error('Error creating user')
      });
    } else {
      this.basicInfoForm.markAllAsTouched();
    }
  }
}
