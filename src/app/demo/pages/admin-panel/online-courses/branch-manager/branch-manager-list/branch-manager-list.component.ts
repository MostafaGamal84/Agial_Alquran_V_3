// angular import
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LookupService, LookUpUserDto, FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { UserService } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserEditComponent } from '../../user-edit/user-edit.component';
import { DisableUserConfirmDialogComponent } from '../../student/student-list/student-list.disable-user-confirm-dialog.component';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { BranchManagerDetailsComponent } from '../branch-manager-details/branch-manager-details.component';
import { UserBulkActionsComponent } from 'src/app/shared/user-bulk-actions/user-bulk-actions.component';

@Component({
  selector: 'app-branch-manager-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule, LoadingOverlayComponent, UserBulkActionsComponent],
  templateUrl: './branch-manager-list.component.html',
  styleUrl: './branch-manager-list.component.scss'
})
export class BranchManagerListComponent implements OnInit, OnDestroy {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  dialog = inject(MatDialog);
  isLoading = false;

  // public props
  readonly canCreateBranchManagers = true;
  readonly canEditBranchManagers = true;
  readonly canDisableBranchManagers = true;
  displayedColumns: string[] = this.canDisableBranchManagers
    ? ['select', 'serial', 'fullName', 'email', 'mobile', 'action']
    : ['serial', 'fullName', 'email', 'mobile', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  private pendingBranchManagerIds = new Set<number>();
  private selectedBranchManagerIds = new Set<number>();
  isBulkUpdating = false;
  isLoadingMore = false;
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
    this.loadBranchManagers();
  }

  ngOnInit() {
    this.loadBranchManagers();
  }

  getSerialNumber(index: number): number {
    return index + 1;
  }

  get selectedCount(): number {
    return this.selectedBranchManagerIds.size;
  }

  isSelected(branchManagerId: number): boolean {
    return this.selectedBranchManagerIds.has(branchManagerId);
  }

  clearSelection(): void {
    this.selectedBranchManagerIds.clear();
  }

  toggleSelection(branchManagerId: number, checked: boolean): void {
    if (checked) {
      this.selectedBranchManagerIds.add(branchManagerId);
      return;
    }

    this.selectedBranchManagerIds.delete(branchManagerId);
  }

  toggleSelectAllVisible(checked: boolean): void {
    this.getSelectableVisibleBranchManagers().forEach((branchManager) => this.toggleSelection(branchManager.id, checked));
  }

  isAllVisibleSelected(): boolean {
    const visibleBranchManagers = this.getSelectableVisibleBranchManagers();
    return (
      visibleBranchManagers.length > 0 &&
      visibleBranchManagers.every((branchManager) => this.selectedBranchManagerIds.has(branchManager.id))
    );
  }

  isSomeVisibleSelected(): boolean {
    const visibleBranchManagers = this.getSelectableVisibleBranchManagers();
    if (!visibleBranchManagers.length) {
      return false;
    }

    const selectedVisibleCount = visibleBranchManagers.filter((branchManager) =>
      this.selectedBranchManagerIds.has(branchManager.id)
    ).length;
    return selectedVisibleCount > 0 && selectedVisibleCount < visibleBranchManagers.length;
  }

  confirmBulkDisable(): void {
    if (!this.selectedCount || this.isBulkUpdating) {
      return;
    }

    const dialogRef = this.dialog.open(DisableUserConfirmDialogComponent, {
      data: {
        count: this.selectedCount,
        entityLabel: 'مدير فرع',
        title: 'إيقاف جماعي لمديري الفروع',
        actionLabel: 'إيقاف المحددين'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.disableSelectedBranchManagers();
      }
    });
  }


  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadBranchManagers(append = false) {
    if (!append) {
      this.clearSelection();
    }
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.BranchLeader),
        0,
        0,
        0
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

  openEditDialog(branchManager: LookUpUserDto): void {
    const dialogRef = this.dialog.open(UserEditComponent, {
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: { userId: branchManager.id, userType: 'branch-manager' }
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

  confirmDisable(branchManager: LookUpUserDto): void {

    if (this.isProcessing(branchManager.id)) {
      return;
    }

    const dialogRef = this.dialog.open(DisableUserConfirmDialogComponent, {
      data: { fullName: branchManager.fullName }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.disableBranchManager(branchManager);
      }
    });
  }

  isProcessing(branchManagerId: number): boolean {
    return this.pendingBranchManagerIds.has(branchManagerId);
  }

  private disableBranchManager(branchManager: LookUpUserDto): void {
    if (this.pendingBranchManagerIds.has(branchManager.id)) {
      return;
    }

    this.pendingBranchManagerIds.add(branchManager.id);

    this.userService
      .disableUser(branchManager.id, false)
      .pipe(finalize(() => this.pendingBranchManagerIds.delete(branchManager.id)))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.selectedBranchManagerIds.delete(branchManager.id);
            this.dataSource.data = this.dataSource.data.filter((manager) => manager.id !== branchManager.id);
            this.totalCount = Math.max(this.totalCount - 1, 0);
            this.toast.success(this.translate.instant('Branch manager disabled successfully'));
            return;
          }

          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          } else {
            this.toast.error(this.translate.instant('Failed to disable branch manager'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Failed to disable branch manager'))
      });
  }

  private disableSelectedBranchManagers(): void {
    const selectedIds = Array.from(this.selectedBranchManagerIds);
    if (!selectedIds.length) {
      return;
    }

    selectedIds.forEach((id) => this.pendingBranchManagerIds.add(id));
    this.isBulkUpdating = true;

    this.userService
      .disableUsers(selectedIds)
      .pipe(
        finalize(() => {
          selectedIds.forEach((id) => this.pendingBranchManagerIds.delete(id));
          this.isBulkUpdating = false;
        })
      )
      .subscribe({
        next: (res) => {
          if (!res.isSuccess) {
            if (res.errors?.length) {
              res.errors.forEach((error) => this.toast.error(error.message));
            } else {
              this.toast.error('تعذر إيقاف مديري الفروع المحددين');
            }
            return;
          }

          const disabledIds = res.data?.disabledUserIds ?? [];
          const skippedIds = res.data?.skippedUserIds ?? [];

          if (disabledIds.length) {
            const disabledIdSet = new Set(disabledIds);
            this.dataSource.data = this.dataSource.data.filter((manager) => !disabledIdSet.has(manager.id));
            disabledIds.forEach((id) => this.selectedBranchManagerIds.delete(id));
            this.totalCount = Math.max(this.totalCount - disabledIds.length, 0);
          }

          if (disabledIds.length && skippedIds.length) {
            this.toast.success(`تم إيقاف ${disabledIds.length} مدير فرع، وتعذر إيقاف ${skippedIds.length}.`);
          } else if (disabledIds.length) {
            this.toast.success(`تم إيقاف ${disabledIds.length} مدير فرع.`);
          } else {
            this.toast.error('لم يتم إيقاف أي مدير فرع من المحددين.');
          }
        },
        error: () => this.toast.error('تعذر إيقاف مديري الفروع المحددين')
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
    this.loadBranchManagers(true);
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

  private getSelectableVisibleBranchManagers(): LookUpUserDto[] {
    return this.dataSource.data.filter((branchManager) => !!branchManager?.id && !this.pendingBranchManagerIds.has(branchManager.id));
  }

  branchManagerDetails(manager: LookUpUserDto): void {
    const dialogRef = this.dialog.open(BranchManagerDetailsComponent, {
      width: '800px',
      maxWidth: '95vw'
    });

    this.lookupService.getUserDetails(manager.id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          dialogRef.componentInstance?.setData(res.data);
          return;
        }

        dialogRef.close();
        this.toast.error(this.translate.instant('Failed to load branch manager details'));
      },
      error: () => {
        dialogRef.close();
        this.toast.error(this.translate.instant('Failed to load branch manager details'));
      }
    });
  }
}
