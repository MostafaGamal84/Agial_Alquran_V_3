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
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  StudentInvoiceDto,
  StudentPaymentService
} from 'src/app/@theme/services/student-payment.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';

export interface InvoiceTableItem {
  id: number;
  name: string;
  create_date: string;
  due_date: string;
  qty: number;
  status: string;
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
  @Output() countChange = new EventEmitter<number>();
  private studentPaymentService = inject(StudentPaymentService);

  // public props
  displayedColumns: string[] = ['id', 'name', 'create_date', 'due_date', 'qty', 'status', 'action'];
  dataSource = new MatTableDataSource<InvoiceTableItem>([]);
  private searchTerm = '';
  // paginator
  readonly paginator = viewChild.required(MatPaginator); // if Angular ≥17

  readonly sort = viewChild(MatSort);

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tab'] || changes['month']) {
      this.loadData();
    }
  }

  // table search filter
  applyFilter(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.loadData();
  }

  loadData(): void {
    const filter: FilteredResultRequestDto = {
      skipCount: 0,
      maxResultCount: 100,
      searchTerm: this.searchTerm.trim()
    };
    let monthDate: Date | undefined;
    if (this.month) {
      monthDate = new Date(this.month + '-01');
    }
    this.studentPaymentService
      .getInvoices(filter, this.tab, undefined, undefined, undefined, undefined, undefined, monthDate)
      .subscribe((resp) => {
        const items: InvoiceTableItem[] = resp.data.items.map((item: StudentInvoiceDto) => ({
          id: item.invoiceId,
          name: item.userName ?? '',
          create_date: item.createDate ?? '',
          due_date: item.dueDate ?? '',
          qty: item.quantity ?? 0,
          status: (item.statusText ?? '').toLowerCase()
        }));
        this.dataSource.data = items;
        this.countChange.emit(resp.data.totalCount);
      });
  }

  loadData(): void {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    let monthDate: Date | undefined;
    if (this.month) {
      monthDate = new Date(this.month + '-01');
    }
    this.studentPaymentService
      .getInvoices(filter, this.tab, undefined, undefined, undefined, undefined, undefined, monthDate)
      .subscribe((resp) => {
        const items: InvoiceTableItem[] = resp.data.items.map((item: StudentInvoiceDto) => ({
          id: item.invoiceId,
          name: item.userName ?? '',
          create_date: item.createDate ?? '',
          due_date: item.dueDate ?? '',
          qty: item.quantity ?? 0,
          status: (item.statusText ?? '').toLowerCase()
        }));
        this.dataSource.data = items;
        this.countChange.emit(resp.data.totalCount);

      });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator()!;
    this.dataSource.sort = this.sort()!;
  }
}
