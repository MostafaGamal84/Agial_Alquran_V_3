import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { PaginatorState } from 'primeng/paginator';
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
export class MembershipViewComponent implements OnInit {
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

  expandedElement: ViewStudentSubscribeReDto | null = null;
  paymentDetails: StudentPaymentDto | null = null;
  panelOpen = false;

  ngOnInit() {
    this.studentId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  private load() {
    this.service
      .getStudentSubscribesWithPayment(this.filter, this.studentId)
      .subscribe((res) => {
        if (res.isSuccess && res.data?.items) {
          this.dataSource.data = res.data.items;
          this.totalCount = res.data.totalCount;
        } else {
          this.dataSource.data = [];
          this.totalCount = 0;
        }
      });
  }

  onPageChange(event: PaginatorState): void {
    this.pageIndex = event.page ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;
    this.load();
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
