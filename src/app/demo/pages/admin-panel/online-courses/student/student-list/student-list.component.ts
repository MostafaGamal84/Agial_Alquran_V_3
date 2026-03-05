import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto,
  NationalityDto
} from 'src/app/@theme/services/lookup.service';
import { UserService } from 'src/app/@theme/services/user.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { StudentDetailsComponent } from '../student-details/student-details.component';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { DisableUserConfirmDialogComponent } from './student-list.disable-user-confirm-dialog.component';
import { RESIDENCY_GROUP_OPTIONS, ResidencyGroupFilter } from 'src/app/@theme/types/residency-group';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { TranslateService } from '@ngx-translate/core';
import { getUserManagers } from 'src/app/demo/shared/utils/user-managers';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ViewStateService } from 'src/app/@theme/services/view-state.service';

type StudentListViewState = {
  searchTerm: string;
  selectedResidentId: number | null;
  selectedResidencyGroup: ResidencyGroupFilter;
  showMissingAssignmentsOnly: boolean;
  pageIndex: number;
  pageSize: number;
  filter: FilteredResultRequestDto;
  allLoadedStudents: LookUpUserDto[];
  totalCount: number;
  scrollY: number;
  sortActive: string;
  sortDirection: 'asc' | 'desc' | '';
};

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule, LoadingOverlayComponent],
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.scss'
})
export class StudentListComponent implements OnInit, OnDestroy {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private auth = inject(AuthenticationService);
  private viewState = inject(ViewStateService);
  private router = inject(Router);
  dialog = inject(MatDialog);

  private readonly stateKey = 'online-course-student-list';
  private restoredSortActive = '';
  private restoredSortDirection: 'asc' | 'desc' | '' = '';
  private readonly refreshFlagKey = 'refreshStudentList';

  displayedColumns: string[] = ['serial', 'fullName', 'email', 'mobile', 'action'];

  dataSource = new MatTableDataSource<LookUpUserDto>();
  allLoadedStudents: LookUpUserDto[] = [];
  showMissingAssignmentsOnly = false;

  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 40 };
  pageIndex = 0;
  pageSize = 40;

  showInactive = false;
  readonly isTeacher = this.auth.getRole() === UserTypesEnum.Teacher;
  searchTerm = '';

  nationalities: NationalityDto[] = [];
  selectedResidentId: number | null = null;

  residencyGroupOptions = RESIDENCY_GROUP_OPTIONS;
  selectedResidencyGroup: ResidencyGroupFilter = 'all';

  private pendingStudentIds = new Set<number>();

  isLoading = false;
  isLoadingMore = false;
  private readonly pagePrefetchCount = 3;
  private prefetchPagesRemaining = 0;

  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (!sort) return;

    this.dataSource.sort = sort;

    // accessor
    this.dataSource.sortingDataAccessor = (item, property) => {
      const value = item[property as keyof LookUpUserDto];
      if (value === null || value === undefined) return '';
      return typeof value === 'string' ? value : String(value);
    };

    // Arabic + English sort
    this.dataSource.sortData = (data, matSort) => {
      if (!matSort.active || matSort.direction === '') return data;

      const collator = new Intl.Collator(['ar', 'en'], {
        sensitivity: 'base',
        numeric: true
      });

      const isAsc = matSort.direction === 'asc';
      return [...data].sort((a, b) => {
        const valueA = this.dataSource.sortingDataAccessor(a, matSort.active);
        const valueB = this.dataSource.sortingDataAccessor(b, matSort.active);
        return (isAsc ? 1 : -1) * collator.compare(String(valueA), String(valueB));
      });
    };

    if (this.restoredSortActive) {
      sort.active = this.restoredSortActive;
      sort.direction = this.restoredSortDirection;
      sort.sortChange.emit({ active: sort.active, direction: sort.direction });
    }

    this.applyDisplayData();
  }

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  ngOnInit() {
    const restored = this.restoreState();
    const shouldRefreshFromServer = this.consumeRefreshFlag();
    this.loadNationalities();

    if (!restored) {
      this.loadStudents();
      return;
    }

    this.applyDisplayData();

    if (shouldRefreshFromServer) {
      this.reloadRestoredView(restored.scrollY ?? 0);
      return;
    }

    this.restoreScrollPosition(restored.scrollY ?? 0);
  }

  ngOnDestroy(): void {
    this.persistState();
    this.intersectionObserver?.disconnect();
  }

  // Search (server-side like your original)
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchTerm = filterValue;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadStudents();
  }

  onMissingAssignmentsOnlyChange(checked: boolean): void {
    this.showMissingAssignmentsOnly = checked;
    this.applyDisplayData();
  }

  getSerialNumber(index: number): number {
    return index + 1;
  }

  private loadNationalities(): void {
    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess && Array.isArray(res.data)) {
        this.nationalities = res.data;
      } else {
        this.nationalities = [];
      }
    });
  }

  private loadStudents(append = false) {
    this.filter.residentGroup = this.selectedResidencyGroup;
    if (!append) {
      this.prefetchPagesRemaining = 0;
    }
    this.isLoading = !append;
    this.isLoadingMore = append;

    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Student),
        0,
        0,
        0,
        this.selectedResidentId ?? undefined,
        true
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.tryPrefetchNextPage();
        })
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            this.allLoadedStudents = append
              ? [...this.allLoadedStudents, ...res.data.items]
              : res.data.items;

            this.totalCount = res.data.totalCount;
            this.applyDisplayData();

            if (!append) {
              this.startAutoPrefetch();
            }
          } else {
            if (!append) {
              this.allLoadedStudents = [];
              this.applyDisplayData();
            }
            this.totalCount = 0;
          }
        },
        error: () => {
          if (!append) {
            this.allLoadedStudents = [];
            this.applyDisplayData();
          }
          this.totalCount = 0;
        }
      });
  }

  onResidencyChange(value: number | null): void {
    this.selectedResidentId = value && value > 0 ? value : null;
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadStudents();
  }

  onResidencyGroupChange(value: ResidencyGroupFilter | null): void {
    this.selectedResidencyGroup = value ?? 'all';
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadStudents();
  }

  studentDetails(student: LookUpUserDto): void {
    this.lookupService.getUserDetails(student.id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.dialog.open(StudentDetailsComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: res.data
          });
          return;
        }
        this.toast.error(this.translate.instant('Failed to load student details'));
      },
      error: () => this.toast.error(this.translate.instant('Failed to load student details'))
    });
  }

  confirmDisable(student: LookUpUserDto): void {
    if (this.isProcessing(student.id)) return;

    const dialogRef = this.dialog.open(DisableUserConfirmDialogComponent, {
      data: { fullName: student.fullName }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.changeStatus(student, false);
      }
    });
  }

  isProcessing(studentId: number): boolean {
    return this.pendingStudentIds.has(studentId);
  }

  changeStatus(student: LookUpUserDto, statue: boolean): void {
    if (this.pendingStudentIds.has(student.id)) return;

    this.pendingStudentIds.add(student.id);

    this.userService
      .disableUser(student.id, statue)
      .pipe(finalize(() => this.pendingStudentIds.delete(student.id)))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            if (statue) {
              student.inactive = false;
              this.toast.success(this.translate.instant('User restored successfully'));
            } else {
              this.allLoadedStudents = this.allLoadedStudents.filter((s) => s.id !== student.id);
              this.applyDisplayData();
              this.totalCount = Math.max(this.totalCount - 1, 0);
              this.toast.success(this.translate.instant('User disabled successfully'));
            }
            return;
          }

          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          } else {
            this.toast.error(this.translate.instant('Failed to update user status'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Failed to update user status'))
      });
  }

  private setupIntersectionObserver(): void {
    if (!this.loadMoreElement) return;

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.startAutoPrefetch();
        }
      },
      { root: null, rootMargin: '0px 0px 20% 0px' }
    );

    this.intersectionObserver.observe(this.loadMoreElement.nativeElement);
  }

  private loadNextPage(): void {
    if (this.isLoading || this.isLoadingMore) return;
    if (!this.hasMoreResults()) return;

    this.pageIndex += 1;
    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;
    this.loadStudents(true);
  }

  private startAutoPrefetch(): void {
    if (this.isLoading || this.isLoadingMore) return;
    if (!this.hasMoreResults()) return;
    this.prefetchPagesRemaining = this.pagePrefetchCount;
    this.tryPrefetchNextPage();
  }

  private tryPrefetchNextPage(): void {
    if (this.prefetchPagesRemaining <= 0) return;
    if (this.isLoading || this.isLoadingMore) return;
    if (!this.hasMoreResults()) {
      this.prefetchPagesRemaining = 0;
      return;
    }

    this.prefetchPagesRemaining -= 1;
    this.loadNextPage();
  }

  buildWhatsAppLink(phone: string | null | undefined): string | undefined {
    const digits = String(phone ?? '').replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : undefined;
  }

  buildMailtoLink(email: string | null | undefined): string | undefined {
    const value = String(email ?? '').trim();
    return value ? `mailto:${value}` : undefined;
  }

  hasMoreResults(): boolean {
    return this.allLoadedStudents.length < this.totalCount;
  }

  private applyDisplayData(): void {
    const filtered = this.showMissingAssignmentsOnly
      ? this.allLoadedStudents.filter((s) => this.hasMissingAssignments(s))
      : this.allLoadedStudents;

    this.dataSource.data = [...filtered];

    // keep current sort applied after data changes (append/filter)
    if (this.dataSource.sort) {
      this.dataSource.data = this.dataSource.sortData(this.dataSource.data, this.dataSource.sort);
    }
  }

  hasMissingAssignments(student: LookUpUserDto): boolean {
    const hasManager = getUserManagers(student).length > 0;
    const hasTeacher = typeof student.teacherId === 'number' || !!String(student.teacherName ?? '').trim();
    const hasCircle = typeof student.circleId === 'number' || !!String(student.circleName ?? '').trim();
    return !(hasManager && hasTeacher && hasCircle);
  }


  private restoreScrollPosition(scrollY: number): void {
    const targetScrollY = Math.max(0, Number(scrollY) || 0);
    if (!targetScrollY) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const maxAttempts = 6;
    const attemptRestore = (attempt: number) => {
      const maxScrollableY = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      const nextY = Math.min(targetScrollY, Math.max(maxScrollableY, 0));
      window.scrollTo({ top: nextY, behavior: 'auto' });

      if (attempt >= maxAttempts || maxScrollableY >= targetScrollY) {
        return;
      }

      setTimeout(() => attemptRestore(attempt + 1), 120);
    };

    setTimeout(() => attemptRestore(1), 0);
  }

  private consumeRefreshFlag(): boolean {
    const currentNavigation = this.router.getCurrentNavigation();
    const navigationState = currentNavigation?.extras.state as Record<string, unknown> | undefined;
    const historyState = history.state as Record<string, unknown> | undefined;

    return !!(navigationState?.[this.refreshFlagKey] || historyState?.[this.refreshFlagKey]);
  }

  private reloadRestoredView(scrollY: number): void {
    const pagesToLoad = Math.max(this.pageIndex + 1, 1);
    const requests = Array.from({ length: pagesToLoad }, (_, index) => {
      const pagedFilter: FilteredResultRequestDto = {
        ...this.filter,
        skipCount: index * this.pageSize,
        maxResultCount: this.pageSize,
        residentGroup: this.selectedResidencyGroup
      };

      return this.lookupService
        .getUsersForSelects(
          pagedFilter,
          Number(UserTypesEnum.Student),
          0,
          0,
          0,
          this.selectedResidentId ?? undefined,
          true
        )
        .pipe(catchError(() => of(null)));
    });

    this.isLoading = true;
    this.isLoadingMore = false;

    forkJoin(requests)
      .pipe(
        map((responses) => {
          const validResponses = responses.filter((res) => !!res && res.isSuccess && !!res.data?.items);

          if (!validResponses.length) {
            return { items: [] as LookUpUserDto[], totalCount: 0 };
          }

          const mergedItems = validResponses.flatMap((res) => res!.data!.items);
          const totalCount = validResponses[0]!.data!.totalCount ?? mergedItems.length;

          return { items: mergedItems, totalCount };
        }),
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.restoreScrollPosition(scrollY);
        })
      )
      .subscribe(({ items, totalCount }) => {
        this.allLoadedStudents = items;
        this.totalCount = totalCount;
        this.filter.skipCount = this.pageIndex * this.pageSize;
        this.filter.maxResultCount = this.pageSize;
        this.applyDisplayData();
      });
  }

  private restoreState(): StudentListViewState | null {
    const state = this.viewState.getState<StudentListViewState>(this.stateKey);

    if (!state) return null;

    this.searchTerm = state.searchTerm ?? '';
    this.selectedResidentId = state.selectedResidentId ?? null;
    this.selectedResidencyGroup = state.selectedResidencyGroup ?? 'all';
    this.showMissingAssignmentsOnly = !!state.showMissingAssignmentsOnly;
    this.pageIndex = Number.isInteger(state.pageIndex) ? state.pageIndex : 0;
    this.pageSize = Number.isInteger(state.pageSize) ? state.pageSize : 40;

    this.filter = {
      ...state.filter,
      skipCount: this.pageIndex * this.pageSize,
      maxResultCount: this.pageSize,
      searchTerm: state.filter?.searchTerm ?? this.searchTerm.trim().toLowerCase()
    };

    this.allLoadedStudents = Array.isArray(state.allLoadedStudents) ? state.allLoadedStudents : [];
    this.totalCount = Number.isFinite(state.totalCount) ? state.totalCount : this.allLoadedStudents.length;
    this.restoredSortActive = state.sortActive ?? '';
    this.restoredSortDirection = state.sortDirection ?? '';

    return state;
  }

  private persistState(): void {
    this.viewState.saveState<StudentListViewState>(this.stateKey, {
      searchTerm: this.searchTerm,
      selectedResidentId: this.selectedResidentId,
      selectedResidencyGroup: this.selectedResidencyGroup,
      showMissingAssignmentsOnly: this.showMissingAssignmentsOnly,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      filter: this.filter,
      allLoadedStudents: this.allLoadedStudents,
      totalCount: this.totalCount,
      scrollY: window.scrollY,
      sortActive: this.dataSource.sort?.active ?? '',
      sortDirection: this.dataSource.sort?.direction ?? ''
    });
  }
}
