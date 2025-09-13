import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { StudentPaymentDto, CurrencyEnum, UpdatePaymentDto, StudentPaymentService } from 'src/app/@theme/services/student-payment.service';

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
    const dto: UpdatePaymentDto = {
      id: this.data.invoiceId,
      amount: this.form.get('amount')?.value ?? undefined,
      payStatue: true,
      isCancelled: false
    };
    this.service.updatePayment(dto, this.receiptFile).subscribe(() => {
      this.dialogRef.close(true);
    });
  }

  cancel() {
    const dto: UpdatePaymentDto = {
      id: this.data.invoiceId,
      amount: this.form.get('amount')?.value ?? undefined,
      payStatue: false,
      isCancelled: true
    };
    this.service.updatePayment(dto, this.receiptFile).subscribe(() => {
      this.dialogRef.close(true);
    });
  }
}

