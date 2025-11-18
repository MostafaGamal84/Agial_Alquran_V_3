import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import {
  ApiResponse,
  FilteredResultRequestDto,
  LookupService,
  NationalityDto,
  SubscribeLookupDto
} from 'src/app/@theme/services/lookup.service';
import {
  SubscribeService,
  SubscribeTypeCategory,
  SubscribeTypeDto
} from 'src/app/@theme/services/subscribe.service';
import {
  StudentSubscribeService,
  AddStudentSubscribeDto
} from 'src/app/@theme/services/student-subscribe.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { isArabNationality, isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';

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
  private data = inject<{ studentId: number; residentId?: number | null }>(MAT_DIALOG_DATA);

  form = this.fb.group({
    subscribeTypeId: [null as number | null],
    subscribeId: [null as number | null, Validators.required]
  });

  types: SubscribeTypeDto[] = [];
  subscribes: SubscribeLookupDto[] = [];
  private typeCategoryFilter: SubscribeTypeCategory | null = null;

  ngOnInit(): void {
    this.prepareResidencyFilter();

    this.form.get('subscribeTypeId')?.valueChanges.subscribe((typeId) => {
      this.form.patchValue({ subscribeId: null }, { emitEvent: false });
      this.loadSubscribes(typeId ?? null);
    });
  }

  private prepareResidencyFilter(): void {
    const residentId = this.data?.residentId ?? null;
    if (!residentId) {
      this.loadSubscribeTypes();
      return;
    }

    this.lookupService
      .getAllNationalities()
      .pipe(finalize(() => this.loadSubscribeTypes()))
      .subscribe({
        next: (res) => {
          const nationalities = res.isSuccess && Array.isArray(res.data) ? res.data : [];
          this.typeCategoryFilter = this.resolveTypeCategory(nationalities, residentId);
        },
        error: () => {
          this.typeCategoryFilter = null;
        }
      });
  }

  private loadSubscribeTypes(): void {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };

    this.subscribeService.getAllTypes(filter).subscribe({
      next: (res) => {
        const fetchedTypes = res.isSuccess && res.data?.items ? res.data.items : [];
        this.types = this.applyResidencyFilterToTypes(fetchedTypes);
        const selectedTypeId = this.resolveDefaultSubscribeTypeSelection();
        this.loadSubscribes(selectedTypeId);
      },
      error: () => {
        this.types = [];
        this.form.patchValue({ subscribeTypeId: null }, { emitEvent: false });
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

  private loadSubscribes(typeId: number | null = null): void {
    if (this.typeCategoryFilter && (typeId === null || typeId === undefined)) {
      this.subscribes = [];
      return;
    }
    const studentId = this.data?.studentId ?? null;
    this.lookupService.getSubscribesByTypeId(typeId ?? undefined, studentId ?? undefined).subscribe({
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

  private resolveTypeCategory(
    nationalities: NationalityDto[],
    residentId: number
  ): SubscribeTypeCategory | null {
    const nationality = nationalities.find((item) => item.id === residentId);
    if (!nationality) {
      return null;
    }
    if (isEgyptianNationality(nationality)) {
      return SubscribeTypeCategory.Egyptian;
    }
    if (isArabNationality(nationality)) {
      return SubscribeTypeCategory.Arab;
    }
    return SubscribeTypeCategory.Foreign;
  }

  private applyResidencyFilterToTypes(types: SubscribeTypeDto[]): SubscribeTypeDto[] {
    if (!this.typeCategoryFilter) {
      return types;
    }
    return types.filter((type) => {
      if (type.group === null || type.group === undefined) {
        return true;
      }
      return type.group === this.typeCategoryFilter;
    });
  }

  private resolveDefaultSubscribeTypeSelection(): number | null {
    const currentTypeId = this.form.value.subscribeTypeId;
    const hasCurrentSelection =
      currentTypeId !== null && currentTypeId !== undefined && this.types.some((type) => type.id === currentTypeId);

    if (hasCurrentSelection) {
      return currentTypeId as number;
    }

    if (!this.typeCategoryFilter || this.types.length === 0) {
      if (currentTypeId !== null) {
        this.form.patchValue({ subscribeTypeId: null }, { emitEvent: false });
      }
      return null;
    }

    const fallbackType = this.types[0]?.id ?? null;
    this.form.patchValue({ subscribeTypeId: fallbackType }, { emitEvent: false });
    return fallbackType;
  }
}
