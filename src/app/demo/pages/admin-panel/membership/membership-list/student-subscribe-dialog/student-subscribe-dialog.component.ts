import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  ApiResponse,
  FilteredResultRequestDto,
  LookupService,
  SubscribeLookupDto
} from 'src/app/@theme/services/lookup.service';
import {
  SubscribeService,
  SubscribeTypeDto,
  getSubscribeTypeCategoryTranslationKey
} from 'src/app/@theme/services/subscribe.service';
import {
  StudentSubscribeService,
  AddStudentSubscribeDto
} from 'src/app/@theme/services/student-subscribe.service';
import { getSubscribeAudienceTranslationKey, inferSubscribeAudience, resolveSubscribePricing } from 'src/app/@theme/services/subscribe-audience';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-student-subscribe-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './student-subscribe-dialog.component.html',
  styleUrl: './student-subscribe-dialog.component.scss'
})
export class StudentSubscribeDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private subscribeService = inject(SubscribeService);
  private studentSubscribeService = inject(StudentSubscribeService);
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  private dialogRef = inject(MatDialogRef<StudentSubscribeDialogComponent>);
  private data = inject<{ studentId: number }>(MAT_DIALOG_DATA);
  private translate = inject(TranslateService);

  form = this.fb.group({
    subscribeTypeId: [null as number | null, Validators.required],
    subscribeId: [null as number | null, Validators.required]
  });

  types: SubscribeTypeDto[] = [];
  subscribes: SubscribeLookupDto[] = [];
  selectedCurrencyCode: string | null = null;
  selectedAmount: number | null = null;
  pricingError: string | null = null;
  availabilityMessage: string | null = null;
  isLoadingSubscriptions = false;
  isLoadingTypes = false;
  typeAvailabilityMessage: string | null = null;

  ngOnInit(): void {
    this.loadSubscribeTypes();

    this.form.get('subscribeTypeId')?.valueChanges.subscribe((typeId) => {
      this.form.patchValue({ subscribeId: null }, { emitEvent: false });
      this.resetPricingDetails();
      this.fetchAvailableSubscriptions(typeId);
    });

    this.form.get('subscribeId')?.valueChanges.subscribe((subscribeId) => {
      this.updatePricingDetails(subscribeId);
    });
  }

  private loadSubscribeTypes(): void {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    const studentId = this.data?.studentId ?? null;
    if (studentId) {
      filter.studentId = studentId;
    }

    this.isLoadingTypes = true;
    this.typeAvailabilityMessage = null;

    this.subscribeService.getAllTypes(filter).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data?.items) {
          this.types = res.data.items;
        } else {
          this.types = [];
        }

        const selectedTypeId = this.form.get('subscribeTypeId')?.value;
        if (selectedTypeId && !this.types.some((type) => type.id === selectedTypeId)) {
          this.form.patchValue({ subscribeTypeId: null }, { emitEvent: false });
        }

        if (this.types.length === 0) {
          this.typeAvailabilityMessage = this.translate.instant(
            "No subscription types are available for this student's nationality."
          );
          this.availabilityMessage = this.typeAvailabilityMessage;
        } else {
          this.typeAvailabilityMessage = null;
          this.availabilityMessage = this.translate.instant(
            'Select a subscription type to view available plans.'
          );
        }
      },
      error: () => {
        this.types = [];
        this.typeAvailabilityMessage = this.translate.instant('Unable to load subscription types.');
        this.availabilityMessage = this.translate.instant('Unable to load available subscriptions.');
        this.isLoadingTypes = false;
      },
      complete: () => {
        this.isLoadingTypes = false;
      }
    });
  }

  submit(): void {
    const subscribeId = this.form.value.subscribeId;
    if (!subscribeId || !this.hasAvailableSubscriptions) {
      return;
    }
    const selected = this.subscribes.find((item) => item.id === subscribeId);
    const pricing = selected ? resolveSubscribePricing(selected) : null;

    if (!selected || !pricing) {
      this.toast.error(this.translate.instant('Unsupported subscription audience'));
      return;
    }

    const inferredAudience = inferSubscribeAudience(selected);

    if (!inferredAudience) {
      this.toast.error(this.translate.instant('Unsupported subscription audience'));
      return;
    }

    const model: AddStudentSubscribeDto = {
      studentId: this.data?.studentId,
      studentSubscribeId: subscribeId,
      subscribeFor: inferredAudience
    };
    this.studentSubscribeService.create(model).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toast.success('Subscribe updated successfully');
          this.dialogRef.close(true);
        } else {
          this.toast.error('Error updating subscribe');
        }
      },
      error: () => this.toast.error('Error updating subscribe')
    });
  }

  resolveCategoryLabel(group: SubscribeTypeDto['group']): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(group));
  }

  resolveAudienceLabel(option: SubscribeLookupDto | null | undefined): string {
    if (!option) {
      return this.translate.instant(getSubscribeAudienceTranslationKey(null));
    }

    const audience = inferSubscribeAudience(option);
    return this.translate.instant(getSubscribeAudienceTranslationKey(audience));
  }

  getPricing(option: SubscribeLookupDto) {
    return resolveSubscribePricing(option);
  }

  formatAmount(amount: number | null): string {
    if (amount === null || amount === undefined) {
      return this.translate.instant('Subscription price unavailable');
    }

    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  private updatePricingDetails(subscribeId: number | null | undefined): void {
    if (!subscribeId) {
      this.resetPricingDetails();
      return;
    }

    const selected = this.subscribes.find((item) => item.id === subscribeId);
    const pricing = selected ? resolveSubscribePricing(selected) : null;

    if (!selected || !pricing) {
      this.selectedCurrencyCode = null;
      this.selectedAmount = null;
      this.pricingError = this.translate.instant('Unsupported subscription audience');
      return;
    }

    this.selectedCurrencyCode = pricing.currencyCode;
    this.selectedAmount = pricing.amount ?? null;
    this.pricingError = null;
  }

  private resetPricingDetails(): void {
    this.selectedCurrencyCode = null;
    this.selectedAmount = null;
    this.pricingError = null;
  }

  get hasAvailableSubscriptions(): boolean {
    return this.subscribes.length > 0;
  }

  private fetchAvailableSubscriptions(typeId: number | null | undefined): void {
    const studentId = this.data?.studentId ?? null;

    this.subscribes = [];
    this.resetPricingDetails();

    if (!studentId) {
      this.availabilityMessage = this.translate.instant('Student information unavailable.');
      return;
    }

    if (!typeId) {
      this.availabilityMessage = this.translate.instant('Select a subscription type to view available plans.');
      return;
    }

    this.isLoadingSubscriptions = true;
    this.availabilityMessage = null;

    this.lookupService.getSubscribesByTypeId(typeId, studentId).subscribe({
      next: (lookupRes) => {
        if (lookupRes.isSuccess) {
          const options = this.extractSubscriptionOptions(lookupRes);
          this.subscribes = options;

          if (options.length === 0) {
            this.availabilityMessage = this.translate.instant(
              'No compatible subscriptions were found for this student.'
            );
          }
        } else {
          this.availabilityMessage = this.translate.instant(
            'Unable to load available subscriptions.'
          );
        }
      },
      error: () => {
        this.availabilityMessage = this.translate.instant(
          'Unable to load available subscriptions.'
        );
        this.isLoadingSubscriptions = false;
      },
      complete: () => {
        this.isLoadingSubscriptions = false;
      }
    });
  }

  private extractSubscriptionOptions(
    response: ApiResponse<SubscribeLookupDto[]>
  ): SubscribeLookupDto[] {
    const rawData = response?.data as unknown;

    if (Array.isArray(rawData)) {
      return rawData;
    }

    if (
      rawData &&
      typeof rawData === 'object' &&
      Array.isArray((rawData as { result?: unknown }).result)
    ) {
      return (rawData as { result: SubscribeLookupDto[] }).result;
    }

    return [];
  }
}
