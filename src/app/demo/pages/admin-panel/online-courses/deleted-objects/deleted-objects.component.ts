import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { finalize } from 'rxjs/operators';
import { DeletedObjectsService } from 'src/app/@theme/services/deleted-objects.service';
import { ApiResponse, FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { Observable } from 'rxjs';

type DeletedTabKey = 'students' | 'teachers' | 'managers' | 'branchLeaders' | 'circles' | 'circleReports';

interface DeletedTabState {
  searchTerm: string;
  page: number;
  pageSize: number;
  totalCount: number;
  rows: Record<string, unknown>[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
}

interface DeletedTabConfig {
  key: DeletedTabKey;
  label: string;
  columns: string[];
}

@Component({
  selector: 'app-deleted-objects',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './deleted-objects.component.html',
  styleUrl: './deleted-objects.component.scss'
})
export class DeletedObjectsComponent implements OnInit, OnDestroy {
  private deletedObjectsService = inject(DeletedObjectsService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  readonly pageSizeOptions = [10, 20, 50, 100, 200, 500, 1000];
  activeTabIndex = 0;

  readonly tabs: DeletedTabConfig[] = [
    {
      key: 'students',
      label: 'الطلاب المحذوفين',
      columns: ['id', 'fullName', 'mobile', 'email', 'nationality', 'governorate', 'branchId', 'actions']
    },
    {
      key: 'teachers',
      label: 'المعلمين المحذوفين',
      columns: ['id', 'fullName', 'mobile', 'email', 'nationality', 'governorate', 'branchId', 'actions']
    },
    {
      key: 'managers',
      label: 'المشرفين المحذوفين',
      columns: ['id', 'fullName', 'mobile', 'email', 'nationality', 'governorate', 'branchId', 'actions']
    },
    {
      key: 'branchLeaders',
      label: ' مديرين الفروع المحذوفين',
      columns: ['id', 'fullName', 'mobile', 'email', 'nationality', 'governorate', 'branchId', 'actions']
    },
    {
      key: 'circles',
      label: 'الحلقات المحذوفة',
      columns: ['id', 'name', 'teacher', 'branchId', 'daysSummary', 'actions']
    },
    {
      key: 'circleReports',
      label: 'تقارير الحلقات المحذوفة',
      columns: ['id', 'studentName', 'teacherName', 'circleName', 'minutes', 'creationTime', 'other', 'actions']
    }
  ];

  stateByTab: Record<DeletedTabKey, DeletedTabState> = {
    students: this.createDefaultState(),
    teachers: this.createDefaultState(),
    managers: this.createDefaultState(),
    branchLeaders: this.createDefaultState(),
    circles: this.createDefaultState(),
    circleReports: this.createDefaultState()
  };

  private searchDebounceTimers: Partial<Record<DeletedTabKey, ReturnType<typeof setTimeout>>> = {};
  private pendingRestoreKeys = new Set<string>();

  ngOnInit(): void {
    this.loadActiveTab();
  }

  ngOnDestroy(): void {
    Object.values(this.searchDebounceTimers).forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }

  onTabChanged(event: MatTabChangeEvent): void {
    this.activeTabIndex = event.index;
    this.loadActiveTab();
  }

  onSearchChange(tab: DeletedTabKey, value: string): void {
    const state = this.stateByTab[tab];
    state.searchTerm = value;
    state.page = 0;

    const pendingTimer = this.searchDebounceTimers[tab];
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }

    this.searchDebounceTimers[tab] = setTimeout(() => {
      this.loadTab(tab, true);
    }, 400);
  }

  onPageSizeChange(tab: DeletedTabKey, pageSize: number): void {
    const state = this.stateByTab[tab];
    state.pageSize = pageSize;
    state.page = 0;
    this.loadTab(tab, true);
  }

  nextPage(tab: DeletedTabKey): void {
    const state = this.stateByTab[tab];
    if (!this.canGoToNextPage(tab)) {
      return;
    }

    state.page += 1;
    this.loadTab(tab, true);
  }

  prevPage(tab: DeletedTabKey): void {
    const state = this.stateByTab[tab];
    if (state.page === 0) {
      return;
    }

    state.page -= 1;
    this.loadTab(tab, true);
  }

  retry(tab: DeletedTabKey): void {
    this.loadTab(tab, true);
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
      return value.map((item) => String(item)).join(', ');
    }

    if (value === null || value === undefined || String(value).trim() === '') {
      return '—';
    }

    return String(value);
  }


  isRestoring(tab: DeletedTabKey, row: Record<string, unknown>): boolean {
    const id = this.getRowId(row);
    return id !== null && this.pendingRestoreKeys.has(this.getPendingRestoreKey(tab, id));
  }

  restoreRecord(tab: DeletedTabKey, row: Record<string, unknown>): void {
    const id = this.getRowId(row);
    if (id === null) {
      this.toast.error(this.translate.instant('Failed to restore record'));
      return;
    }

    const pendingKey = this.getPendingRestoreKey(tab, id);
    if (this.pendingRestoreKeys.has(pendingKey)) {
      return;
    }

    this.pendingRestoreKeys.add(pendingKey);
    this.getRestoreRequestByTab(tab, id)
      .pipe(finalize(() => this.pendingRestoreKeys.delete(pendingKey)))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            const state = this.stateByTab[tab];
            state.rows = state.rows.filter((item) => this.getRowId(item) !== id);
            state.totalCount = Math.max(state.totalCount - 1, 0);
            this.toast.success(this.translate.instant('Record restored successfully'));
            return;
          }

          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          } else {
            this.toast.error(this.translate.instant('Failed to restore record'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Failed to restore record'))
      });
  }

  getPageStatus(tab: DeletedTabKey): string {
    const state = this.stateByTab[tab];
    if (state.totalCount === 0) {
      return '0 / 0';
    }

    const start = state.page * state.pageSize + 1;
    const end = Math.min((state.page + 1) * state.pageSize, state.totalCount);
    return `${start}-${end} / ${state.totalCount}`;
  }

  canGoToNextPage(tab: DeletedTabKey): boolean {
    const state = this.stateByTab[tab];
    return (state.page + 1) * state.pageSize < state.totalCount;
  }

  private loadActiveTab(): void {
    const tab = this.tabs[this.activeTabIndex];
    if (!tab) {
      return;
    }

    this.loadTab(tab.key);
  }

  private loadTab(tab: DeletedTabKey, forceReload = false): void {
    const state = this.stateByTab[tab];

    if (!forceReload && state.hasLoaded) {
      return;
    }

    const params: FilteredResultRequestDto = {
      skipCount: state.page * state.pageSize,
      maxResultCount: state.pageSize,
      searchTerm: state.searchTerm || undefined
    };

    state.isLoading = true;
    state.error = null;

    this.getRequestByTab(tab, params)
      .pipe(finalize(() => (state.isLoading = false)))
      .subscribe({
        next: (res) => {
          if (!res.isSuccess || !res.data) {
            state.rows = [];
            state.totalCount = 0;
            state.error = 'Failed to load data';
            state.hasLoaded = true;
            return;
          }

          state.rows = Array.isArray(res.data.items) ? (res.data.items as Record<string, unknown>[]) : [];
          state.totalCount = Number(res.data.totalCount ?? 0);
          state.hasLoaded = true;
        },
        error: () => {
          state.rows = [];
          state.totalCount = 0;
          state.error = 'Failed to load data';
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


  private getRestoreRequestByTab(tab: DeletedTabKey, id: number): Observable<ApiResponse<boolean>> {
    switch (tab) {
      case 'students':
        return this.deletedObjectsService.restoreStudent(id);
      case 'teachers':
        return this.deletedObjectsService.restoreTeacher(id);
      case 'managers':
        return this.deletedObjectsService.restoreManager(id);
      case 'branchLeaders':
        return this.deletedObjectsService.restoreBranchLeader(id);
      case 'circles':
        return this.deletedObjectsService.restoreCircle(id);
      case 'circleReports':
        return this.deletedObjectsService.restoreCircleReport(id);
    }
  }

  private getRowId(row: Record<string, unknown>): number | null {
    const id = Number(row['id']);
    return Number.isFinite(id) ? id : null;
  }

  private getPendingRestoreKey(tab: DeletedTabKey, id: number): string {
    return `${tab}-${id}`;
  }

  private createDefaultState(): DeletedTabState {
    return {
      searchTerm: '',
      page: 0,
      pageSize: 10,
      totalCount: 0,
      rows: [],
      isLoading: false,
      error: null,
      hasLoaded: false
    };
  }
}
