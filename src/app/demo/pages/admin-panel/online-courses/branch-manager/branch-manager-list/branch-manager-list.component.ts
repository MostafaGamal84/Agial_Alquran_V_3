// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { PaginatorState } from 'primeng/paginator';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LookupService, LookUpUserDto, FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { UserService } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { DisableUserConfirmDialogComponent } from '../../student/student-list/student-list.disable-user-confirm-dialog.component';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { BranchManagerDetailsComponent } from '../branch-manager-details/branch-manager-details.component';

@Component({
  selector: 'app-branch-manager-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule,LoadingOverlayComponent],
  templateUrl: './branch-manager-list.component.html',
  styleUrl: './branch-manager-list.component.scss'
})
export class BranchManagerListComponent implements OnInit {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  dialog = inject(MatDialog);
  isLoading = false;

  // public props
  displayedColumns: string[] = ['fullName', 'email', 'mobile', 'nationality', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  private pendingBranchManagerIds = new Set<number>();

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadBranchManagers();
  }

  ngOnInit() {
    this.loadBranchManagers();
  }

  private loadBranchManagers() {
    this.isLoading = true;
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.BranchLeader),
        0,
        0,
        0
      )
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            this.dataSource.data = res.data.items;
            this.totalCount = res.data.totalCount;
          } else {
            this.dataSource.data = [];
            this.totalCount = 0;
          }
        },
        error: () => {
          this.dataSource.data = [];
          this.totalCount = 0;
        }
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

  onPageChange(event: PaginatorState): void {
    this.pageIndex = event.page ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;
    this.loadBranchManagers();
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
