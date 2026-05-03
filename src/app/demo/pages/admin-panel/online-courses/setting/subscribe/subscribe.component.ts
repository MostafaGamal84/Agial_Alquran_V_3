import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  SubscribeService,
  SubscribeDto,
  SubscribeTypeCategory,
  getSubscribeTypeCategoryTranslationKey
} from 'src/app/@theme/services/subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { StudentSubscribeService } from 'src/app/@theme/services/student-subscribe.service';
import { SubscribeStudentsDialogComponent } from './subscribe-students-dialog.component';

@Component({
  selector: 'app-subscribe',
  imports: [SharedModule, RouterModule, LoadingOverlayComponent],
  templateUrl: './subscribe.component.html',
  styleUrl: './subscribe.component.scss'
})
export class SubscribeComponent implements OnInit, OnDestroy {
  private service = inject(SubscribeService);
  private studentSubscribeService = inject(StudentSubscribeService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  displayedColumns: string[] = ['name', 'minutes', 'price', 'type', 'students', 'action'];
  dataSource = new MatTableDataSource<SubscribeDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  isLoading = false;
  isLoadingMore = false;
  readonly studentCounts = new Map<number, number>();
  private readonly loadingStudentCounts = new Set<number>();
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (!sort) {
      return;
    }

    this.dataSource.sort = sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      if (property === 'type') {
        return (item.subscribeType?.name ?? '').toLowerCase();
      }
      const value = item[property as keyof SubscribeDto];
      return value === null || value === undefined
        ? ''
        : typeof value === 'string'
          ? value.toLowerCase()
          : Number(value);
    };
  }

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  ngOnInit() {
    this.load();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private load(append = false) {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.service
      .getAll(this.filter)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            this.dataSource.data = append
              ? [...this.dataSource.data, ...res.data.items]
              : res.data.items;
            this.totalCount = res.data.totalCount;
            this.loadStudentCounts(res.data.items);
          } else {
            if (!append) {
              this.dataSource.data = [];
            }
            this.totalCount = 0;
          }
        },
        error: () => {
          if (!append) {
            this.dataSource.data = [];
          }
          this.totalCount = 0;
          this.toast.error(this.translate.instant('Error loading subscribes'));
        }
      });
  }

  applyFilter(value: string) {
    this.filter.searchTerm = value.trim().toLowerCase() || undefined;
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.load();
  }

  private setupIntersectionObserver(): void {
    if (!this.loadMoreElement) {
      return;
    }

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadNextPage();
        }
      },
      { root: null, rootMargin: '0px 0px 20% 0px' }
    );
    this.intersectionObserver.observe(this.loadMoreElement.nativeElement);
  }

  private loadNextPage(): void {
    if (this.isLoading || this.isLoadingMore) {
      return;
    }

    if (!this.hasMoreResults()) {
      return;
    }

    this.pageIndex += 1;
    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;
    this.load(true);
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }

  getStudentCount(subscribeId: number): number | null {
    return this.studentCounts.get(subscribeId) ?? null;
  }

  isStudentCountLoading(subscribeId: number): boolean {
    return this.loadingStudentCounts.has(subscribeId);
  }

  resolveCategoryLabel(group: SubscribeTypeCategory | null | undefined): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(group));
  }

  openStudentsDialog(subscribe: SubscribeDto): void {
    this.dialog.open(SubscribeStudentsDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      data: {
        subscribe,
        initialCount: this.getStudentCount(subscribe.id) ?? 0
      }
    });
  }

  delete(id: number) {
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.service.delete(id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('Subscribe deleted successfully'));
            this.load();
          },
          error: () => this.toast.error(this.translate.instant('Error deleting subscribe'))
        });
      }
    });
  }

  private loadStudentCounts(subscribes: SubscribeDto[]): void {
    const subscribesToLoad = subscribes.filter(
      (subscribe) =>
        !!subscribe.id &&
        !this.studentCounts.has(subscribe.id) &&
        !this.loadingStudentCounts.has(subscribe.id)
    );

    if (subscribesToLoad.length === 0) {
      return;
    }

    subscribesToLoad.forEach((subscribe) => this.loadingStudentCounts.add(subscribe.id));

    forkJoin(
      subscribesToLoad.map((subscribe) =>
        this.studentSubscribeService.getActiveStudentsBySubscribe({ skipCount: 0, maxResultCount: 1 }, subscribe.id).pipe(
          map((response) => ({
            subscribeId: subscribe.id,
            count: response.isSuccess ? response.data?.totalCount ?? 0 : 0
          })),
          catchError(() =>
            of({
              subscribeId: subscribe.id,
              count: 0
            })
          )
        )
      )
    ).subscribe((results) => {
      results.forEach((result) => {
        this.studentCounts.set(result.subscribeId, result.count);
        this.loadingStudentCounts.delete(result.subscribeId);
      });
    });
  }
}

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">{{ ' حذف الاشتراك'  }}</div>
    <div class="p-10">{{ 'هل أنت متأكد من رغبتك في حذف هذا الاشتراك؟' }}</div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>{{ 'لا' }}</button>
      <button mat-button color="warn" [mat-dialog-close]="true">{{ 'نعم' }}</button>
    </div>
  `,
  styles: [
    `
      :host {
        color: var(--accent-900);
      }

      :host-context(.dark) {
        color: rgba(255, 255, 255, 0.87);
      }
    `
  ],
  imports: [MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class DeleteConfirmDialogComponent {}
