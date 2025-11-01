import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FilteredResultRequestDto, LookupService, LookupDto } from 'src/app/@theme/services/lookup.service';
import {
  SubscribeService,
  SubscribeTypeDto,
  getSubscribeTypeCategoryTranslationKey
} from 'src/app/@theme/services/subscribe.service';
import { StudentSubscribeService, AddStudentSubscribeDto } from 'src/app/@theme/services/student-subscribe.service';
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
  subscribes: LookupDto[] = [];

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

  resolveCategoryLabel(type: SubscribeTypeDto['type']): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(type));
  }
}
