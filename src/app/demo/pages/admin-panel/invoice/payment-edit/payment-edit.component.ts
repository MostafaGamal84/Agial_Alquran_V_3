import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, map, of, switchMap } from 'rxjs';
import {
  StudentPaymentDto,
  CurrencyEnum,
  UpdatePaymentDto,
  StudentPaymentService
} from 'src/app/@theme/services/student-payment.service';

@Component({
  selector: 'app-payment-edit',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './payment-edit.component.html',
  styleUrl: './payment-edit.component.scss'
})
export class PaymentEditComponent {
  private fb = inject(FormBuilder);
  private service = inject(StudentPaymentService);
  private dialogRef = inject(MatDialogRef<PaymentEditComponent>);
  data = inject<StudentPaymentDto>(MAT_DIALOG_DATA);
  currencyEnum = CurrencyEnum;
  receiptFile?: File;

  form = this.fb.group({
    subscribe: [{ value: this.data.subscribe, disabled: true }],
    amount: [this.data.amount, Validators.required],
    currency: [{ value: this.currencyEnum[this.data.currency ?? 1], disabled: true }]
  });

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.receiptFile = input.files[0];
    }
  }

  confirm() {
    this.submitUpdate(true, false);
  }

  cancel() {
    this.submitUpdate(false, true);
  }

  private submitUpdate(payStatue: boolean, isCancelled: boolean): void {
    const dto: UpdatePaymentDto = {
      id: this.data.invoiceId,
      amount: this.form.get('amount')?.value ?? undefined,
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

    receipt$
      .pipe(switchMap((receipt) => this.service.updatePayment(dto, receipt)))
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

