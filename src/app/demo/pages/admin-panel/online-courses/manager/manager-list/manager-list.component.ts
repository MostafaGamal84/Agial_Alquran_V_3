// angular import
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';


// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto,
} from 'src/app/@theme/services/lookup.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { ManagerDetailsComponent } from '../manager-details/manager-details.component';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserEditComponent } from '../../user-edit/user-edit.component';
import { StatusLegendComponent, StatusLegendItem } from 'src/app/shared/status-legend/status-legend.component';
import { UserService } from 'src/app/@theme/services/user.service';
import { TranslateService } from '@ngx-translate/core';
import { DisableUserConfirmDialogComponent } from '../../student/student-list/student-list.disable-user-confirm-dialog.component';
import { UserBulkActionsComponent } from 'src/app/shared/user-bulk-actions/user-bulk-actions.component';
@Component({
  selector: 'app-manager-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule, LoadingOverlayComponent, StatusLegendComponent, UserBulkActionsComponent],
  templateUrl: './manager-list.component.html',
  styleUrl: './manager-list.component.scss'
})
export class ManagerListComponent implements OnInit, OnDestroy {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  dialog = inject(MatDialog);

  // public props
  readonly canCreateManagers = true;
  readonly canEditManagers = true;
  readonly canDisableManagers = true;
  displayedColumns: string[] = this.canDisableManagers
    ? ['select', 'serial', 'fullName', 'email', 'mobile', 'action']
    : ['serial', 'fullName', 'email', 'mobile', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  readonly statusLegendItems: StatusLegendItem[] = [
    {
      color: 'var(--warning-600, #d97706)',
      label: 'الاسم البرتقالي',
      description: 'المدير غير مكتمل الربط: ينقصه معلم أو طلاب أو حلقة مرتبطة به.'
    },
    {
      color: '#94a3b8',
      label: 'الاسم الطبيعي',
      description: 'ربط المدير مكتمل والمعطيات الأساسية موجودة.'
    }
  ];
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  isLoading = false;
  isLoadingMore = false;
  private pendingManagerIds = new Set<number>();
  private selectedManagerIds = new Set<number>();
  isBulkUpdating = false;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;


  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (!sort) {
      return;
    }

    this.dataSource.sort = sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      const value = item[property as keyof LookUpUserDto];
      if (value === null || value === undefined) {
        return '';
      }
      return typeof value === 'string' ? value.toLowerCase() : String(value);
    };
  }

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }


  // table search filter
  applyFilter(value: string) {
    this.filter.searchTerm = value.trim().toLowerCase() || undefined;
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadManagers();
  }

  ngOnInit() {
    this.loadManagers();
  }

  getSerialNumber(index: number): number {
    return index + 1;
  }

  get selectedCount(): number {
    return this.selectedManagerIds.size;
  }

  isSelected(managerId: number): boolean {
    return this.selectedManagerIds.has(managerId);
  }

  clearSelection(): void {
    this.selectedManagerIds.clear();
  }

  toggleSelection(managerId: number, checked: boolean): void {
    if (checked) {
      this.selectedManagerIds.add(managerId);
      return;
    }

    this.selectedManagerIds.delete(managerId);
  }

  toggleSelectAllVisible(checked: boolean): void {
    this.getSelectableVisibleManagers().forEach((manager) => this.toggleSelection(manager.id, checked));
  }

  isAllVisibleSelected(): boolean {
    const visibleManagers = this.getSelectableVisibleManagers();
    return visibleManagers.length > 0 && visibleManagers.every((manager) => this.selectedManagerIds.has(manager.id));
  }

  isSomeVisibleSelected(): boolean {
    const visibleManagers = this.getSelectableVisibleManagers();
    if (!visibleManagers.length) {
      return false;
    }

    const selectedVisibleCount = visibleManagers.filter((manager) => this.selectedManagerIds.has(manager.id)).length;
    return selectedVisibleCount > 0 && selectedVisibleCount < visibleManagers.length;
  }

  confirmBulkDisable(): void {
    if (!this.selectedCount || this.isBulkUpdating) {
      return;
    }

    const dialogRef = this.dialog.open(DisableUserConfirmDialogComponent, {
      data: {
        count: this.selectedCount,
        entityLabel: 'مدير',
        title: 'إيقاف جماعي للمديرين',
        actionLabel: 'إيقاف المحددين'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.disableSelectedManagers();
      }
    });
  }


  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadManagers(append = false) {
    if (!append) {
      this.clearSelection();
    }
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Manager),
        0,
        0,
        0,
        undefined,
        true
      )
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
        }
      });
  }


  openEditDialog(manager: LookUpUserDto): void {
    const dialogRef = this.dialog.open(UserEditComponent, {
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: { userId: manager.id, userType: 'manager' }
    });

    dialogRef.afterClosed().subscribe((updatedUser: LookUpUserDto | undefined) => {
      if (!updatedUser?.id) {
        return;
      }

      this.dataSource.data = this.dataSource.data.map((item) =>
        item.id === updatedUser.id ? { ...item, ...updatedUser } : item
      );
    });
  }

  managerDetails(manager: LookUpUserDto): void {
    this.lookupService.getUserDetails(manager.id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.dialog.open(ManagerDetailsComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: res.data
          });
          return;
        }
        this.toast.error('Failed to load manager details');
      },
      error: () => this.toast.error('Failed to load manager details')
    });
  }

  confirmDisable(manager: LookUpUserDto): void {
    if (this.isProcessing(manager.id)) {
      return;
    }

    const dialogRef = this.dialog.open(DisableUserConfirmDialogComponent, {
      data: { fullName: manager.fullName }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.disableManager(manager);
      }
    });
  }

  isProcessing(managerId: number): boolean {
    return this.pendingManagerIds.has(managerId);
  }

  private disableManager(manager: LookUpUserDto): void {
    if (this.pendingManagerIds.has(manager.id)) {
      return;
    }

    this.pendingManagerIds.add(manager.id);

    this.userService
      .disableUser(manager.id, false)
      .pipe(finalize(() => this.pendingManagerIds.delete(manager.id)))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.selectedManagerIds.delete(manager.id);
            this.dataSource.data = this.dataSource.data.filter((item) => item.id !== manager.id);
            this.totalCount = Math.max(this.totalCount - 1, 0);
            this.toast.success(this.translate.instant('Manager disabled successfully'));
            return;
          }

          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          } else {
            this.toast.error(this.translate.instant('Failed to disable manager'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Failed to disable manager'))
      });
  }

  private disableSelectedManagers(): void {
    const selectedIds = Array.from(this.selectedManagerIds);
    if (!selectedIds.length) {
      return;
    }

    selectedIds.forEach((id) => this.pendingManagerIds.add(id));
    this.isBulkUpdating = true;

    this.userService
      .disableUsers(selectedIds)
      .pipe(
        finalize(() => {
          selectedIds.forEach((id) => this.pendingManagerIds.delete(id));
          this.isBulkUpdating = false;
        })
      )
      .subscribe({
        next: (res) => {
          if (!res.isSuccess) {
            if (res.errors?.length) {
              res.errors.forEach((error) => this.toast.error(error.message));
            } else {
              this.toast.error('تعذر إيقاف المديرين المحددين');
            }
            return;
          }

          const disabledIds = res.data?.disabledUserIds ?? [];
          const skippedIds = res.data?.skippedUserIds ?? [];

          if (disabledIds.length) {
            const disabledIdSet = new Set(disabledIds);
            this.dataSource.data = this.dataSource.data.filter((manager) => !disabledIdSet.has(manager.id));
            disabledIds.forEach((id) => this.selectedManagerIds.delete(id));
            this.totalCount = Math.max(this.totalCount - disabledIds.length, 0);
          }

          if (disabledIds.length && skippedIds.length) {
            this.toast.success(`تم إيقاف ${disabledIds.length} مدير، وتعذر إيقاف ${skippedIds.length}.`);
          } else if (disabledIds.length) {
            this.toast.success(`تم إيقاف ${disabledIds.length} مدير.`);
          } else {
            this.toast.error('لم يتم إيقاف أي مدير من المحددين.');
          }
        },
        error: () => this.toast.error('تعذر إيقاف المديرين المحددين')
      });
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
    this.loadManagers(true);
  }

  buildWhatsAppLink(phone: string | null | undefined): string | undefined {
    const digits = String(phone ?? "").replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : undefined;
  }

  buildMailtoLink(email: string | null | undefined): string | undefined {
    const value = String(email ?? "").trim();
    return value ? `mailto:${value}` : undefined;
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }

  private getSelectableVisibleManagers(): LookUpUserDto[] {
    return this.dataSource.data.filter((manager) => !!manager?.id && !this.pendingManagerIds.has(manager.id));
  }

  hasMissingAssignments(manager: LookUpUserDto): boolean {
    const hasTeacher =
      typeof manager.teacherId === 'number' ||
      !!String(manager.teacherName ?? '').trim() ||
      (Array.isArray(manager.teachers) && manager.teachers.length > 0);
    const hasStudents = Array.isArray(manager.students) && manager.students.length > 0;
    const hasCircle =
      typeof manager.circleId === 'number' ||
      !!String(manager.circleName ?? '').trim() ||
      (Array.isArray(manager.managerCircles) && manager.managerCircles.length > 0);

    return !(hasTeacher && hasStudents && hasCircle);
  }
}
