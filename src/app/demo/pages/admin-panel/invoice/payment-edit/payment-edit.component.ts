import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import {
  CurrencyEnum,
  CurrencyLabels,
  StudentPaymentDto,
  UpdatePaymentDto,
  StudentPaymentService
} from 'src/app/@theme/services/student-payment.service';

@Component({
  selector: 'app-payment-edit',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './payment-edit.component.html',
  styleUrl: './payment-edit.component.scss'
})
export class PaymentEditComponent {
  private fb = inject(FormBuilder);
  private service = inject(StudentPaymentService);
  private dialogRef = inject(MatDialogRef<PaymentEditComponent>);
  data = inject<StudentPaymentDto>(MAT_DIALOG_DATA);
  readonly currencyOptions = [
    { id: CurrencyEnum.EGP, label: CurrencyLabels[CurrencyEnum.EGP] },
    { id: CurrencyEnum.SAR, label: CurrencyLabels[CurrencyEnum.SAR] },
    { id: CurrencyEnum.USD, label: CurrencyLabels[CurrencyEnum.USD] }
  ];
  receiptFile?: File;
  isSubmitting = false;

  form = this.fb.group({
    subscribe: [{ value: this.data.subscribe, disabled: true }],
    amount: [this.data.amount, Validators.required],
    currencyId: [this.data.currencyId ?? this.data.currency ?? null, Validators.required]
  });

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.receiptFile = input.files[0];
    }
  }

  confirm() {
    if (this.isSubmitting) {
      return;
    }
    this.submitUpdate(true, false);
  }

  cancel() {
    if (this.isSubmitting) {
      return;
    }
    this.submitUpdate(false, true);
  }

  private submitUpdate(payStatue: boolean, isCancelled: boolean): void {
    const dto: UpdatePaymentDto = {
      id: this.data.invoiceId,
      amount: this.form.get('amount')?.value ?? undefined,
      currencyId: this.form.get('currencyId')?.value ?? undefined,
      payStatue,
      isCancelled
    };

    const receipt$ = this.receiptFile
      ? of(this.receiptFile)
      : this.service.downloadPaymentReceipt(this.data.invoiceId).pipe(
          map((blob) => this.toReceiptFile(blob)),
          catchError((error) => {
            console.error('Failed to load receipt PDF for payment update.', error);
            return of(undefined);
          })
        );

    this.isSubmitting = true;

    receipt$
      .pipe(
        switchMap((receipt) => this.service.updatePayment(dto, receipt)),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (error) =>
          console.error('Failed to update payment status with receipt attachment.', error)
      });
  }

  private toReceiptFile(blob: Blob): File | undefined {
    if (!blob || blob.size === 0) {
      return undefined;
    }

    const type = blob.type && blob.type !== '' ? blob.type : 'application/pdf';
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `payment-receipt-${this.data.invoiceId}-${timestamp}.pdf`;

    try {
      return new File([blob], fileName, { type });
    } catch (error) {
      console.error('Failed to construct receipt file from blob.', error);
      return undefined;
    }
  }
}

