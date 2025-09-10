// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { StudentSubscribeService, ViewStudentSubscribeReDto } from 'src/app/@theme/services/student-subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { StudentPaymentService } from 'src/app/@theme/services/student-payment.service';
import { PaymentDetailsComponent } from '../payment-details/payment-details.component';

@Component({
  selector: 'app-membership-list',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './membership-list.component.html',
  styleUrl: './membership-list.component.scss'
})
export class MembershipListComponent implements AfterViewInit, OnInit {
  private service = inject(StudentSubscribeService);
  private paymentService = inject(StudentPaymentService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['name', 'mobile', 'date', 'status', 'plan', 'action'];
  dataSource = new MatTableDataSource<ViewStudentSubscribeReDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  // paginator
  readonly paginator = viewChild.required(MatPaginator); // if Angular ≥17

  ngOnInit() {
    this.load();
  }

  private load() {
    this.service.getStudents(this.filter).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        this.dataSource.data = res.data.items;
        this.totalCount = res.data.totalCount;
      } else {
        this.dataSource.data = [];
        this.totalCount = 0;
      }
    });
  }

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.filter.skipCount = 0;
    this.paginator().firstPage();
    this.load();
  }

  // life cycle event
  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.load();
    });
  }

  openPaymentDetails(paymentId?: number) {
    if (!paymentId) {
      return;
    }
    this.paymentService.getPayment(paymentId).subscribe((res) => {
      const payment = res.data?.items[0];
      if (res.isSuccess && payment) {
        this.dialog.open(PaymentDetailsComponent, { data: payment });
      }
    });
  }
}

