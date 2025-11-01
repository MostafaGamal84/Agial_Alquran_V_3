// angular import
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  ApiResponse,
  ProfileDto,
  UpdateProfileDto,
  UserService
} from 'src/app/@theme/services/user.service';
import {
  GovernorateDto,
  LookupService,
  NationalityDto
} from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';

type ProfileFormValue = {
  fullName: string;
  email: string;
  mobile: string;
  secondMobile: string;
  nationalityId: number | null;
  governorateId: number | null;
  branchId: number | null;
};

@Component({
  selector: 'app-ac-account',
  imports: [CommonModule, SharedModule],
  templateUrl: './ac-account.component.html',
  styleUrls: ['../account-profile.scss', './ac-account.component.scss']
})
export class AcAccountComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  profileForm!: FormGroup;
  isLoadingProfile = false;
  isSaving = false;
  profileError: string | null = null;

  nationalities: NationalityDto[] = [];
  governorates: GovernorateDto[] = [];
  isGovernorateRequired = false;
  branches = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  private lastLoadedProfile: ProfileDto | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadLookups();
    this.loadProfile();
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      mobile: ['', [Validators.required, Validators.maxLength(25)]],
      secondMobile: ['', [Validators.maxLength(25)]],
      nationalityId: [null, Validators.required],
      governorateId: [null],
      branchId: [null, Validators.required]
    });

    this.profileForm
      .get('nationalityId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nationalityId) => this.applyGovernorateRequirement(nationalityId));
  }

  private loadLookups(): void {
    this.lookupService
      .getAllNationalities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && Array.isArray(res.data)) {
            this.nationalities = res.data;
            this.applyGovernorateRequirement(this.profileForm.get('nationalityId')?.value);
          }
        },
        error: (err) => {
          const message = this.resolveErrorMessage(err, 'Failed to load nationalities.');
          this.toast.error(message);
        }
      });

    this.lookupService
      .getAllGovernorates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && Array.isArray(res.data)) {
            this.governorates = res.data;
          }
        },
        error: (err) => {
          const message = this.resolveErrorMessage(err, 'Failed to load governorates.');
          this.toast.error(message);
        }
      });
  }

  private loadProfile(): void {
    this.isLoadingProfile = true;
    this.profileError = null;
    this.profileForm.disable({ emitEvent: false });

    this.userService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoadingProfile = false;
          this.profileForm.enable({ emitEvent: false });

          if (res.isSuccess && res.data) {
            this.patchProfileForm(res.data);
            return;
          }

          const message = this.resolveResponseMessage(res, 'Failed to load profile.');
          this.profileError = message;
          this.toast.error(message);
        },
        error: (err) => {
          this.isLoadingProfile = false;
          const message = this.resolveErrorMessage(err, 'Failed to load profile.');
          this.profileError = message;
          this.toast.error(message);
          this.profileForm.enable({ emitEvent: false });
        }
      });
  }

  onReset(): void {
    if (this.lastLoadedProfile) {
      this.patchProfileForm(this.lastLoadedProfile);
    } else {
      this.profileForm.reset();
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.value as ProfileFormValue;
    const payload = this.buildPayload(value);

    this.isSaving = true;
    this.profileError = null;
    this.profileForm.disable({ emitEvent: false });

    this.userService
      .updateProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSaving = false;

          if (res.isSuccess) {
            const message = this.resolveResponseMessage(res, 'Profile updated successfully.');
            this.toast.success(message);
            this.loadProfile();
            return;
          }

          const message = this.resolveResponseMessage(res, 'Failed to update profile.');
          this.profileError = message;
          this.toast.error(message);
          this.profileForm.enable({ emitEvent: false });
        },
        error: (err) => {
          this.isSaving = false;
          const message = this.resolveErrorMessage(err, 'Failed to update profile.');
          this.profileError = message;
          this.toast.error(message);
          this.profileForm.enable({ emitEvent: false });
        }
      });
  }

  private patchProfileForm(profile: ProfileDto): void {
    this.lastLoadedProfile = profile;
    this.profileForm.reset(
      {
        fullName: profile.fullName ?? '',
        email: profile.email ?? '',
        mobile: profile.mobile ?? '',
        secondMobile: profile.secondMobile ?? '',
        nationalityId: profile.nationalityId ?? null,
        governorateId: profile.governorateId ?? null,
        branchId: profile.branchId ?? null
      },
      { emitEvent: false }
    );
    this.applyGovernorateRequirement(profile.nationalityId ?? null);
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
  }

  private buildPayload(value: ProfileFormValue): UpdateProfileDto {
    const payload: UpdateProfileDto = {
      fullName: value.fullName?.trim() ?? '',
      email: value.email?.trim() ?? '',
      mobile: value.mobile?.trim() ?? '',
      secondMobile: value.secondMobile?.trim() || '',
      nationalityId: value.nationalityId !== null ? Number(value.nationalityId) : null,
      governorateId: value.governorateId !== null ? Number(value.governorateId) : null,
      branchId: value.branchId !== null ? Number(value.branchId) : null
    };

    return payload;
  }

  private applyGovernorateRequirement(nationalityId: number | null): void {
    const governorateControl = this.profileForm.get('governorateId');
    if (!governorateControl) {
      return;
    }

    const nationality = this.nationalities.find((n) => n.id === Number(nationalityId)) ?? null;
    this.isGovernorateRequired = isEgyptianNationality(nationality);

    if (this.isGovernorateRequired) {
      governorateControl.setValidators([Validators.required]);
    } else {
      governorateControl.clearValidators();
    }

    governorateControl.updateValueAndValidity({ emitEvent: false });
  }

  private resolveResponseMessage(
    response: ApiResponse<unknown> | null | undefined,
    fallback: string
  ): string {
    if (!response) {
      return fallback;
    }

    const directMessage = response.message?.toString().trim();
    if (directMessage) {
      return directMessage;
    }

    const messageForCode = this.getMessageForCode(response.messageCode);
    if (messageForCode) {
      return messageForCode;
    }

    const errorMessage = Array.isArray(response.errors)
      ? response.errors.map((err) => err.message?.trim()).find(Boolean)
      : undefined;
    if (errorMessage) {
      return errorMessage;
    }

    return fallback;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }

    if (error && typeof error === 'object') {
      const maybeResponse = (error as { error?: ApiResponse<unknown> | string }).error;
      if (maybeResponse && typeof maybeResponse === 'object') {
        return this.resolveResponseMessage(maybeResponse as ApiResponse<unknown>, fallback);
      }
      if (typeof maybeResponse === 'string' && maybeResponse.trim()) {
        return maybeResponse.trim();
      }
    }

    return fallback;
  }

  private getMessageForCode(code?: number | null): string | null {
    switch (code) {
      case 7008:
        return 'Email address already exists.';
      case 7038:
        return 'Mobile number already exists.';
      default:
        return null;
    }
  }
}
