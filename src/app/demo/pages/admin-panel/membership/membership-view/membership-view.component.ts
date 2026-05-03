import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  StudentSubscribeHistoryReDto,
  StudentSubscribeService,
  ViewStudentSubscribeReDto
} from 'src/app/@theme/services/student-subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import {
  StudentPaymentService,
  StudentPaymentDto,
  getCurrencyLabel
} from 'src/app/@theme/services/student-payment.service';

@Component({
  selector: 'app-membership-view',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './membership-view.component.html',
  styleUrl: './membership-view.component.scss'
})
export class MembershipViewComponent implements OnInit, OnDestroy {
  private service = inject(StudentSubscribeService);
  private route = inject(ActivatedRoute);
  private paymentService = inject(StudentPaymentService);
  private router = inject(Router);

  displayedColumns: string[] = ['expand', 'plan', 'remainingMinutes', 'startDate', 'status'];
  readonly detailColumns: string[] = ['detail'];
  dataSource = new MatTableDataSource<ViewStudentSubscribeReDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  historyFilter: FilteredResultRequestDto = {
    skipCount: 0,
    maxResultCount: 50,
    sortBy: 'CreatedAt',
    sortingDirection: 'DESC'
  };
  pageIndex = 0;
  pageSize = 10;
  studentId = 0;
  isLoading = false;
  isLoadingMore = false;
  isHistoryLoading = false;
  historyItems: StudentSubscribeHistoryReDto[] = [];
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (!sort) {
      return;
    }

    this.dataSource.sort = sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'status':
          return item.payStatus === true ? 1 : item.payStatus === false ? 0 : -1;
        case 'startDate':
          return item.startDate ? new Date(item.startDate).getTime() : 0;
        default: {
          const value = item[property as keyof ViewStudentSubscribeReDto];
          return value === null || value === undefined
            ? ''
            : typeof value === 'string'
              ? value.toLowerCase()
              : Number(value);
        }
      }
    };
  }

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  expandedElement: ViewStudentSubscribeReDto | null = null;
  paymentDetails: StudentPaymentDto | null = null;
  isPaymentLoading = false;

  ngOnInit() {
    this.studentId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private load(append = false) {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.service
      .getStudentSubscribesWithPayment(this.filter, this.studentId)
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
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: () => {
          if (!append) {
            this.dataSource.data = [];
          }
          this.totalCount = 0;
          this.isLoading = false;
          this.isLoadingMore = false;
        }
      });
  }

  private loadHistory() {
    this.isHistoryLoading = true;
    this.service.getStudentSubscribeHistory(this.historyFilter, this.studentId).subscribe({
      next: (res) => {
        this.historyItems = res.isSuccess && res.data?.items ? res.data.items : [];
        this.isHistoryLoading = false;
      },
      error: () => {
        this.historyItems = [];
        this.isHistoryLoading = false;
      }
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
    this.load(true);
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }

  togglePaymentDetails(element: ViewStudentSubscribeReDto) {
    if (this.expandedElement === element) {
      this.expandedElement = null;
      this.paymentDetails = null;
      this.isPaymentLoading = false;
      return;
    }
    this.expandedElement = element;
    this.paymentDetails = null;
    const paymentId = element.studentPaymentId;
    if (paymentId == null) {
      this.isPaymentLoading = false;
      this.paymentDetails = null;
      return;
    }
    this.isPaymentLoading = true;
    this.paymentService.getPayment(paymentId).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.paymentDetails = res.data;
        } else {
          this.paymentDetails = null;
        }
        this.isPaymentLoading = false;
      },
      error: () => {
        this.paymentDetails = null;
        this.isPaymentLoading = false;
      }
    });
  }

  isExpanded(element: ViewStudentSubscribeReDto): boolean {
    return this.expandedElement === element;
  }

  goToInvoice(invoiceId?: number | null) {
    if (invoiceId == null) {
      return;
    }
    this.router.navigate(['/invoice/list'], { queryParams: { search: invoiceId } });
  }

  getCurrencyLabel(currencyId?: number | null): string {
    return getCurrencyLabel(currencyId);
  }

  getHistoryActionLabel(actionType?: string | null): string {
    switch (actionType) {
      case 'Created':
        return 'إنشاء اشتراك';
      case 'ResidenceChanged':
        return 'تعديل باقة بسبب تغيير الإقامة';
      default:
        return 'تعديل باقة';
    }
  }

  getPaymentStatusLabel(status?: boolean | null): string {
    if (status === true) {
      return 'مدفوع';
    }

    if (status === false) {
      return 'غير مدفوع';
    }

    return 'غير محدد';
  }

  formatHistoryAmount(amount?: number | null, currencyId?: number | null): string {
    if (amount === null || amount === undefined) {
      return 'غير محدد';
    }

    const currencyLabel = this.getCurrencyLabel(currencyId);
    return currencyLabel ? `${amount} ${currencyLabel}` : `${amount}`;
  }

  getSubscriptionMonthLabel(startDate?: string | null): string {
    if (!startDate) {
      return 'الشهر المحدد';
    }

    return new Intl.DateTimeFormat('ar-EG', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(startDate));
  }
}
