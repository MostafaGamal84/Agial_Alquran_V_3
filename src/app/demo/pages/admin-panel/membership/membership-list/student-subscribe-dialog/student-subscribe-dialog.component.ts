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
  SubscribeTypeDto
} from 'src/app/@theme/services/subscribe.service';
import {
  StudentSubscribeService,
  AddStudentSubscribeDto
} from 'src/app/@theme/services/student-subscribe.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

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

  form = this.fb.group({
    subscribeTypeId: [null as number | null],
    subscribeId: [null as number | null, Validators.required]
  });

  types: SubscribeTypeDto[] = [];
  subscribes: SubscribeLookupDto[] = [];

  ngOnInit(): void {
    this.loadSubscribeTypes();
    this.loadSubscribes();

    this.form.get('subscribeTypeId')?.valueChanges.subscribe((typeId) => {
      this.form.patchValue({ subscribeId: null }, { emitEvent: false });
      this.loadSubscribes(typeId ?? null);
    });
  }

  private loadSubscribeTypes(): void {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };

    this.subscribeService.getAllTypes(filter).subscribe({
      next: (res) => {
        this.types = res.isSuccess && res.data?.items ? res.data.items : [];
      },
      error: () => {
        this.types = [];
      }
    });
  }

  submit(): void {
    const subscribeId = this.form.value.subscribeId;
    if (!subscribeId) {
      return;
    }

    const model: AddStudentSubscribeDto = {
      studentId: this.data?.studentId,
      studentSubscribeId: subscribeId
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

  private loadSubscribes(typeId: number | null = null): void {
    this.lookupService.getSubscribesByTypeId(typeId ?? undefined).subscribe({
      next: (lookupRes) => {
        const options = this.extractSubscriptionOptions(lookupRes);
        this.subscribes = options;
      },
      error: () => {
        this.subscribes = [];
      }
    });
  }

  private extractSubscriptionOptions(
    response: ApiResponse<SubscribeLookupDto[]>
  ): SubscribeLookupDto[] {
    const tryCoerceArray = (value: unknown): SubscribeLookupDto[] | null => {
      return Array.isArray(value) ? value : null;
    };

    const rawData = response?.data as unknown;
    const nestedData = (rawData as { data?: unknown })?.data;
    const rawResult = (rawData as { result?: unknown })?.result;
    const rawItems = (rawData as { items?: unknown })?.items;
    const responseResult = (response as unknown as { result?: unknown })?.result;
    const responseItems = (responseResult as { items?: unknown })?.items;

    return (
      tryCoerceArray(rawData) ||
      tryCoerceArray(nestedData) ||
      tryCoerceArray(rawResult) ||
      tryCoerceArray(rawItems) ||
      tryCoerceArray(responseResult) ||
      tryCoerceArray(responseItems) ||
      []
    );
  }
}
