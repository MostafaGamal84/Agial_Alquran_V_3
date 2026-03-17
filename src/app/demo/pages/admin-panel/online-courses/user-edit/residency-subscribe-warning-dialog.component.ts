import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ResidencySubscribeWarningDialogData {
  targetResidentName: string;
  currentPlanName?: string | null;
  currentGroupLabel?: string | null;
  targetGroupLabel?: string | null;
}

@Component({
  selector: 'app-residency-subscribe-warning-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon color="warn">warning_amber</mat-icon>
      <span>تنبيه قبل تعديل مكان الإقامة</span>
    </h2>

    <mat-dialog-content class="dialog-content">
      <p class="message">
        يجب تحديث باقة الطالب أولًا قبل تغيير مكان الإقامة إلى
        <strong>{{ data.targetResidentName }}</strong>
        لأن الباقة الحالية لا تناسب فئة الإقامة الجديدة.
      </p>

      <div class="summary-card">
        <div class="summary-row" *ngIf="data.currentPlanName">
          <span class="label">الباقة الحالية</span>
          <span class="value">{{ data.currentPlanName }}</span>
        </div>

        <div class="summary-row" *ngIf="data.currentGroupLabel">
          <span class="label">فئة الباقة الحالية</span>
          <span class="value">{{ data.currentGroupLabel }}</span>
        </div>

        <div class="summary-row" *ngIf="data.targetGroupLabel">
          <span class="label">الفئة المطلوبة بعد التعديل</span>
          <span class="value">{{ data.targetGroupLabel }}</span>
        </div>
      </div>

      <p class="hint">سيتم فتح نافذة اختيار الباقة المناسبة أولًا، ثم إرسال التعديلين معًا.</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="close(true)">
        تعديل الباقة
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dialog-content {
        direction: rtl;
        text-align: right;
      }

      .message,
      .hint {
        margin: 0;
        line-height: 1.7;
      }

      .summary-card {
        margin: 16px 0;
        padding: 12px 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
      }

      .summary-row + .summary-row {
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .label {
        color: rgba(255, 255, 255, 0.7);
      }

      .value {
        font-weight: 700;
      }

      .hint {
        color: rgba(255, 255, 255, 0.7);
      }
    `
  ]
})
export class ResidencySubscribeWarningDialogComponent {
  private dialogRef = inject(MatDialogRef<ResidencySubscribeWarningDialogComponent, boolean>);
  protected data = inject<ResidencySubscribeWarningDialogData>(MAT_DIALOG_DATA);

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
