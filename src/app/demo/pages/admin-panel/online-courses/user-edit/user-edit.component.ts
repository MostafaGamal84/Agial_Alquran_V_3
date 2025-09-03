// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { UserService, UpdateUserDto } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LookupService, NationalityDto, GovernorateDto, LookUpUserDto } from 'src/app/@theme/services/lookup.service';
import { CountryService, Country } from 'src/app/@theme/services/country.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

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
  private countryService = inject(CountryService);

  basicInfoForm!: FormGroup;
  userId!: number;
  currentUser?: LookUpUserDto;

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
      nationalityId: [null, Validators.required],
      governorateId: [null, Validators.required],
      branchId: [null, Validators.required]
    });

    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess) {
        this.nationalities = res.data;
        if (this.currentUser && !this.basicInfoForm.get('mobileCountryDialCode')?.value) {
          const nat = this.nationalities.find(
            (n) => n.id === this.currentUser!.nationalityId
          );
          if (nat) {
            const dial = `+${nat.telCode}`;
            this.basicInfoForm.patchValue({ mobileCountryDialCode: dial });
            this.onCountryCodeChange('mobileCountryDialCode');
          }
        }
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

    this.currentUser = history.state['user'] as LookUpUserDto | undefined;
    if (this.currentUser) {
      this.userId = this.currentUser.id;
      const parsePhone = (phone: string) => {
        const cleaned = phone.replace(/[^+\d]/g, '');
        const match = cleaned.match(/^(\+\d{1,3})(\d+)$/);
        return match
          ? { dialCode: match[1], number: match[2] }
          : { dialCode: '', number: cleaned };
      };
      const mobile = parsePhone(this.currentUser.mobile);
      const second = this.currentUser.secondMobile
        ? parsePhone(this.currentUser.secondMobile)
        : { dialCode: '', number: '' };
      this.basicInfoForm.patchValue({
        fullName: this.currentUser.fullName,
        email: this.currentUser.email,
        mobileCountryDialCode: mobile.dialCode || null,
        mobile: mobile.number,
        secondMobileCountryDialCode: second.dialCode || null,
        secondMobile: second.number,
        nationalityId: this.currentUser.nationalityId,
        governorateId: this.currentUser.governorateId,
        branchId: this.currentUser.branchId
      });
      if (mobile.dialCode) {
        this.onCountryCodeChange('mobileCountryDialCode');
      }
      if (this.currentUser.secondMobile && second.dialCode) {
        this.onCountryCodeChange('secondMobileCountryDialCode');
      }
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
        branchId: formValue.branchId
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
