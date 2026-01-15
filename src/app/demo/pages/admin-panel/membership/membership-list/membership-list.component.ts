// angular import
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  StudentSubscribeService,
  ViewStudentSubscribeReDto
} from 'src/app/@theme/services/student-subscribe.service';
import {
  FilteredResultRequestDto,
  LookupService,
  NationalityDto
} from 'src/app/@theme/services/lookup.service';
import { StudentPaymentService } from 'src/app/@theme/services/student-payment.service';
import { PaymentDetailsComponent } from '../payment-details/payment-details.component';
import { StudentSubscribeDialogComponent } from './student-subscribe-dialog/student-subscribe-dialog.component';
import { RESIDENCY_GROUP_OPTIONS, ResidencyGroupFilter } from 'src/app/@theme/types/residency-group';
import { isArabNationality, isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-membership-list',
  imports: [CommonModule, SharedModule, RouterModule, LoadingOverlayComponent],
  templateUrl: './membership-list.component.html',
  styleUrl: './membership-list.component.scss'
})
export class MembershipListComponent implements OnInit, OnDestroy {
  private service = inject(StudentSubscribeService);
  private lookupService = inject(LookupService);
  private paymentService = inject(StudentPaymentService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['name', 'mobile', 'date', 'status', 'plan', 'action'];
  dataSource = new MatTableDataSource<ViewStudentSubscribeReDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  nationalities: NationalityDto[] = [];
  selectedResidentId: number | null = null;
  residencyGroupOptions = RESIDENCY_GROUP_OPTIONS;
  selectedResidencyGroup: ResidencyGroupFilter = 'all';
  isLoading = false;
  isLoadingMore = false;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

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

  private loadNationalities(): void {
    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess && Array.isArray(res.data)) {
        this.nationalities = res.data;
      } else {
        this.nationalities = [];
      }
    });
  }

  private load(append = false) {
    this.filter.residentGroup = this.selectedResidencyGroup;
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.service
      .getStudents(this.filter, undefined, this.selectedResidentId ?? undefined)
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

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.load();
  }

  onResidencyChange(value: number | null): void {
    this.selectedResidentId = value && value > 0 ? value : null;
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.load();
  }

  onResidencyGroupChange(value: ResidencyGroupFilter | null): void {
    this.selectedResidencyGroup = value ?? 'all';
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
      { root: null, rootMargin: '200px' }
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

  openPaymentDetails(paymentId?: number) {
    if (!paymentId) {
      return;
    }
    this.paymentService.getPayment(paymentId).subscribe((res) => {
      if (res.isSuccess && res.data) {
        this.dialog.open(PaymentDetailsComponent, { data: res.data });
      }
    });
  }

  openSubscribeDialog(student: ViewStudentSubscribeReDto) {
    if (student.payStatus === true || student.isCancelled === true) {
      return;
    }
    const residentId = student.residentId ?? null;
    const residentGroup = this.resolveResidencyGroup(residentId);
    const dialogRef = this.dialog.open(StudentSubscribeDialogComponent, {
      data: {
        studentId: student.studentId,
        residentId,
        residentGroup
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.load();
      }
    });
  }

  private resolveResidencyGroup(residentId: number | null): ResidencyGroupFilter | null {
    if (!residentId || residentId <= 0) {
      return null;
    }
    const nationality = this.nationalities.find((item) => item.id === residentId);
    if (!nationality) {
      return null;
    }
    if (isEgyptianNationality(nationality)) {
      return 'egyptian';
    }
    if (isArabNationality(nationality)) {
      return 'arab';
    }
    return 'foreign';
  }
}
