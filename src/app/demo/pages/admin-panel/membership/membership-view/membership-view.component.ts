import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { StudentSubscribeService, ViewStudentSubscribeReDto } from 'src/app/@theme/services/student-subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import {
  StudentPaymentService,
  StudentPaymentDto,
  getCurrencyLabel
} from 'src/app/@theme/services/student-payment.service';


@Component({
  selector: 'app-membership-view',
  imports: [CommonModule, SharedModule, RouterModule, MatExpansionModule],
  templateUrl: './membership-view.component.html',
  styleUrl: './membership-view.component.scss'
})
export class MembershipViewComponent implements OnInit, OnDestroy {
  private service = inject(StudentSubscribeService);
  private route = inject(ActivatedRoute);
  private paymentService = inject(StudentPaymentService);
  private router = inject(Router);

  displayedColumns: string[] = ['expand', 'plan', 'remainingMinutes', 'startDate', 'status'];
  dataSource = new MatTableDataSource<ViewStudentSubscribeReDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  studentId = 0;
  isLoading = false;
  isLoadingMore = false;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  expandedElement: ViewStudentSubscribeReDto | null = null;
  paymentDetails: StudentPaymentDto | null = null;
  panelOpen = false;

  ngOnInit() {
    this.studentId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
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

  togglePaymentDetails(element: ViewStudentSubscribeReDto) {
    if (this.expandedElement === element) {
      this.expandedElement = null;
      this.paymentDetails = null;
      this.panelOpen = false;
      return;
    }
    this.expandedElement = element;
    this.panelOpen = true;
    const paymentId = element.studentPaymentId;
    if (paymentId == null) {
      this.paymentDetails = null;
      return;
    }
    this.paymentService.getPayment(paymentId).subscribe((res) => {
      if (res.isSuccess && res.data) {
        this.paymentDetails = res.data;
      } else {
        this.paymentDetails = null;
      }
    });
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
}
