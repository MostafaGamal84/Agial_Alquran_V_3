import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { PaginatorState } from 'primeng/paginator';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { SubscribeService, SubscribeDto } from 'src/app/@theme/services/subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-subscribe',
  imports: [SharedModule, RouterModule, LoadingOverlayComponent],
  templateUrl: './subscribe.component.html',
  styleUrl: './subscribe.component.scss'
})
export class SubscribeComponent implements OnInit {
  private service = inject(SubscribeService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  displayedColumns: string[] = ['name', 'minutes', 'type', 'action'];
  dataSource = new MatTableDataSource<SubscribeDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  isLoading = false;

  ngOnInit() {
    this.load();
  }

  private load() {
    this.isLoading = true;
    this.service
      .getAll(this.filter)
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
          this.toast.error(this.translate.instant('Error loading subscribes'));
        }
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.load();
  }

  onPageChange(event: PaginatorState): void {
    this.pageIndex = event.page ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;
    this.load();
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
}

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">{{ 'Delete subscribe' | translate }}</div>
    <div class="p-10">{{ 'Are you sure you want to delete this subscribe?' | translate }}</div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>{{ 'No' | translate }}</button>
      <button mat-button color="warn" [mat-dialog-close]="true">{{ 'Yes' | translate }}</button>
    </div>
  `,
  imports: [MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class DeleteConfirmDialogComponent {}
