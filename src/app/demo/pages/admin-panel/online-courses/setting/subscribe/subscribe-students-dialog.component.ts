import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { SubscribeDto, SubscribeTypeCategory, getSubscribeTypeCategoryTranslationKey } from 'src/app/@theme/services/subscribe.service';
import { StudentSubscribeService, ViewStudentSubscribeReDto } from 'src/app/@theme/services/student-subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { TranslateService } from '@ngx-translate/core';

export interface SubscribeStudentsDialogData {
  subscribe: SubscribeDto;
  initialCount?: number;
}

@Component({
  selector: 'app-subscribe-students-dialog',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, LoadingOverlayComponent, MatDialogClose],
  templateUrl: './subscribe-students-dialog.component.html',
  styleUrl: './subscribe-students-dialog.component.scss'
})
export class SubscribeStudentsDialogComponent implements OnInit {
  private studentSubscribeService = inject(StudentSubscribeService);
  private translate = inject(TranslateService);

  readonly displayedColumns = ['studentName', 'studentMobile', 'remainingMinutes', 'startDate', 'payStatus', 'actions'];
  readonly pageSize = 25;

  rows: ViewStudentSubscribeReDto[] = [];
  totalCount = 0;
  isLoading = false;
  isLoadingMore = false;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: this.pageSize };

  constructor(@Inject(MAT_DIALOG_DATA) public data: SubscribeStudentsDialogData) {
    this.totalCount = data.initialCount ?? 0;
  }

  ngOnInit(): void {
    this.load();
  }

  applyFilter(value: string): void {
    this.filter.searchTerm = value.trim() || undefined;
    this.filter.skipCount = 0;
    this.load();
  }

  loadMore(): void {
    if (this.isLoading || this.isLoadingMore || !this.hasMoreResults()) {
      return;
    }

    this.filter.skipCount = this.rows.length;
    this.load(true);
  }

  hasMoreResults(): boolean {
    return this.rows.length < this.totalCount;
  }

  resolveCategoryLabel(group: SubscribeTypeCategory | null | undefined): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(group));
  }

  resolvePayStatusLabel(value: boolean | null | undefined): string {
    if (value === true) {
      return 'مدفوع';
    }

    if (value === false) {
      return 'غير مدفوع';
    }

    return 'غير محدد';
  }

  private load(append = false): void {
    this.isLoading = !append;
    this.isLoadingMore = append;

    this.studentSubscribeService
      .getActiveStudentsBySubscribe(this.filter, this.data.subscribe.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe({
        next: (response) => {
          const items = response.isSuccess ? response.data?.items ?? [] : [];
          this.rows = append ? [...this.rows, ...items] : items;
          this.totalCount = response.isSuccess ? response.data?.totalCount ?? items.length : 0;
        },
        error: () => {
          if (!append) {
            this.rows = [];
            this.totalCount = 0;
          }
        }
      });
  }
}
