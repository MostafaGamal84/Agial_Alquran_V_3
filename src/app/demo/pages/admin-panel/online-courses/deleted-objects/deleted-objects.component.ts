import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { DeletedObjectsService, DeletedTabKey } from 'src/app/@theme/services/deleted-objects.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { SharedModule } from 'src/app/demo/shared/shared.module';

interface DeletedTabState {
  searchTerm: string;
  page: number;
  pageSize: number;
  totalCount: number;
  rows: Record<string, unknown>[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasLoaded: boolean;
}

interface DeletedColumn {
  key: string;
  label: string;
}

interface DeletedTabConfig {
  key: DeletedTabKey;
  label: string;
  columns: DeletedColumn[];
  columnKeys: string[];
}

@Component({
  selector: 'app-deleted-objects',
  standalone: true,
  imports: [CommonModule, SharedModule, MatProgressSpinnerModule],
  templateUrl: './deleted-objects.component.html',
  styleUrl: './deleted-objects.component.scss'
})
export class DeletedObjectsComponent implements OnInit, OnDestroy {
  private deletedObjectsService = inject(DeletedObjectsService);
  private authenticationService = inject(AuthenticationService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  activeTabIndex = 0;

  private readonly userColumns: DeletedColumn[] = [
    { key: 'fullName', label: 'الاسم الكامل' },
    { key: 'mobile', label: 'رقم الجوال' },
    { key: 'email', label: 'البريد الإلكتروني' }
  ];

  private readonly allTabs: DeletedTabConfig[] = [
    {
      key: 'students',
      label: 'الطلاب المحذوفون',
      columns: this.userColumns,
      columnKeys: [...this.userColumns.map((column) => column.key), 'actions']
    },
    {
      key: 'teachers',
      label: 'المعلمون المحذوفون',
      columns: this.userColumns,
      columnKeys: [...this.userColumns.map((column) => column.key), 'actions']
    },
    {
      key: 'managers',
      label: 'المديرون المحذوفون',
      columns: this.userColumns,
      columnKeys: [...this.userColumns.map((column) => column.key), 'actions']
    },
    {
      key: 'branchLeaders',
      label: 'قادة الفروع المحذوفون',
      columns: this.userColumns,
      columnKeys: [...this.userColumns.map((column) => column.key), 'actions']
    },
    {
      key: 'circles',
      label: 'الحلقات المحذوفة',
      columns: [{ key: 'name', label: 'اسم الحلقة' }],
      columnKeys: ['name', 'actions']
    },
    {
      key: 'circleReports',
      label: 'تقارير الحلقات المحذوفة',
      columns: [
        { key: 'studentName', label: 'اسم الطالب' },
        { key: 'teacherName', label: 'اسم المعلم' },
        { key: 'circleName', label: 'اسم الحلقة' },
        { key: 'minutes', label: 'الدقائق' }
      ],
      columnKeys: ['studentName', 'teacherName', 'circleName', 'minutes', 'actions']
    }
  ];

  readonly tabs: DeletedTabConfig[] =
    this.authenticationService.getRole() === UserTypesEnum.BranchLeader
      ? this.allTabs.filter((tab) => tab.key === 'students')
      : this.allTabs;

  stateByTab: Record<DeletedTabKey, DeletedTabState> = {
    students: this.createDefaultState(),
    teachers: this.createDefaultState(),
    managers: this.createDefaultState(),
    branchLeaders: this.createDefaultState(),
    circles: this.createDefaultState(),
    circleReports: this.createDefaultState()
  };

  private searchDebounceTimers: Partial<Record<DeletedTabKey, ReturnType<typeof setTimeout>>> = {};
  private pendingRestoreIdsByTab: Partial<Record<DeletedTabKey, Set<number>>> = {};
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  private touchStartX: number | null = null;
  private readonly swipeThreshold = 50;

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  ngOnInit(): void {
    this.loadActiveTab();
  }

  ngOnDestroy(): void {
    Object.values(this.searchDebounceTimers).forEach((timer) => timer && clearTimeout(timer));
    this.intersectionObserver?.disconnect();
  }

  onTabChanged(event: MatTabChangeEvent): void {
    this.activeTabIndex = event.index;
    this.loadActiveTab();
  }


  onTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement | null;
    const isFromTabHeader = !!target?.closest('.mat-mdc-tab-header, .mat-tab-header');

    if (!isFromTabHeader || event.touches.length !== 1) {
      this.touchStartX = null;
      return;
    }

    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null || event.changedTouches.length !== 1) {
      this.touchStartX = null;
      return;
    }

    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - this.touchStartX;
    this.touchStartX = null;

    if (Math.abs(deltaX) < this.swipeThreshold) {
      return;
    }

    if (deltaX < 0) {
      this.navigateToTab(this.activeTabIndex + 1);
      return;
    }

    this.navigateToTab(this.activeTabIndex - 1);
  }

  onSearchChange(tab: DeletedTabKey, value: string): void {
    const state = this.stateByTab[tab];
    state.searchTerm = value;
    state.page = 0;

    const pendingTimer = this.searchDebounceTimers[tab];
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }

    this.searchDebounceTimers[tab] = setTimeout(() => this.loadTab(tab, true), 400);
  }

  retry(tab: DeletedTabKey): void {
    this.loadTab(tab, true);
  }

  onRestore(tab: DeletedTabKey, row: Record<string, unknown>): void {
    const id = Number(row['id']);
    if (!Number.isFinite(id) || id <= 0 || this.isRestoreLoading(tab, row)) {
      return;
    }

    const dialogRef = this.dialog.open(RestoreDeletedItemConfirmDialogComponent, {
      width: '420px',
      data: {
        title: this.translate.instant('استعادة العنصر'),
        message: this.translate.instant('هل أنت متأكد أنك تريد استعادة هذا العنصر؟'),
        confirmText: this.translate.instant('استعادة')
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.restoreDeletedItem(tab, id);
      }
    });
  }

  isRestoreLoading(tab: DeletedTabKey, row: Record<string, unknown>): boolean {
    const id = Number(row['id']);
    if (!Number.isFinite(id) || id <= 0) {
      return false;
    }

    return this.pendingRestoreIdsByTab[tab]?.has(id) ?? false;
  }

  hasMoreResults(tab: DeletedTabKey): boolean {
    const state = this.stateByTab[tab];
    return state.rows.length < state.totalCount;
  }

  buildWhatsAppLink(phone: string | null | undefined): string | undefined {
    const digits = String(phone ?? '').replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : undefined;
  }

  buildMailtoLink(email: string | null | undefined): string | undefined {
    const value = String(email ?? '').trim();
    return value && value !== '—' ? `mailto:${value}` : undefined;
  }

  getRowValue(row: Record<string, unknown>, column: string): string {
    const valueByColumn: Record<string, unknown> = {
      id: row['id'],
      fullName: row['fullName'] ?? row['name'],
      mobile: row['mobile'],
      email: row['email'],
      nationality: row['nationality'],
      governorate: row['governorate'],
      branchId: row['branchId'],
      name: row['name'],
      teacher: row['teacherName'] ?? row['teacher'] ?? row['teacherFullName'],
      daysSummary: row['dayNames'] ?? row['daysSummary'] ?? row['days'],
      studentName: row['studentName'] ?? row['student'],
      teacherName: row['teacherName'] ?? row['teacher'],
      circleName: row['circleName'] ?? row['circle'],
      minutes: row['minutes'],
      creationTime: row['creationTime'] ?? row['date'],
      other: row['other'] ?? row['notes']
    };

    const value = valueByColumn[column];

    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join('، ');
    }

    if (value === null || value === undefined || String(value).trim() === '') {
      return '—';
    }

    return String(value);
  }



  private navigateToTab(nextIndex: number): void {
    if (nextIndex < 0 || nextIndex >= this.tabs.length || nextIndex === this.activeTabIndex) {
      return;
    }

    this.activeTabIndex = nextIndex;
    this.loadActiveTab();
  }
  private loadActiveTab(): void {
    const tab = this.tabs[this.activeTabIndex];
    if (!tab) {
      return;
    }

    this.loadTab(tab.key);
  }

  private loadNextPage(tab: DeletedTabKey): void {
    const state = this.stateByTab[tab];

    if (state.isLoading || state.isLoadingMore || !this.hasMoreResults(tab)) {
      return;
    }

    state.page += 1;
    this.loadTab(tab, true, true);
  }

  private setupIntersectionObserver(): void {
    if (!this.loadMoreElement) {
      return;
    }

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        const tab = this.tabs[this.activeTabIndex];
        if (!tab) {
          return;
        }

        this.loadNextPage(tab.key);
      },
      { root: null, rootMargin: '0px 0px 20% 0px' }
    );

    this.intersectionObserver.observe(this.loadMoreElement.nativeElement);
  }

  private loadTab(tab: DeletedTabKey, forceReload = false, append = false): void {
    const state = this.stateByTab[tab];

    if (!forceReload && state.hasLoaded) {
      return;
    }

    const params: FilteredResultRequestDto = {
      skipCount: state.page * state.pageSize,
      maxResultCount: state.pageSize,
      searchTerm: state.searchTerm || undefined
    };

    state.isLoading = !append;
    state.isLoadingMore = append;
    state.error = null;

    this.getRequestByTab(tab, params)
      .pipe(
        finalize(() => {
          state.isLoading = false;
          state.isLoadingMore = false;
        })
      )
      .subscribe({
        next: (res) => {
          if (!res.isSuccess || !res.data) {
            if (!append) {
              state.rows = [];
              state.totalCount = 0;
            }
            state.error = 'تعذر تحميل البيانات';
            state.hasLoaded = true;
            return;
          }

          const nextRows = Array.isArray(res.data.items) ? (res.data.items as Record<string, unknown>[]) : [];
          state.rows = append ? [...state.rows, ...nextRows] : nextRows;
          state.totalCount = Number(res.data.totalCount ?? 0);
          state.hasLoaded = true;
        },
        error: () => {
          if (!append) {
            state.rows = [];
            state.totalCount = 0;
          }
          state.error = 'تعذر تحميل البيانات';
          state.hasLoaded = true;
        }
      });
  }

  private getRequestByTab(tab: DeletedTabKey, params: FilteredResultRequestDto) {
    switch (tab) {
      case 'students':
        return this.deletedObjectsService.getDeletedStudents(params);
      case 'teachers':
        return this.deletedObjectsService.getDeletedTeachers(params);
      case 'managers':
        return this.deletedObjectsService.getDeletedManagers(params);
      case 'branchLeaders':
        return this.deletedObjectsService.getDeletedBranchLeaders(params);
      case 'circles':
        return this.deletedObjectsService.getDeletedCircles(params);
      case 'circleReports':
        return this.deletedObjectsService.getDeletedCircleReports(params);
    }
  }

  private restoreDeletedItem(tab: DeletedTabKey, id: number): void {
    this.markRestoreLoading(tab, id, true);

    this.deletedObjectsService
      .restoreDeletedItem(tab, id)
      .pipe(finalize(() => this.markRestoreLoading(tab, id, false)))
      .subscribe({
        next: (res) => {
          if (res?.isSuccess && res?.data === true) {
            const state = this.stateByTab[tab];
            state.rows = state.rows.filter((row) => Number(row['id']) !== id);
            state.totalCount = Math.max(0, state.totalCount - 1);
            this.toast.success(this.translate.instant('Record restored successfully'));
            return;
          }

          const errorMessage = res?.errors?.[0]?.message || this.translate.instant('Failed to restore record');
          this.toast.error(errorMessage);
        },
        error: () => {
          this.toast.error(this.translate.instant('Server connection error while restoring item'));
        }
      });
  }

  private markRestoreLoading(tab: DeletedTabKey, id: number, isLoading: boolean): void {
    if (!this.pendingRestoreIdsByTab[tab]) {
      this.pendingRestoreIdsByTab[tab] = new Set<number>();
    }

    const pendingIds = this.pendingRestoreIdsByTab[tab] as Set<number>;
    if (isLoading) {
      pendingIds.add(id);
      return;
    }

    pendingIds.delete(id);
  }

  private createDefaultState(): DeletedTabState {
    return {
      searchTerm: '',
      page: 0,
      pageSize: 20,
      totalCount: 0,
      rows: [],
      isLoading: false,
      isLoadingMore: false,
      error: null,
      hasLoaded: false
    };
  }
}

interface RestoreDeletedItemConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
}

@Component({
  selector: 'app-restore-deleted-item-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      {{ data.message }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">{{ 'تراجع' }}</button>
      <button mat-flat-button color="primary" type="button" (click)="onConfirm()">{{ data.confirmText }}</button>
    </mat-dialog-actions>
  `
})
class RestoreDeletedItemConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<RestoreDeletedItemConfirmDialogComponent>);
  readonly data = inject<RestoreDeletedItemConfirmDialogData>(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
