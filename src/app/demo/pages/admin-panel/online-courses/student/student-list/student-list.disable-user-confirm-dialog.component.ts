import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DisableUserConfirmDialogData {
  fullName?: string;
  count?: number;
  entityLabel?: string;
  title?: string;
  actionLabel?: string;
}

@Component({
  selector: 'app-disable-user-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ titleText }}</h2>
    <mat-dialog-content>
      {{ messagePrefix }}
      <strong>{{ highlightedLabel }}</strong>
      {{ messageSuffix }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">إلغاء</button>
      <button mat-flat-button color="warn" type="button" (click)="onConfirm()">{{ confirmLabel }}</button>
    </mat-dialog-actions>
  `
})
export class DisableUserConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<DisableUserConfirmDialogComponent>);
  readonly data = inject<DisableUserConfirmDialogData>(MAT_DIALOG_DATA);

  get titleText(): string {
    return this.data.title || (this.data.count && this.data.count > 1 ? 'إيقاف جماعي' : 'إيقاف المستخدم');
  }

  get confirmLabel(): string {
    return this.data.actionLabel || (this.data.count && this.data.count > 1 ? 'إيقاف المحددين' : 'إيقاف');
  }

  get highlightedLabel(): string {
    if (this.data.count && this.data.count > 1) {
      const label = this.data.entityLabel || 'مستخدم';
      return `${this.data.count} ${label}`;
    }

    return this.data.fullName || `هذا ${this.data.entityLabel || 'المستخدم'}`;
  }

  get messagePrefix(): string {
    return 'هل أنت متأكد أنك تريد إيقاف ';
  }

  get messageSuffix(): string {
    return '؟';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
