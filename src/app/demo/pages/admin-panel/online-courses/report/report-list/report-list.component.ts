import { AfterViewInit, Component, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';

import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportListDto,
  CircleReportService
} from 'src/app/@theme/services/circle-report.service';
import { CircleDto, CircleService, CircleStudentDto } from 'src/app/@theme/services/circle.service';
import {
  FilteredResultRequestDto,
  LookupService,
  LookUpUserDto
} from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AttendStatusEnum } from 'src/app/@theme/types/AttendStatusEnum';

import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

interface StudentOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-report-list',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.scss'
})
export class ReportListComponent implements OnInit, AfterViewInit, OnDestroy {
  private reportService = inject(CircleReportService);
  private circleService = inject(CircleService);
  private lookupService = inject(LookupService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);

  readonly paginator = viewChild.required(MatPaginator);

  filterForm: FormGroup = this.fb.group({
    searchTerm: [''],
    circleId: [null],
    studentId: [null]
  });

  displayedColumns: string[] = ['student', 'circle', 'status', 'creationTime', 'actions'];
  dataSource = new MatTableDataSource<CircleReportListDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  circles: CircleDto[] = [];
  students: StudentOption[] = [];
  private allStudents: StudentOption[] = [];

  isLoading = false;
  isLoadingStudents = false;

  private destroy$ = new Subject<void>();

  private selectedCircleId?: number;
  private selectedStudentId?: number;
  private readonly teacherId?: number;

  role = this.auth.getRole();
  canManageReports = this.role !== UserTypesEnum.Student;

  constructor() {
    const currentUser = this.auth.currentUserValue;
    if (this.role === UserTypesEnum.Teacher && currentUser?.user?.id) {
      const parsed = Number(currentUser.user.id);
      this.teacherId = Number.isNaN(parsed) ? undefined : parsed;
    }
  }

  ngOnInit(): void {
    this.loadCircles();
    this.loadAllStudents();
    this.loadReports();

    this.filterForm
      .get('searchTerm')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.onSearch());

    this.filterForm
      .get('circleId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((circleId) => this.onCircleChange(circleId));

    this.filterForm
      .get('studentId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngAfterViewInit(): void {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.loadReports();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCircles(): void {
    this.circleService
      .getAll({ skipCount: 0, maxResultCount: 100 })
      .subscribe((res) => {
        if (res.isSuccess && res.data?.items) {
          this.circles = res.data.items;
        } else {
          this.circles = [];
        }
      });
  }

  private loadAllStudents(searchTerm?: string): void {
    this.isLoadingStudents = true;
    this.lookupService
      .getUsersForSelects(
        { skipCount: 0, maxResultCount: 100, searchTerm: searchTerm?.trim() || undefined },
        Number(UserTypesEnum.Student)
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            const mapped = res.data.items.map((s) => this.mapLookupToStudentOption(s));
            this.allStudents = mapped;
            if (!this.selectedCircleId) {
              this.students = [...mapped];
            }
          } else {
            this.allStudents = [];
            if (!this.selectedCircleId) {
              this.students = [];
            }
          }
          this.isLoadingStudents = false;
        },
        error: () => {
          this.allStudents = [];
          if (!this.selectedCircleId) {
            this.students = [];
          }
          this.isLoadingStudents = false;
        }
      });
  }

  private mapLookupToStudentOption(user: LookUpUserDto): StudentOption {
    const name = user.fullName || user.email || `Student #${user.id}`;
    return {
      id: user.id,
      name
    };
  }

  private onCircleChange(circleId: number | null): void {
    this.selectedCircleId = circleId ?? undefined;
    this.filterForm.patchValue({ studentId: null }, { emitEvent: false });

    if (circleId) {
      this.isLoadingStudents = true;
      this.circleService.get(circleId).subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.students) {
            const mapped = res.data.students
              .map((s) => this.mapCircleStudentToOption(s))
              .filter((s): s is StudentOption => !!s);
            const unique = new Map(mapped.map((s) => [s.id, s]));
            this.students = Array.from(unique.values());
          } else {
            this.students = [];
          }
          this.isLoadingStudents = false;
          this.applyFilters();
        },
        error: () => {
          this.students = [];
          this.isLoadingStudents = false;
          this.applyFilters();
        }
      });
    } else {
      this.students = [...this.allStudents];
      this.applyFilters();
    }
  }

  private mapCircleStudentToOption(student: CircleStudentDto): StudentOption | undefined {
    const studentData = student.student as LookUpUserDto | undefined;
    const id = studentData?.id ?? student.studentId ?? student.id;
    if (id === undefined || id === null) {
      return undefined;
    }
    const name =
      studentData?.fullName ||
      student.fullName ||
      (typeof id === 'number' ? `Student #${id}` : `Student #${Number(id)}`);
    return {
      id: Number(id),
      name
    };
  }

  private applyFilters(): void {
    const { circleId, studentId } = this.filterForm.value;
    this.selectedCircleId = circleId ?? undefined;
    this.selectedStudentId = studentId ?? undefined;
    this.filter.skipCount = 0;
    this.paginator()?.firstPage();
    this.loadReports();
  }

  onSearch(): void {
    const term = (this.filterForm.value.searchTerm || '').toString().trim();
    this.filter.searchTerm = term.length ? term : undefined;
    this.filter.skipCount = 0;
    this.paginator()?.firstPage();
    this.loadReports();
  }

  clearSearch(): void {
    this.filterForm.patchValue({ searchTerm: '' }, { emitEvent: false });
    this.onSearch();
  }

  private loadReports(): void {
    this.isLoading = true;
    this.reportService
      .getAll(this.filter, {
        circleId: this.selectedCircleId,
        studentId: this.selectedStudentId,
        teacherId: this.teacherId
      })
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            this.dataSource.data = res.data.items;
            this.totalCount = res.data.totalCount;
          } else {
            this.dataSource.data = [];
            this.totalCount = 0;
          }
          this.isLoading = false;
        },
        error: () => {
          this.dataSource.data = [];
          this.totalCount = 0;
          this.isLoading = false;
          this.toast.error('Error loading reports');
        }
      });
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

  getStatusLabel(status?: number | null): string {
    switch (status) {
      case AttendStatusEnum.Attended:
        return 'Attended';
      case AttendStatusEnum.ExcusedAbsence:
        return 'Excused absence';
      case AttendStatusEnum.UnexcusedAbsence:
        return 'Unexcused absence';
      default:
        return '—';
    }
  }

  formatDate(value?: string | Date | null): string {
    if (!value) {
      return '—';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
  }
}
