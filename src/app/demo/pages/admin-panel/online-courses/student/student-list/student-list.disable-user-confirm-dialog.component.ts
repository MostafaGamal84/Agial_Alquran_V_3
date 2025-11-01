import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DisableUserConfirmDialogData {
  fullName: string;
}

@Component({
  selector: 'app-disable-user-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Disable user</h2>
    <mat-dialog-content>
      Are you sure you want to disable <strong>{{ data.fullName }}</strong>?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="warn" type="button" (click)="onConfirm()">Disable</button>
    </mat-dialog-actions>
  `
})
export class DisableUserConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<DisableUserConfirmDialogComponent>);
  readonly data = inject<DisableUserConfirmDialogData>(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
