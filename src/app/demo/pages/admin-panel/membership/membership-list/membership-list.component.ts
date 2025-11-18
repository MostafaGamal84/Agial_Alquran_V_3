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

@Component({
  selector: 'app-membership-list',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './membership-list.component.html',
  styleUrl: './membership-list.component.scss'
})
export class MembershipListComponent implements AfterViewInit, OnInit {
  private service = inject(StudentSubscribeService);
  private lookupService = inject(LookupService);
  private paymentService = inject(StudentPaymentService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['name', 'mobile', 'date', 'status', 'plan', 'action'];
  dataSource = new MatTableDataSource<ViewStudentSubscribeReDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  nationalities: NationalityDto[] = [];
  selectedNationalityId: number | null = null;
  residencyGroupOptions = RESIDENCY_GROUP_OPTIONS;
  selectedResidencyGroup: ResidencyGroupFilter = 'all';

  // paginator
  readonly paginator = viewChild.required(MatPaginator); // if Angular ≥17

  ngOnInit() {
    this.loadNationalities();
    this.load();
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

  private load() {
    this.filter.residentGroup = this.selectedResidencyGroup;
    this.service.getStudents(this.filter, undefined, this.selectedNationalityId ?? undefined).subscribe((res) => {
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

  onNationalityChange(value: number | null): void {
    this.selectedNationalityId = value && value > 0 ? value : null;
    this.filter.skipCount = 0;
    this.paginator().firstPage();
    this.load();
  }

  onResidencyGroupChange(value: ResidencyGroupFilter | null): void {
    this.selectedResidencyGroup = value ?? 'all';
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

