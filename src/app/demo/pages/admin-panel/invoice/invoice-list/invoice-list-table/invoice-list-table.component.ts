// angular import
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  viewChild,
  inject
} from '@angular/core';
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

type InvoiceStatusKey = 'paid' | 'unpaid' | 'overdue' | 'cancelled';

interface InvoiceStatusCounts {
  paid: number;
  unpaid: number;
  overdue: number;
  cancelled: number;
}

export interface InvoiceTableItem {
  id: number;
  studentId: number;
  name: string;
  create_date: string;
  due_date: string;
  qty: number;
  status: string;
  payStatue: boolean;
  isCancelled: boolean;
  invoiceCount: number;
  invoiceIds: number[];
  statusCounts: InvoiceStatusCounts;
  childInvoices: InvoiceTableItem[];
}

const EMPTY_STATUS_COUNTS = (): InvoiceStatusCounts => ({
  paid: 0,
  unpaid: 0,
  overdue: 0,
  cancelled: 0
});

const STATUS_PRIORITY: Record<InvoiceStatusKey, number> = {
  overdue: 4,
  unpaid: 3,
  cancelled: 2,
  paid: 1
};

@Component({
  selector: 'app-invoice-list-table',
  imports: [SharedModule],
  templateUrl: './invoice-list-table.component.html',
  styleUrl: './invoice-list-table.component.scss'
})
export class InvoiceListTableComponent implements AfterViewInit, OnInit, OnChanges, OnDestroy {
  @Input() tab?: string;
  @Input() month?: string;
  @Input() compareMonth?: string;
  @Input() search = '';
  @Input() residentId: number | null = null;
  @Input() residentGroup: ResidencyGroupFilter = 'all';
  @Input() refreshToken = 0;
  @Output() countChange = new EventEmitter<number>();
  @Output() paymentUpdated = new EventEmitter<void>();
  private studentPaymentService = inject(StudentPaymentService);
  private dialog = inject(MatDialog);

  // public props
  displayedColumns: string[] = ['index', 'name', 'create_date', 'due_date', 'qty', 'status', 'action'];
  dataSource = new MatTableDataSource<InvoiceTableItem>([]);
  searchTerm = '';
  totalCount = 0;
  pageIndex = 0;
  pageSize = 100;
  readonly sort = viewChild(MatSort);
  isLoading = false;
  isLoadingMore = false;
  expandedRowId: number | null = null;
  private loadedItems: InvoiceTableItem[] = [];
  private loadedSourceCount = 0;
  private sourceTotalCount = 0;
  private hasTriggeredInitialLoad = false;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: InvoiceTableItem, filter: string): boolean => {
      const term = filter.trim().toLowerCase();
      return this.buildFilterText(data).includes(term);
    };
    this.searchTerm = this.search;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const shouldReloadData =
      changes['tab'] ||
      changes['month'] ||
      changes['compareMonth'] ||
      changes['residentId'] ||
      changes['residentGroup'] ||
      changes['refreshToken'];

    if (shouldReloadData) {
      this.pageIndex = 0;
      this.loadData();
      this.hasTriggeredInitialLoad = true;
    } else if (!this.hasTriggeredInitialLoad) {
      this.loadData();
      this.hasTriggeredInitialLoad = true;
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
        const dialogRef = this.dialog.open(PaymentDetailsComponent, { data: res.data });
        dialogRef.afterClosed().subscribe((updated) => {
          if (updated) {
            this.loadData();
            this.paymentUpdated.emit();
          }
        });
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

  loadData(append = false): void {
    this.isLoading = !append;
    this.isLoadingMore = append;
    if (!append) {
      this.expandedRowId = null;
    }
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
        studentId: item.studentId ?? 0,
        name: item.userName ?? '',
        create_date: item.createDate ?? '',
        due_date: item.dueDate ?? '',
        qty: item.amount ?? 0,
        status: this.normalizeStatus(item.statusText) ?? '',
        payStatue: item.payStatue ?? false,
        isCancelled: item.isCancelled ?? false,
        invoiceCount: 1,
        invoiceIds: [item.invoiceId],
        statusCounts: this.createStatusCounts(this.normalizeStatus(item.statusText)),
        childInvoices: []
      }));

    if (this.isAllTab()) {
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
            this.residentId ?? undefined
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
            this.residentId ?? undefined
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
            this.residentId ?? undefined
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
            this.residentId ?? undefined
          )
        );
      }
      forkJoin(requests).subscribe({
        next: (responses) => {
          this.sourceTotalCount = responses.reduce(
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
          this.loadedItems = this.mergeLoadedItems(items, append);
          this.loadedSourceCount = this.loadedItems.length;
          this.dataSource.data = this.groupInvoicesByStudent(this.loadedItems);
          this.syncExpandedRow();
          this.totalCount = this.dataSource.data.length;
          this.dataSource.filter = this.searchTerm.trim().toLowerCase();
          this.countChange.emit(this.dataSource.filteredData.length);
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: () => {
          if (!append) {
            this.loadedItems = [];
            this.dataSource.data = [];
          }
          this.loadedSourceCount = 0;
          this.sourceTotalCount = 0;
          this.totalCount = 0;
          this.isLoading = false;
          this.isLoadingMore = false;
        }
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
            this.residentId ?? undefined
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
            this.residentId ?? undefined
          )
        );
      }
      forkJoin(requests).subscribe({
        next: (responses) => {
          this.sourceTotalCount = responses.reduce(
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
          this.loadedItems = this.mergeLoadedItems(items, append);
          this.loadedSourceCount = this.loadedItems.length;
          this.dataSource.data = [...this.loadedItems];
          this.syncExpandedRow();
          this.totalCount = this.dataSource.data.length;
          this.dataSource.filter = this.searchTerm.trim().toLowerCase();
          this.countChange.emit(this.dataSource.filteredData.length);
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: () => {
          if (!append) {
            this.loadedItems = [];
            this.dataSource.data = [];
          }
          this.loadedSourceCount = 0;
          this.sourceTotalCount = 0;
          this.totalCount = 0;
          this.isLoading = false;
          this.isLoadingMore = false;
        }
      });
    }
  }


  ngAfterViewInit() {
    this.dataSource.sort = this.sort()!;
    this.dataSource.sortingDataAccessor = (item: InvoiceTableItem, property: string): string | number => {
      switch (property) {
        case 'index':
          return item.id;
        case 'name':
          return item.name.toLowerCase();
        case 'create_date':
          return this.getDateTimestamp(item.create_date);
        case 'due_date':
          return this.getDateTimestamp(item.due_date);
        case 'qty':
          return item.qty;
        case 'status':
          return this.getStatusPriority(item.status);
        default:
          return '';
      }
    };
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
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
    this.loadData(true);
  }

  hasMoreResults(): boolean {
    return this.loadedSourceCount < this.sourceTotalCount;
  }

  getRowIndex(index: number): number {
    return index + 1;
  }

  getChildRowIndex(index: number): number {
    return index + 1;
  }

  toggleExpandedRow(item: InvoiceTableItem): void {
    if (!this.isExpandableRow(item)) {
      return;
    }

    this.expandedRowId = this.isExpanded(item) ? null : item.id;
  }

  isExpanded(item: InvoiceTableItem): boolean {
    return this.expandedRowId === item.id;
  }

  isExpandableRow(item: InvoiceTableItem): boolean {
    return this.isAllTab() && item.invoiceCount > 1 && item.childInvoices.length > 1;
  }

  getStatusSummaryEntries(item: InvoiceTableItem): Array<{ key: InvoiceStatusKey; count: number }> {
    return (Object.entries(item.statusCounts) as Array<[InvoiceStatusKey, number]>)
      .filter(([, count]) => count > 0)
      .sort(([leftKey], [rightKey]) => this.getStatusPriority(rightKey) - this.getStatusPriority(leftKey))
      .map(([key, count]) => ({ key, count }));
  }

  getChildInvoices(item: InvoiceTableItem): InvoiceTableItem[] {
    return item.childInvoices;
  }

  private isAllTab(): boolean {
    return !this.tab || this.tab === 'all';
  }

  private buildFilterText(item: InvoiceTableItem): string {
    const summaryText = this.getStatusSummaryEntries(item)
      .map((entry) => `${entry.key} ${entry.count}`)
      .join(' ');

    return [
      item.id,
      item.name,
      item.create_date,
      item.due_date,
      item.qty,
      item.status,
      item.invoiceCount,
      ...item.invoiceIds,
      summaryText
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(' ')
      .toLowerCase();
  }

  private mergeLoadedItems(items: InvoiceTableItem[], append: boolean): InvoiceTableItem[] {
    const merged = append ? [...this.loadedItems, ...items] : items;
    const deduped = new Map<number, InvoiceTableItem>();

    for (const item of merged) {
      deduped.set(item.id, item);
    }

    return Array.from(deduped.values()).sort(
      (left, right) => this.getDateTimestamp(right.create_date) - this.getDateTimestamp(left.create_date)
    );
  }

  private groupInvoicesByStudent(items: InvoiceTableItem[]): InvoiceTableItem[] {
    const groups = new Map<string, InvoiceTableItem[]>();

    for (const item of items) {
      const key = item.studentId > 0 ? `student-${item.studentId}` : `name-${item.name.trim().toLowerCase()}`;
      const existingGroup = groups.get(key) ?? [];
      existingGroup.push(item);
      groups.set(key, existingGroup);
    }

    return Array.from(groups.values())
      .map((group) => this.createGroupedInvoiceItem(group))
      .sort((left, right) => this.getDateTimestamp(right.create_date) - this.getDateTimestamp(left.create_date));
  }

  private createGroupedInvoiceItem(group: InvoiceTableItem[]): InvoiceTableItem {
    const primaryInvoice = this.selectPrimaryInvoice(group);
    const statusCounts = group.reduce<InvoiceStatusCounts>((accumulator, item) => {
      const normalizedStatus = this.normalizeStatus(item.status);
      if (normalizedStatus) {
        accumulator[normalizedStatus] += 1;
      }
      return accumulator;
    }, EMPTY_STATUS_COUNTS());

    return {
      ...primaryInvoice,
      qty: group.reduce((sum, item) => sum + Number(item.qty ?? 0), 0),
      create_date: this.getLatestDateValue(group.map((item) => item.create_date)),
      due_date: this.getRelevantDueDate(group),
      invoiceCount: group.length,
      invoiceIds: group.map((item) => item.id),
      statusCounts,
      childInvoices: [...group]
    };
  }

  private selectPrimaryInvoice(group: InvoiceTableItem[]): InvoiceTableItem {
    return [...group].sort((left, right) => {
      const priorityDifference = this.getStatusPriority(right.status) - this.getStatusPriority(left.status);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const dueDateDifference = this.getDateTimestamp(left.due_date) - this.getDateTimestamp(right.due_date);
      if (dueDateDifference !== 0) {
        return dueDateDifference;
      }

      return this.getDateTimestamp(right.create_date) - this.getDateTimestamp(left.create_date);
    })[0];
  }

  private getRelevantDueDate(group: InvoiceTableItem[]): string {
    const actionableInvoices = group.filter((item) => {
      const status = this.normalizeStatus(item.status);
      return status === 'overdue' || status === 'unpaid';
    });

    const source = actionableInvoices.length > 0 ? actionableInvoices : group;
    return this.getEarliestDateValue(source.map((item) => item.due_date));
  }

  private getLatestDateValue(values: string[]): string {
    return [...values].sort((left, right) => this.getDateTimestamp(right) - this.getDateTimestamp(left))[0] ?? '';
  }

  private getEarliestDateValue(values: string[]): string {
    return [...values].sort((left, right) => this.getDateTimestamp(left) - this.getDateTimestamp(right))[0] ?? '';
  }

  private getDateTimestamp(value: string | null | undefined): number {
    if (!value) {
      return 0;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeStatus(status: string | null | undefined): InvoiceStatusKey | null {
    const normalized = (status ?? '').trim().toLowerCase();
    if (normalized === 'paid' || normalized === 'unpaid' || normalized === 'overdue' || normalized === 'cancelled') {
      return normalized;
    }

    return null;
  }

  private createStatusCounts(status: InvoiceStatusKey | null): InvoiceStatusCounts {
    const counts = EMPTY_STATUS_COUNTS();
    if (status) {
      counts[status] = 1;
    }
    return counts;
  }

  private getStatusPriority(status: string | null | undefined): number {
    const normalized = this.normalizeStatus(status);
    return normalized ? STATUS_PRIORITY[normalized] : 0;
  }

  private syncExpandedRow(): void {
    if (this.expandedRowId == null) {
      return;
    }

    const hasExpandedRow = this.dataSource.data.some((item) => item.id === this.expandedRowId);
    if (!hasExpandedRow) {
      this.expandedRowId = null;
    }
  }
}
