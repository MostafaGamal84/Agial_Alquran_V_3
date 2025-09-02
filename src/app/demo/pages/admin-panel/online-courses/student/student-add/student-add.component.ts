// angular import
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { UserService, CreateUserDto } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LookupService, NationalityDto, GovernorateDto } from 'src/app/@theme/services/lookup.service';

import { CountryService, Country } from 'src/app/@theme/services/country.service';

import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';


@Component({
  selector: 'app-student-add',
  imports: [CommonModule, SharedModule],
  templateUrl: './student-add.component.html',
  styleUrl: './student-add.component.scss'
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

  ngOnInit(): void {
    this.basicInfoForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobileCountryDialCode: [null, Validators.required],
      mobile: ['', Validators.required],
      secondMobileCountryDialCode: [''],
      secondMobile: [''],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      userTypeId: [null, Validators.required],
      nationalityId: [null, Validators.required],
      governorateId: [null, Validators.required],
      branchId: [null, Validators.required]
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

    this.countryService.getCountries().subscribe((data) => {
      this.countries = data;
    });
  }

  onSubmit() {
    if (this.basicInfoForm.valid) {

      const formValue = this.basicInfoForm.value;
      const model: CreateUserDto = {
        fullName: formValue.fullName,
        email: formValue.email,
        mobile: `${formValue.mobileCountryDialCode}${formValue.mobile}`,
        secondMobile: formValue.secondMobile
          ? `${formValue.secondMobileCountryDialCode}${formValue.secondMobile}`
          : undefined,
        passwordHash: formValue.passwordHash,
       
        nationalityId: formValue.nationalityId,
        governorateId: formValue.governorateId,
        branchId: formValue.branchId,
      };

       model.userTypeId = Number(UserTypesEnum.Student); 

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
