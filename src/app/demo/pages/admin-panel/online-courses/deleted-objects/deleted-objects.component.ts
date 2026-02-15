import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { finalize } from 'rxjs/operators';
import { DeletedObjectsService } from 'src/app/@theme/services/deleted-objects.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { SharedModule } from 'src/app/demo/shared/shared.module';

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
  imports: [CommonModule, SharedModule],
  templateUrl: './deleted-objects.component.html',
  styleUrl: './deleted-objects.component.scss'
})
export class DeletedObjectsComponent implements OnInit, OnDestroy {
  private deletedObjectsService = inject(DeletedObjectsService);

  readonly pageSizeOptions = [10, 20, 50];
  activeTabIndex = 0;

  private readonly userColumns: DeletedColumn[] = [
    { key: 'fullName', label: 'الاسم الكامل' },
    { key: 'mobile', label: 'رقم الجوال' },
    { key: 'email', label: 'البريد الإلكتروني' },
  ];

  readonly tabs: DeletedTabConfig[] = [
    {
      key: 'students',
      label: 'الطلاب المحذوفون',
      columns: this.userColumns,
      columnKeys: this.userColumns.map((column) => column.key)
    },
    {
      key: 'teachers',
      label: 'المعلمون المحذوفون',
      columns: this.userColumns,
      columnKeys: this.userColumns.map((column) => column.key)
    },
    {
      key: 'managers',
      label: 'المديرون المحذوفون',
      columns: this.userColumns,
      columnKeys: this.userColumns.map((column) => column.key)
    },
    {
      key: 'branchLeaders',
      label: 'قادة الفروع المحذوفون',
      columns: this.userColumns,
      columnKeys: this.userColumns.map((column) => column.key)
    },
    {
      key: 'circles',
      label: 'الحلقات المحذوفة',
      columns: [
     
        { key: 'name', label: 'اسم الحلقة' },
        { key: 'teacher', label: 'المعلم' },
      ],
      columnKeys: ['id', 'name', 'teacher', 'branchId', 'daysSummary']
    },
    {
      key: 'circleReports',
      label: 'تقارير الحلقات المحذوفة',
      columns: [
        { key: 'id', label: 'المعرف' },
        { key: 'studentName', label: 'اسم الطالب' },
        { key: 'teacherName', label: 'اسم المعلم' },
        { key: 'circleName', label: 'اسم الحلقة' },
        { key: 'minutes', label: 'الدقائق' },
      ],
      columnKeys: ['id', 'studentName', 'teacherName', 'circleName', 'minutes', 'creationTime', 'other']
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

  ngOnInit(): void {
    this.loadActiveTab();
  }

  ngOnDestroy(): void {
    Object.values(this.searchDebounceTimers).forEach((timer) => timer && clearTimeout(timer));
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

    this.searchDebounceTimers[tab] = setTimeout(() => this.loadTab(tab, true), 400);
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
      return value.map((item) => String(item)).join('، ');
    }

    if (value === null || value === undefined || String(value).trim() === '') {
      return '—';
    }

    return String(value);
  }

  getPageStatus(tab: DeletedTabKey): string {
    const state = this.stateByTab[tab];
    if (state.totalCount === 0) {
      return 'لا توجد نتائج';
    }

    const start = state.page * state.pageSize + 1;
    const end = Math.min((state.page + 1) * state.pageSize, state.totalCount);
    return `${start} - ${end} من ${state.totalCount}`;
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
            state.error = 'تعذر تحميل البيانات';
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
