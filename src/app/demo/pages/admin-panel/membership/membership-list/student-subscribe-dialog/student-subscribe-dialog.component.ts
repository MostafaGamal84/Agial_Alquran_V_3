import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  FilteredResultRequestDto,
  LookupService,
  SubscribeLookupDto
} from 'src/app/@theme/services/lookup.service';
import {
  SubscribeService,
  SubscribeTypeDto,
  getSubscribeTypeCategoryTranslationKey
} from 'src/app/@theme/services/subscribe.service';
import { StudentSubscribeService, AddStudentSubscribeDto } from 'src/app/@theme/services/student-subscribe.service';
import {
  SubscribeAudience,
  getSubscribeAudienceTranslationKey,
  resolveSubscribePricing
} from 'src/app/@theme/services/subscribe-audience';
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
  private lookupService = inject(LookupService);
  private studentSubscribeService = inject(StudentSubscribeService);
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

  ngOnInit(): void {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.subscribeService.getAllTypes(filter).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        this.types = res.data.items;
      } else {
        this.types = [];
      }
    });

    this.form.get('subscribeTypeId')?.valueChanges.subscribe((typeId) => {
      this.form.patchValue({ subscribeId: null }, { emitEvent: false });
      this.resetPricingDetails();
      if (typeId) {
        this.lookupService.getSubscribesByTypeId(typeId).subscribe((res) => {
          if (res.isSuccess && res.data) {
            this.subscribes = res.data;
          } else {
            this.subscribes = [];
          }
        });
      } else {
        this.subscribes = [];
      }
    });

    this.form.get('subscribeId')?.valueChanges.subscribe((subscribeId) => {
      this.updatePricingDetails(subscribeId);
    });
  }

  submit(): void {
    const subscribeId = this.form.value.subscribeId;
    if (!subscribeId) {
      return;
    }
    const selected = this.subscribes.find((item) => item.id === subscribeId);
    const pricing = selected ? resolveSubscribePricing(selected) : null;

    if (!selected || !pricing) {
      this.toast.error(this.translate.instant('Unsupported subscription audience'));
      return;
    }

    const model: AddStudentSubscribeDto = {
      studentId: this.data?.studentId,
      studentSubscribeId: subscribeId,
      subscribeFor: selected.subscribeFor ?? null
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

  resolveCategoryLabel(type: SubscribeTypeDto['type']): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(type));
  }

  resolveAudienceLabel(audience: SubscribeAudience | null | undefined): string {
    return this.translate.instant(getSubscribeAudienceTranslationKey(audience ?? null));
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
}
