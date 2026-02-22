import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatSelectChange } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

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
export class SubscribeTypeComponent implements OnInit, OnDestroy {
  private service = inject(SubscribeService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private lookupService = inject(LookupService);

  displayedColumns: string[] = ['name', 'group', 'hourPrice', 'action'];
  dataSource = new MatTableDataSource<SubscribeTypeDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  nationalities: NationalityDto[] = [];
  selectedResidentId: number | null = null;
  noResultsMessage: string | null = null;
  isLoading = false;
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
      if (property === 'name') {
        return (item.name ?? '').toLowerCase();
      }
      const value = item[property as keyof SubscribeTypeDto];
      return value === null || value === undefined
        ? ''
        : typeof value === 'string'
          ? value.toLowerCase()
          : Number(value);
    };
  }

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  ngOnInit() {
    this.loadNationalities();
    this.load();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private load(append = false) {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.noResultsMessage = null;

    this.service
      .getAllTypes(this.filter)
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

          if (!append) {
            if (this.dataSource.data.length === 0) {
              this.noResultsMessage = this.resolveNoResultsMessage();
            } else {
              this.noResultsMessage = null;
            }
          }
        },
        error: () => {
          if (!append) {
            this.dataSource.data = [];
          }
          this.totalCount = 0;
          if (!append) {
            this.noResultsMessage = this.translate.instant('Unable to load subscribe types.');
          }
          this.toast.error(this.translate.instant('Error loading subscribe types'));
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

  onResidencyChange(event: MatSelectChange) {
    const residentId = Number(event.value ?? 0);
    this.selectedResidentId = Number.isFinite(residentId) && residentId > 0 ? residentId : null;
    this.filter.residentId = this.selectedResidentId ?? undefined;
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.load();
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
    this.load(true);
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
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
  styles: [
    `
      :host {
        color: var(--accent-900);
      }

      :host-context(.dark) {
        color: rgba(255, 255, 255, 0.87);
      }
    `
  ],
  imports: [MatDialogActions, MatButton, MatDialogClose, TranslateModule]
})
export class DeleteConfirmDialogComponent {}
