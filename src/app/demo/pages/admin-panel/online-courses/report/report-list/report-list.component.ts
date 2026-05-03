import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDatepicker } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS
} from '@angular/material-moment-adapter';
import moment, { Moment } from 'moment';

import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportAddDto,
  CircleReportListDto,
  CircleReportService
} from 'src/app/@theme/services/circle-report.service';
import {
  CircleDto,
  CircleService,
  CircleStudentDto
} from 'src/app/@theme/services/circle.service';
import {
  FilteredResultRequestDto,
  LookupService,
  LookUpUserDto,
  NationalityDto
} from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AttendStatusEnum } from 'src/app/@theme/types/AttendStatusEnum';
import { QuranSurahEnum } from 'src/app/@theme/types/QuranSurahEnum';
import {
  RESIDENCY_GROUP_OPTIONS,
  ResidencyGroupFilter
} from 'src/app/@theme/types/residency-group';
import { matchesResidencyGroup } from 'src/app/@theme/utils/nationality.utils';
import { formatDateTimeForBusinessUser, parseApiDate } from 'src/app/@theme/utils/cairo-date-time';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';

interface StudentOption {
  id: number;
  name: string;
}

interface RawDateParts {
  year: number;
  month: number;
  day: number | null;
  hour: number | null;
  minute: number | null;
  second: number | null;
}

const MONTH_FORMATS = {
  parse: { dateInput: 'MMMM YYYY' },
  display: {
    dateInput: 'MMMM YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, LoadingOverlayComponent, MatDialogModule, MatButtonModule, ReactiveFormsModule],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.scss',
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: MAT_DATE_FORMATS, useValue: MONTH_FORMATS }
  ]
})
export class ReportListComponent implements OnInit, AfterViewInit, OnDestroy {
  private reportService = inject(CircleReportService);
  private circleService = inject(CircleService);
  private lookupService = inject(LookupService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  filterForm: FormGroup = this.fb.group({
    searchTerm: [''],
    month: [null],
    circleId: [null],
    studentId: [null],
    residentId: [null],
    residentGroup: ['all'],
    fromDate: [null],
    toDate: [null]
  });

  displayedColumns: string[] = ['index', 'student', 'circle', 'status', 'creationTime', 'minutes', 'actions'];
  dataSource = new MatTableDataSource<CircleReportListDto>();

  totalCount = 0;
  pageSize = 10;
  pageIndex = 0;

  filter: FilteredResultRequestDto = {
    skipCount: 0,
    maxResultCount: 10,
    sortBy: 'CreationTime',
    sortingDirection: 'desc'
  };

  circles: CircleDto[] = [];
  students: StudentOption[] = [];
  private allStudents: StudentOption[] = [];
  nationalities: NationalityDto[] = [];
  residencyGroupOptions = RESIDENCY_GROUP_OPTIONS;

  isLoading = false;
  isLoadingStudents = false;
  isLoadingMore = false;
  isFilterPopupOpen = false;
  private readonly arabicMonthNames = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر'
  ] as const;
  private readonly arabicIntegerFormatter = new Intl.NumberFormat('ar-EG', {
    useGrouping: false
  });
  private readonly arabicTwoDigitFormatter = new Intl.NumberFormat('ar-EG', {
    useGrouping: false,
    minimumIntegerDigits: 2
  });
  readonly sort = viewChild(MatSort);
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  private destroy$ = new Subject<void>();

  private selectedCircleId?: number;
  private selectedStudentId?: number;
  private selectedMonth?: string;
  private selectedStudentName?: string;
  private selectedResidentId?: number | null;
  private selectedResidencyGroup: ResidencyGroupFilter = 'all';
  private appliedFromDate?: string;
  private appliedToDate?: string;
  private readonly teacherId?: number;

  role = this.auth.getRole();
  canManageReports = this.role !== UserTypesEnum.Student;
  readonly isTeacher = this.role === UserTypesEnum.Teacher;

  constructor() {
    const currentUser = this.auth.currentUserValue;
    if (this.role === UserTypesEnum.Teacher && currentUser?.user?.id) {
      const parsed = Number(currentUser.user.id);
      this.teacherId = Number.isNaN(parsed) ? undefined : parsed;
    }
  }

  ngOnInit(): void {
    this.syncFilterPopupStateFromApplied();
    this.loadCircles();
    this.loadNationalities();
    this.loadAllStudents();
    this.loadReports();

    this.filterForm
      .get('month')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((monthValue) => this.onMonthChange(monthValue));

    this.filterForm
      .get('circleId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((circleId) => this.onCircleChange(circleId));

    this.filterForm
      .get('residentId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((residentId) => this.onResidencyChange(residentId));

    this.filterForm
      .get('residentGroup')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((group: ResidencyGroupFilter | null) => this.onResidencyGroupChange(group));

    this.filterForm
      .get('fromDate')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.clearDraftMonthWhenDateSelected(value));

    this.filterForm
      .get('toDate')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.clearDraftMonthWhenDateSelected(value));
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort()!;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'student':
          return this.getStudentDisplay(item).toLowerCase();
        case 'circle':
          return this.getCircleDisplay(item).toLowerCase();
        case 'status':
          return Number(item.attendStatueId ?? 0);
        case 'creationTime':
          return this.toSortableRawDateValue(item.creationTime);
        case 'minutes':
          return Number(item.minutes ?? 0);
        default:
          return (item as unknown as Record<string, unknown>)[property] as string | number;
      }
    };
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  openFilterPopup(): void {
    this.syncFilterPopupStateFromApplied();
    this.refreshStudentOptionsForDraftState();
    this.isFilterPopupOpen = true;
  }

  closeFilterPopup(restoreDraft = true): void {
    if (restoreDraft) {
      this.syncFilterPopupStateFromApplied();
    }

    this.isFilterPopupOpen = false;
  }

  resetFilterPopup(): void {
    this.filterForm.patchValue(
      {
        searchTerm: '',
        month: null,
        circleId: null,
        studentId: null,
        residentId: null,
        residentGroup: 'all',
        fromDate: null,
        toDate: null
      },
      { emitEvent: false }
    );

    this.students = [];
    this.loadAllStudents();
  }

  onMonthSelected(normalizedMonthAndYear: Moment, datepicker: MatDatepicker<Moment>): void {
    this.filterForm.patchValue(
      {
        month: normalizedMonthAndYear.clone().startOf('month').utc(true)
      },
      { emitEvent: true }
    );
    datepicker.close();
  }

  clearDraftMonth(): void {
    this.filterForm.patchValue({ month: null }, { emitEvent: false });
  }

  hasDraftMonthFilter(): boolean {
    return !!this.normalizeMonthValue(this.filterForm.get('month')?.value);
  }

  hasAppliedFilters(): boolean {
    return Boolean(
      this.getAppliedSearchTerm() ||
        this.selectedMonth ||
        this.selectedCircleId ||
        this.selectedStudentId ||
        this.appliedFromDate ||
        this.appliedToDate
    );
  }

  hasAppliedMonthFilter(): boolean {
    return !!this.selectedMonth;
  }

  hasAppliedDateRangeFilter(): boolean {
    return !this.selectedMonth && (!!this.appliedFromDate || !!this.appliedToDate);
  }

  hasAppliedCircleFilter(): boolean {
    return !!this.selectedCircleId;
  }

  hasAppliedStudentFilter(): boolean {
    return !!this.selectedStudentId;
  }

  getAppliedSearchTerm(): string {
    return (this.filter.searchTerm || '').toString().trim();
  }

  getAppliedMonthLabel(): string {
    if (!this.selectedMonth) {
      return '—';
    }

    const [yearText, monthText] = this.selectedMonth.split('-');
    const year = Number(yearText);
    const month = Number(monthText);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return this.selectedMonth;
    }

    const monthName = this.arabicMonthNames[month - 1] ?? monthText;
    return `${monthName} ${this.formatArabicInteger(year)}`;
  }

  getAppliedDateRangeLabel(): string {
    const fromLabel = this.appliedFromDate ? this.formatDateOnlyLabel(this.appliedFromDate) : null;
    const toLabel = this.appliedToDate ? this.formatDateOnlyLabel(this.appliedToDate) : null;

    if (fromLabel && toLabel) {
      return `${fromLabel} - ${toLabel}`;
    }

    if (fromLabel) {
      return `من ${fromLabel}`;
    }

    if (toLabel) {
      return `إلى ${toLabel}`;
    }

    return '—';
  }

  getAppliedCircleLabel(): string {
    return this.resolveCircleName(this.selectedCircleId) ?? '—';
  }

  getAppliedStudentLabel(): string {
    return this.resolveStudentName(this.selectedStudentId) ?? '—';
  }

  clearAppliedFilters(): void {
    this.filter.searchTerm = undefined;
    this.selectedMonth = undefined;
    this.selectedCircleId = undefined;
    this.selectedStudentId = undefined;
    this.selectedStudentName = undefined;
    this.selectedResidentId = null;
    this.selectedResidencyGroup = 'all';
    this.appliedFromDate = undefined;
    this.appliedToDate = undefined;
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.filter.residentGroup = 'all';

    this.resetFilterPopup();
    this.loadReports();
  }

  private loadCircles(): void {
    this.circleService
      .getAll({ skipCount: 0, maxResultCount: 100 })
      .subscribe((res) => {
        this.circles = res.isSuccess && res.data?.items ? res.data.items : [];
      });
  }

  private loadNationalities(): void {
    this.lookupService.getAllNationalities().subscribe((res) => {
      this.nationalities = res.isSuccess && Array.isArray(res.data) ? res.data : [];
    });
  }

  private loadAllStudents(searchTerm?: string): void {
    const selectedCircleId = this.getDraftSelectedCircleId();
    const selectedResidentId = this.getDraftSelectedResidentId();
    const selectedResidencyGroup = this.getDraftSelectedResidencyGroup();

    this.isLoadingStudents = true;
    this.lookupService
      .getUsersForSelects(
        {
          skipCount: 0,
          maxResultCount: 100,
          searchTerm: searchTerm?.trim() || undefined,
          residentGroup: selectedResidencyGroup
        },
        Number(UserTypesEnum.Student),
        0,
        0,
        0,
        selectedResidentId ?? undefined
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            const mapped = res.data.items
              .filter(
                (student) =>
                  this.matchesSelectedResidentId(student.residentId) &&
                  this.matchesSelectedResidency(student.residentId)
              )
              .map((student) => this.mapLookupToStudentOption(student));
            this.allStudents = mapped;
            if (!selectedCircleId) {
              this.students = [...mapped];
            }
          } else {
            this.allStudents = [];
            if (!selectedCircleId) {
              this.students = [];
            }
          }
          this.isLoadingStudents = false;
        },
        error: () => {
          this.allStudents = [];
          if (!selectedCircleId) {
            this.students = [];
          }
          this.isLoadingStudents = false;
        }
      });
  }

  private loadStudentsForCircle(circleId: number): void {
    this.isLoadingStudents = true;
    this.circleService.get(circleId).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data?.students) {
          const mapped = res.data.students
            .filter(
              (student) =>
                this.matchesSelectedResidentId((student.student as LookUpUserDto | undefined)?.residentId) &&
                this.matchesSelectedResidency((student.student as LookUpUserDto | undefined)?.residentId ?? null)
            )
            .map((student) => this.mapCircleStudentToOption(student))
            .filter((student): student is StudentOption => !!student);
          const unique = new Map(mapped.map((student) => [student.id, student]));
          this.students = Array.from(unique.values());
        } else {
          this.students = [];
        }
        this.isLoadingStudents = false;
      },
      error: () => {
        this.students = [];
        this.isLoadingStudents = false;
      }
    });
  }

  private mapLookupToStudentOption(user: LookUpUserDto): StudentOption {
    const name = user.fullName || user.email || `Student #${user.id}`;
    return { id: user.id, name };
  }

  private mapCircleStudentToOption(student: CircleStudentDto): StudentOption | undefined {
    const studentData = student.student as LookUpUserDto | undefined;
    const id = studentData?.id ?? student.studentId ?? student.id;
    if (id === null || id === undefined) return undefined;

    const name =
      studentData?.fullName ||
      student.fullName ||
      (typeof id === 'number' ? `Student #${id}` : `Student #${Number(id)}`);

    return {
      id: Number(id),
      name
    };
  }

  private onCircleChange(circleId: number | null): void {
    this.filterForm.patchValue({ studentId: null }, { emitEvent: false });

    const normalizedCircleId = circleId ? Number(circleId) : null;
    if (normalizedCircleId) {
      this.loadStudentsForCircle(normalizedCircleId);
      return;
    }

    this.students = [...this.allStudents];
  }

  private onMonthChange(monthValue: unknown): void {
    if (!this.normalizeMonthValue(monthValue)) {
      return;
    }

    if (this.filterForm.get('fromDate')?.value || this.filterForm.get('toDate')?.value) {
      this.filterForm.patchValue(
        {
          fromDate: null,
          toDate: null
        },
        { emitEvent: false }
      );
    }
  }

  private clearDraftMonthWhenDateSelected(value: unknown): void {
    if (!value) {
      return;
    }

    if (this.filterForm.get('month')?.value) {
      this.filterForm.patchValue({ month: null }, { emitEvent: false });
    }
  }

  private onResidencyChange(residentId: number | null): void {
    const normalizedResidentId = residentId && residentId > 0 ? residentId : null;
    this.filterForm.patchValue({ residentId: normalizedResidentId, studentId: null }, { emitEvent: false });
    this.students = [];
    this.refreshStudentOptionsForDraftState();
  }

  private onResidencyGroupChange(group: ResidencyGroupFilter | null): void {
    this.filterForm.patchValue({ residentGroup: group ?? 'all', studentId: null }, { emitEvent: false });
    this.students = [];
    this.refreshStudentOptionsForDraftState();
  }

  private refreshStudentOptionsForDraftState(): void {
    const selectedCircleId = this.getDraftSelectedCircleId();
    if (selectedCircleId) {
      this.loadStudentsForCircle(selectedCircleId);
      return;
    }

    this.loadAllStudents();
  }

  private matchesSelectedResidentId(residentId?: number | null): boolean {
    const selectedResidentId = this.getDraftSelectedResidentId();
    if (!selectedResidentId || selectedResidentId <= 0) return true;
    return residentId === selectedResidentId;
  }

  private matchesSelectedResidency(residentId?: number | null): boolean {
    const selectedResidencyGroup = this.getDraftSelectedResidencyGroup();
    if (!selectedResidencyGroup || selectedResidencyGroup === 'all') return true;
    const nationality = this.getNationalityById(residentId);
    return matchesResidencyGroup(nationality ?? null, selectedResidencyGroup);
  }

  private getNationalityById(id?: number | null): NationalityDto | undefined {
    if (id === null || id === undefined) return undefined;
    return this.nationalities.find((nationality) => nationality.id === Number(id));
  }

  private getDraftSelectedCircleId(): number | undefined {
    return this.normalizeOptionalNumber(this.filterForm.get('circleId')?.value);
  }

  private getDraftSelectedResidentId(): number | null {
    return this.normalizeOptionalNumber(this.filterForm.get('residentId')?.value) ?? null;
  }

  private getDraftSelectedResidencyGroup(): ResidencyGroupFilter {
    return (this.filterForm.get('residentGroup')?.value as ResidencyGroupFilter | null) ?? 'all';
  }

  private normalizeOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined;
  }

  private syncFilterPopupStateFromApplied(): void {
    this.filterForm.patchValue(
      {
        searchTerm: this.filter.searchTerm ?? '',
        month: this.createMonthFromValue(this.selectedMonth),
        circleId: this.selectedCircleId ?? null,
        studentId: this.selectedStudentId ?? null,
        residentId: this.selectedResidentId ?? null,
        residentGroup: this.selectedResidencyGroup,
        fromDate: this.selectedMonth ? null : this.createDateFromDateOnly(this.appliedFromDate),
        toDate: this.selectedMonth ? null : this.createDateFromDateOnly(this.appliedToDate)
      },
      { emitEvent: false }
    );
  }

  private createMonthFromValue(value?: string): Moment | null {
    const normalizedMonth = this.normalizeMonthValue(value);
    if (!normalizedMonth) {
      return null;
    }

    const parsed = moment(normalizedMonth, 'YYYY-MM', true);
    return parsed.isValid() ? parsed.startOf('month').utc(true) : null;
  }

  private createDateFromDateOnly(value?: string): Moment | null {
    if (!value) {
      return null;
    }

    const parsed = moment(value, 'YYYY-MM-DD', true);
    return parsed.isValid() ? parsed.startOf('day').utc(true) : null;
  }

  private validateDateRange(): { fromDate?: string; toDate?: string } | null {
    const fromDate = this.toDateOnlyString(this.filterForm.get('fromDate')?.value);
    const toDate = this.toDateOnlyString(this.filterForm.get('toDate')?.value);

    if (fromDate && toDate && fromDate > toDate) {
      this.toast.error(this.translate.instant('تاريخ البداية يجب أن يكون قبل تاريخ النهاية'));
      return null;
    }

    return { fromDate, toDate };
  }

  private toDateOnlyString(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (moment.isMoment(value)) {
      return value.isValid() ? value.clone().format('YYYY-MM-DD') : undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return this.formatDateAsLocal(parsed);
      }
      return undefined;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return undefined;
      }
      return this.formatDateAsLocal(value);
    }

    const parsed = new Date(value as string);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return this.formatDateAsLocal(parsed);
  }

  private normalizeMonthValue(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (moment.isMoment(value)) {
      return value.isValid() ? value.clone().startOf('month').format('YYYY-MM') : undefined;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : this.formatMonthAsLocal(value);
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : this.formatMonthAsLocal(parsed);
  }

  private buildMonthDateRange(monthValue: string): { fromDate: string; toDate: string } | null {
    const normalizedMonth = this.normalizeMonthValue(monthValue);
    if (!normalizedMonth) {
      return null;
    }

    const [yearText, monthText] = normalizedMonth.split('-');
    const year = Number(yearText);
    const month = Number(monthText);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    return {
      fromDate: this.formatDateAsLocal(monthStart),
      toDate: this.formatDateAsLocal(monthEnd)
    };
  }

  private resolveCircleName(circleId?: number): string | undefined {
    if (!circleId) {
      return undefined;
    }

    return this.circles.find((circle) => circle.id === circleId)?.name ?? undefined;
  }

  private resolveStudentName(studentId?: number): string | undefined {
    if (!studentId) {
      return undefined;
    }

    return (
      this.students.find((student) => student.id === studentId)?.name ??
      this.allStudents.find((student) => student.id === studentId)?.name ??
      (this.selectedStudentId === studentId ? this.selectedStudentName : undefined) ??
      `Student #${studentId}`
    );
  }

  private formatDateOnlyLabel(value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return this.formatArabicDateLabel(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  private formatMonthAsLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private formatDateAsLocal(date: Date | Moment): string {
    const normalizedDate = moment.isMoment(date) ? date.toDate() : date;
    const year = normalizedDate.getFullYear();
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
    const day = String(normalizedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSearch(): void {
    const selectedMonth = this.normalizeMonthValue(this.filterForm.get('month')?.value);
    const dateRange = selectedMonth ? this.buildMonthDateRange(selectedMonth) : this.validateDateRange();
    if (!dateRange) return;

    const term = (this.filterForm.value.searchTerm || '').toString().trim();
    this.filter.searchTerm = term.length ? term : undefined;
    this.selectedMonth = selectedMonth;
    this.selectedCircleId = this.getDraftSelectedCircleId();
    this.selectedStudentId = this.normalizeOptionalNumber(this.filterForm.get('studentId')?.value);
    this.selectedStudentName = this.resolveStudentName(this.selectedStudentId);
    this.selectedResidentId = this.getDraftSelectedResidentId();
    this.selectedResidencyGroup = this.getDraftSelectedResidencyGroup();
    this.appliedFromDate = dateRange.fromDate;
    this.appliedToDate = dateRange.toDate;
    this.filter.residentGroup = this.selectedResidencyGroup;
    this.filter.skipCount = 0;
    this.pageIndex = 0;

    this.closeFilterPopup(false);
    this.loadReports();
  }

  clearSearch(): void {
    this.filterForm.patchValue({ searchTerm: '' }, { emitEvent: false });
  }

  private loadReports(append = false): void {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.filter.residentGroup = this.selectedResidencyGroup;

    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;

    this.reportService
      .getAll(this.filter, {
        circleId: this.selectedCircleId,
        studentId: this.selectedStudentId,
        teacherId: this.teacherId,
        residentId: this.selectedResidentId ?? undefined,
        residentGroup: this.selectedResidencyGroup,
        fromDate: this.appliedFromDate,
        toDate: this.appliedToDate
      })
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            const mergedItems = append
              ? [...this.dataSource.data, ...res.data.items]
              : res.data.items;

            this.dataSource.data = mergedItems.sort((firstReport, secondReport) => {
              const firstCreationTime = this.toSortableRawDateValue(firstReport.creationTime);
              const secondCreationTime = this.toSortableRawDateValue(secondReport.creationTime);
              return secondCreationTime - firstCreationTime;
            });
            this.totalCount = Number(res.data.totalCount) || 0;
          } else {
            if (!append) {
              this.dataSource.data = [];
            }
            this.totalCount = 0;
          }
          this.isLoading = false;
          this.isLoadingMore = false;
          this.cdr.detectChanges();
        },
        error: () => {
          if (!append) {
            this.dataSource.data = [];
          }
          this.totalCount = 0;
          this.isLoading = false;
          this.isLoadingMore = false;
          this.toast.error(this.translate.instant('Error loading reports'));
          this.cdr.detectChanges();
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
    this.loadReports(true);
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }

  getStudentDisplay(report: CircleReportListDto): string {
    return (
      (report.studentName as string | undefined) ||
      (report['student'] as string | undefined) ||
      (report['studentFullName'] as string | undefined) ||
      (typeof report.studentId === 'number' ? `Student #${report.studentId}` : '')
    );
  }

  getCircleDisplay(report: CircleReportListDto): string {
    return (
      (report.circleName as string | undefined) ||
      (report['circle'] as string | undefined) ||
      (report['circleTitle'] as string | undefined) ||
      (typeof report.circleId === 'number' ? `Circle #${report.circleId}` : '')
    );
  }

  getStatusConfig(status?: number | null): { label: string; class: string } {
    const defaultConfig = {
      label: this.translate.instant('Attendance.Unknown'),
      class: 'status-pill--muted'
    };

    switch (status) {
      case AttendStatusEnum.Attended:
        return {
          label: this.translate.instant('Attendance.Attended'),
          class: 'status-pill--success'
        };
      case AttendStatusEnum.ExcusedAbsence:
        return {
          label: this.translate.instant('Attendance.ExcusedAbsence'),
          class: 'status-pill--warning'
        };
      case AttendStatusEnum.UnexcusedAbsence:
        return {
          label: this.translate.instant('Attendance.UnexcusedAbsence'),
          class: 'status-pill--danger'
        };
      default:
        return defaultConfig;
    }
  }

  formatDate(value?: string | Date | null): string {
    const formatted = formatDateTimeForBusinessUser(value, 'ar-EG', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    if (formatted) {
      return formatted;
    }
    if (!value) {
      return '—';
    }

    if (value instanceof Date) {
      return this.formatDateFromDate(value);
    }

    return this.formatDateFromRawString(value);
  }

  getVisualLabel(value: unknown): string {
    if (value === true) return 'نعم';
    if (value === false) return 'لا';
    return '—';
  }

  getTeacherDisplay(report: CircleReportListDto): string {
    return (
      (report.teacherName as string | undefined) ||
      (report['teacher'] as string | undefined) ||
      (report['teacherFullName'] as string | undefined) ||
      (typeof report.teacherId === 'number' ? `Teacher #${report.teacherId}` : '')
    );
  }

  onSendWhatsApp(report: CircleReportListDto): void {
    if (!report) return;
    const payload = this.buildWhatsAppPayload(report);
    this.openWhatsAppDialog(payload);
  }

  private buildWhatsAppPayload(report: CircleReportListDto): WhatsAppDialogPayload {
    const studentName = this.getStudentDisplay(report) || this.translate.instant('طالب');
    const circleName = this.getCircleDisplay(report) || '—';
    const teacherName = this.getTeacherDisplay(report) || '—';
    const statusLabel = this.getStatusConfig(report.attendStatueId).label;
    const minutes = report.minutes ?? '—';

    const header = `تقرير الطالب ${studentName}\nالحلقة: ${circleName}\nالمعلم: ${teacherName}\nالحالة: ${statusLabel}\nالدقائق: ${minutes}`;
    const attendedDetails =
      Number(report.attendStatueId) === AttendStatusEnum.Attended
        ? this.buildAttendedDetails(report as CircleReportAddDto)
        : '';
    const message = attendedDetails ? `${header}\n${attendedDetails}` : header;

    return { studentName, message };
  }

  private buildAttendedDetails(model: CircleReportAddDto): string {
    const lines: string[] = [];
    const surahName = this.getSurahName(model.newId);

    if (surahName) lines.push(`السورة الجديدة: ${surahName}`);
    if (model.newFrom) lines.push(`الجديد من: ${model.newFrom}`);
    if (model.newTo) lines.push(`الجديد إلى: ${model.newTo}`);
    if (model.generalRate) lines.push(`التقييم العام: ${model.generalRate}`);
    if (model.recentPast) lines.push(`الماضي القريب: ${model.recentPast}`);
    if (model.distantPast) lines.push(`الماضي البعيد: ${model.distantPast}`);
    if (model.farthestPast) lines.push(`الأبعد: ${model.farthestPast}`);
    if (model.isVisual === true) lines.push('الحصة المرئية: نعم');
    if (model.isVisual === false) lines.push('الحصة المرئية: لا');
    if (model.nextCircleOrder) lines.push(`مقرر الحصة القادمة: ${model.nextCircleOrder}`);
    if (model.theWordsQuranStranger) lines.push(`غريب القرآن: ${model.theWordsQuranStranger}`);
    if (model.intonation) lines.push(`التجويد: ${model.intonation}`);
    return lines.join('\n');
  }

  private getSurahName(value?: number | null): string | null {
    if (!value) return null;
    const key = (Object.keys(QuranSurahEnum) as Array<keyof typeof QuranSurahEnum>).find(
      (surahKey) => QuranSurahEnum[surahKey] === Number(value)
    );
    return key ? String(key) : null;
  }

  private openWhatsAppDialog(payload: WhatsAppDialogPayload): void {
    const dialogRef = this.dialog.open(ReportWhatsAppDialogComponent, {
      data: payload,
      width: '420px'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.launchWhatsApp(payload.message);
    });
  }

  private launchWhatsApp(message: string): void {
    const url = message ? `https://wa.me/?text=${encodeURIComponent(message)}` : 'https://wa.me/';
    window.open(url, '_blank');
  }

  private formatDateFromRawString(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '—';
    }

    const parts = this.extractRawDateParts(trimmed);
    if (!parts || parts.day === null) {
      return this.sanitizeRawDateText(trimmed);
    }

    const datePart = this.formatArabicDateLabel(parts.year, parts.month, parts.day);
    if (parts.hour === null || parts.minute === null) {
      return datePart;
    }

    return `${datePart} - ${this.formatArabicTime12(parts.hour, parts.minute)}`;
  }

  private formatDateFromDate(value: Date): string {
    if (Number.isNaN(value.getTime())) {
      return '—';
    }

    const datePart = this.formatArabicDateLabel(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate()
    );

    return `${datePart} - ${this.formatArabicTime12(value.getHours(), value.getMinutes())}`;
  }

  private toSortableRawDateValue(value?: string | Date | null): number {
    const parsed = parseApiDate(value);
    if (parsed) {
      return parsed.getTime();
    }

    if (!value) {
      return 0;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    }

    const parts = this.extractRawDateParts(value);
    if (!parts) {
      return 0;
    }

    const day = parts.day ?? 1;
    const hour = parts.hour ?? 0;
    const minute = parts.minute ?? 0;
    const second = parts.second ?? 0;

    return (
      (((((parts.year * 100) + parts.month) * 100 + day) * 100 + hour) * 100 + minute) * 100 +
      second
    );
  }

  private extractRawDateParts(value: string): RawDateParts | null {
    const match = value.match(
      /^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?(?:[T\s](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/
    );

    if (!match) {
      return null;
    }

    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: match[3] ? Number(match[3]) : null,
      hour: match[4] ? Number(match[4]) : null,
      minute: match[5] ? Number(match[5]) : null,
      second: match[6] ? Number(match[6]) : null
    };
  }

  private sanitizeRawDateText(value: string): string {
    return value
      .trim()
      .replace('T', ' ')
      .replace(/\.\d+(?=(?:Z|[+-]\d{2}:\d{2})?$)/, '')
      .replace(/(?:Z|[+-]\d{2}:\d{2})$/, '');
  }

  private formatArabicDateLabel(year: number, month: number, day: number): string {
    const monthName = this.arabicMonthNames[month - 1] ?? this.padNumber(month);
    return `${this.formatArabicInteger(day)} ${monthName} ${this.formatArabicInteger(year)}`;
  }

  private formatArabicTime12(hour: number, minute: number): string {
    const meridiem = hour >= 12 ? 'م' : 'ص';
    const normalizedHour = hour % 12 || 12;
    return `${this.formatArabicInteger(normalizedHour)}:${this.formatArabicTwoDigits(minute)} ${meridiem}`;
  }

  private formatArabicInteger(value: number): string {
    return this.arabicIntegerFormatter.format(value);
  }

  private formatArabicTwoDigits(value: number): string {
    return this.arabicTwoDigitFormatter.format(value);
  }

  private padNumber(value: number): string {
    return String(value).padStart(2, '0');
  }

  onEdit(report: CircleReportListDto): void {
    const reportId = Number(report?.id);
    if (!Number.isFinite(reportId) || reportId <= 0) {
      this.toast.error(this.translate.instant('Invalid report identifier'));
      return;
    }

    this.router.navigate(['/online-course/report/edit', reportId], {
      state: { report }
    });
  }

  onDelete(report: CircleReportListDto): void {
    const reportId = Number(report?.id);
    if (!Number.isFinite(reportId) || reportId <= 0) {
      this.toast.error(this.translate.instant('Invalid report identifier'));
      return;
    }

    const dialogRef = this.dialog.open(DeleteReportConfirmDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      this.reportService.delete(reportId).subscribe({
        next: () => {
          this.toast.success(this.translate.instant('Report deleted successfully'));
          this.loadReports();
        },
        error: () => {
          this.toast.error(this.translate.instant('Error deleting report'));
        }
      });
    });
  }
}

interface WhatsAppDialogPayload {
  studentName: string;
  message: string;
}

@Component({
  selector: 'app-report-whatsapp-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>إرسال التقرير عبر واتساب</h2>
    <mat-dialog-content>
      <p>
        سيتم فتح واتساب لاختيار جهة الاتصال الخاصة بالطالب
        <strong>{{ data.studentName }}</strong>.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="onSend()">إرسال واتساب</button>
    </mat-dialog-actions>
  `
})
export class ReportWhatsAppDialogComponent {
  private dialogRef = inject(MatDialogRef<ReportWhatsAppDialogComponent>);
  readonly data = inject<WhatsAppDialogPayload>(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSend(): void {
    this.dialogRef.close(true);
  }
}

@Component({
  selector: 'app-delete-report-confirm-dialog',
  standalone: true,
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">{{ 'Delete report' | translate }}</div>
    <div class="p-10">{{ 'Are you sure you want to delete this report?' | translate }}</div>
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
  imports: [MatDialogActions, MatDialogClose, MatButtonModule, TranslateModule]
})
export class DeleteReportConfirmDialogComponent {}
