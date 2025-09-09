import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { SubscribeService, SubscribeTypeDto } from 'src/app/@theme/services/subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

@Component({
  selector: 'app-subscribe-type',
  imports: [SharedModule, RouterModule],
  templateUrl: './subscribe-type.component.html',
  styleUrl: './subscribe-type.component.scss'
})
export class SubscribeTypeComponent implements OnInit, AfterViewInit {
  private service = inject(SubscribeService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  displayedColumns: string[] = ['name', 'arabPricePerHour', 'forignPricePerHour', 'action'];
  dataSource = new MatTableDataSource<SubscribeTypeDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  readonly paginator = viewChild.required(MatPaginator);

  ngOnInit() {
    this.load();
  }

  private load() {
    this.service.getAllTypes(this.filter).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        this.dataSource.data = res.data.items;
        this.totalCount = res.data.totalCount;
      } else {
        this.dataSource.data = [];
        this.totalCount = 0;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.filter.skipCount = 0;
    this.paginator().firstPage();
    this.load();
  }

  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.load();
    });
  }

  delete(id: number) {
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.service.deleteType(id).subscribe({
          next: () => {
            this.toast.success('Subscribe type deleted successfully');
            this.load();
          },
          error: () => this.toast.error('Error deleting subscribe type')
        });
      }
    });
  }
}

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">Delete subscribe type</div>
    <div class="p-10">Are you sure you want to delete this subscribe type?</div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>No</button>
      <button mat-button color="warn" [mat-dialog-close]="true">Yes</button>
    </div>
  `,
  imports: [MatDialogActions, MatButton, MatDialogClose]
})
export class DeleteConfirmDialogComponent {}
