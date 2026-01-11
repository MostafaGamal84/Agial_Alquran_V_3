import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatSelectChange } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  SubscribeService,
  SubscribeTypeDto,
  getSubscribeTypeCategoryTranslationKey
} from 'src/app/@theme/services/subscribe.service';
import type { SubscribeTypeCategory } from 'src/app/@theme/services/subscribe.service';
import {
  FilteredResultRequestDto,
  LookupService,
  NationalityDto
} from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-subscribe-type',
  imports: [SharedModule, RouterModule, LoadingOverlayComponent],
  templateUrl: './subscribe-type.component.html',
  styleUrl: './subscribe-type.component.scss'
})
export class SubscribeTypeComponent implements OnInit, AfterViewInit {
  private service = inject(SubscribeService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private lookupService = inject(LookupService);

  displayedColumns: string[] = ['name', 'group', 'hourPrice', 'action'];
  dataSource = new MatTableDataSource<SubscribeTypeDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  nationalities: NationalityDto[] = [];
  selectedResidentId: number | null = null;
  noResultsMessage: string | null = null;
  isLoading = false;

  readonly paginator = viewChild.required(MatPaginator);

  ngOnInit() {
    this.loadNationalities();
    this.load();
  }

  private load() {
    this.isLoading = true;
    this.noResultsMessage = null;

    this.service.getAllTypes(this.filter).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data?.items) {
          this.dataSource.data = res.data.items;
          this.totalCount = res.data.totalCount;
        } else {
          this.dataSource.data = [];
          this.totalCount = 0;
        }

        if (this.dataSource.data.length === 0) {
          this.noResultsMessage = this.resolveNoResultsMessage();
        } else {
          this.noResultsMessage = null;
        }
      },
      error: () => {
        this.dataSource.data = [];
        this.totalCount = 0;
        this.noResultsMessage = this.translate.instant('Unable to load subscribe types.');
        this.toast.error(this.translate.instant('Error loading subscribe types'));
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
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

  onResidencyChange(event: MatSelectChange) {
    const residentId = Number(event.value ?? 0);
    this.selectedResidentId = Number.isFinite(residentId) && residentId > 0 ? residentId : null;
    this.filter.residentId = this.selectedResidentId ?? undefined;
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

  private loadNationalities(): void {
    this.lookupService.getAllNationalities().subscribe({
      next: (res) => {
        if (res.isSuccess && Array.isArray(res.data)) {
          this.nationalities = res.data;
        } else {
          this.nationalities = [];
        }
      },
      error: () => {
        this.nationalities = [];
      }
    });
  }

  private resolveNoResultsMessage(): string {
    if (this.filter.residentId) {
      return this.translate.instant('No subscribe types are available for the selected residency.');
    }

    if (this.filter.searchTerm) {
      return this.translate.instant('No subscribe types match your search criteria.');
    }

    return this.translate.instant('No subscribe types are currently available.');
  }

  delete(id: number) {
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.service.deleteType(id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('Subscribe type deleted successfully'));
            this.load();
          },
          error: () => this.toast.error(this.translate.instant('Error deleting subscribe type'))
        });
      }
    });
  }

  resolveCategoryLabel(group: SubscribeTypeCategory | null | undefined): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(group));
  }
}

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">{{ 'Delete subscribe type' | translate }}</div>
    <div class="p-10">{{ 'Are you sure you want to delete this subscribe type?' | translate }}</div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>{{ 'No' | translate }}</button>
      <button mat-button color="warn" [mat-dialog-close]="true">{{ 'Yes' | translate }}</button>
    </div>
  `,
  imports: [MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class DeleteConfirmDialogComponent {}
