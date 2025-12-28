// angular import
import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnInit,
  Output,
  EventEmitter,
  SimpleChanges,
  viewChild,
  inject
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, Observable } from 'rxjs';


// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  StudentInvoiceDto,
  StudentPaymentService
} from 'src/app/@theme/services/student-payment.service';
import { MatDialog } from '@angular/material/dialog';
import { PaymentDetailsComponent } from '../../../membership/payment-details/payment-details.component';
import { PaymentEditComponent } from '../../payment-edit/payment-edit.component';
import {
  ApiResponse,
  FilteredResultRequestDto,
  PagedResultDto
} from 'src/app/@theme/services/lookup.service';
import { ResidencyGroupFilter } from 'src/app/@theme/types/residency-group';

export interface InvoiceTableItem {
  id: number;
  name: string;
  create_date: string;
  due_date: string;
  qty: number;
  status: string;
  payStatue: boolean;
  isCancelled: boolean;
}

@Component({
  selector: 'app-invoice-list-table',
  imports: [SharedModule],
  templateUrl: './invoice-list-table.component.html',
  styleUrl: './invoice-list-table.component.scss'
})
export class InvoiceListTableComponent implements AfterViewInit, OnInit, OnChanges {
  @Input() tab?: string;
  @Input() month?: string;
  @Input() compareMonth?: string;
  @Input() search = '';
  @Input() nationalityId: number | null = null;
  @Input() residentGroup: ResidencyGroupFilter = 'all';
  @Input() refreshToken = 0;
  @Output() countChange = new EventEmitter<number>();
  @Output() paymentUpdated = new EventEmitter<void>();
  private studentPaymentService = inject(StudentPaymentService);
  private dialog = inject(MatDialog);

  // public props
  displayedColumns: string[] = ['id', 'name', 'create_date', 'due_date', 'qty', 'status', 'action'];
  dataSource = new MatTableDataSource<InvoiceTableItem>([]);
  searchTerm = '';
  totalCount = 0;
  pageIndex = 0;
  pageSize = 100;
  readonly sort = viewChild(MatSort);

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: InvoiceTableItem, filter: string): boolean => {
      const term = filter.trim().toLowerCase();
      return (
        data.id.toString().includes(term) ||
        data.name.toLowerCase().includes(term) ||
        data.create_date.toLowerCase().includes(term) ||
        data.due_date.toLowerCase().includes(term) ||
        data.qty.toString().includes(term) ||
        data.status.toLowerCase().includes(term)
      );
    };
    this.searchTerm = this.search;
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['tab'] ||
      changes['month'] ||
      changes['compareMonth'] ||
      changes['nationalityId'] ||
      changes['residentGroup'] ||
      changes['refreshToken']
    ) {
      this.pageIndex = 0;
      this.loadData();
    }
    if (changes['search'] && !changes['search'].firstChange) {
      this.searchTerm = this.search;
      this.dataSource.filter = this.searchTerm.trim().toLowerCase();
      this.countChange.emit(this.dataSource.filteredData.length);
    }
  }

  // table search filter
  applyFilter(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
    this.countChange.emit(this.dataSource.filteredData.length);
  }

  openPaymentDetails(id: number) {
    this.studentPaymentService.getPayment(id).subscribe((res) => {
      if (res.isSuccess && res.data) {
        this.dialog.open(PaymentDetailsComponent, { data: res.data });
      }
    });
  }

  openPaymentEdit(id: number) {
    this.studentPaymentService.getPayment(id).subscribe((res) => {
      if (res.isSuccess && res.data) {
        const dialogRef = this.dialog.open(PaymentEditComponent, { data: res.data });
        dialogRef.afterClosed().subscribe((updated) => {
          if (updated) {
            this.loadData();
            this.paymentUpdated.emit();
          }
        });
      }
    });
  }

  loadData(): void {
    const filter: FilteredResultRequestDto = {
      skipCount: this.pageIndex * this.pageSize,
      maxResultCount: this.pageSize,
      residentGroup: this.residentGroup
    };
    let monthDate: Date | undefined;
    let compareMonthDate: Date | undefined;
    if (this.month) {
      monthDate = new Date(this.month + '-01');
    }
    if (this.compareMonth) {
      compareMonthDate = new Date(this.compareMonth + '-01');
    }
    const mapItems = (
      resp: ApiResponse<PagedResultDto<StudentInvoiceDto>>
    ): InvoiceTableItem[] =>
      resp.data.items.map((item: StudentInvoiceDto) => ({
        id: item.invoiceId,
        name: item.userName ?? '',
        create_date: item.createDate ?? '',
        due_date: item.dueDate ?? '',
        qty: item.amount ?? 0,
        status: (item.statusText ?? '').toLowerCase(),
        payStatue: item.payStatue ?? false,
        isCancelled: item.isCancelled ?? false
      }));

    if (!this.tab || this.tab === 'all') {
      const requests: Observable<ApiResponse<PagedResultDto<StudentInvoiceDto>>>[] = [];
      if (monthDate) {
        requests.push(
          this.studentPaymentService.getInvoices(
            filter,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            monthDate,
            this.nationalityId ?? undefined
          )
        );
        requests.push(
          this.studentPaymentService.getInvoices(
            filter,
            'overdue',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            monthDate,
            this.nationalityId ?? undefined
          )
        );
      }
      if (compareMonthDate) {
        requests.push(
          this.studentPaymentService.getInvoices(
            filter,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            compareMonthDate,
            this.nationalityId ?? undefined
          )
        );
        requests.push(
          this.studentPaymentService.getInvoices(
            filter,
            'overdue',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            compareMonthDate,
            this.nationalityId ?? undefined
          )
        );
      }
      forkJoin(requests).subscribe((responses) => {
        this.totalCount = responses.reduce(
          (acc: number, resp: ApiResponse<PagedResultDto<StudentInvoiceDto>>) => acc + (resp.data.totalCount ?? 0),
          0
        );
        const items = responses.reduce(
          (acc: InvoiceTableItem[], resp: ApiResponse<PagedResultDto<StudentInvoiceDto>>) => [
            ...acc,
            ...mapItems(resp)
          ],
          []
        );
        this.dataSource.data = items;
        this.dataSource.filter = this.searchTerm.trim().toLowerCase();
        this.countChange.emit(this.totalCount || this.dataSource.filteredData.length);
      });
    } else {
      const requests: Observable<ApiResponse<PagedResultDto<StudentInvoiceDto>>>[] = [];
      if (monthDate) {
        requests.push(
          this.studentPaymentService.getInvoices(
            filter,
            this.tab,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            monthDate,
            this.nationalityId ?? undefined
          )
        );
      }
      if (compareMonthDate) {
        requests.push(
          this.studentPaymentService.getInvoices(
            filter,
            this.tab,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            compareMonthDate,
            this.nationalityId ?? undefined
          )
        );
      }
      forkJoin(requests).subscribe((responses) => {
        this.totalCount = responses.reduce(
          (acc: number, resp: ApiResponse<PagedResultDto<StudentInvoiceDto>>) => acc + (resp.data.totalCount ?? 0),
          0
        );
        const items = responses.reduce(
          (acc: InvoiceTableItem[], resp: ApiResponse<PagedResultDto<StudentInvoiceDto>>) => [
            ...acc,
            ...mapItems(resp)
          ],
          []
        );
        this.dataSource.data = items;
        this.dataSource.filter = this.searchTerm.trim().toLowerCase();
        this.countChange.emit(this.totalCount || this.dataSource.filteredData.length);
      });
    }
  }


  ngAfterViewInit() {
    this.dataSource.sort = this.sort()!;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }
}
