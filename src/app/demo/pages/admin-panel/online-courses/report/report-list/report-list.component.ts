import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
import { TranslateService } from '@ngx-translate/core';

import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';

interface StudentOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-report-list',
  // لو انت Standalone فعلاً فعل السطر ده:
  // standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    RouterModule,
    LoadingOverlayComponent,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.scss'
})
export class ReportListComponent implements OnInit, OnDestroy {
  private reportService = inject(CircleReportService);
  private circleService = inject(CircleService);
  private lookupService = inject(LookupService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef)

  filterForm: FormGroup = this.fb.group({
    searchTerm: [''],
    circleId: [null],
    studentId: [null],
    residentId: [null],
    residentGroup: ['all']
  });

  displayedColumns: string[] = ['student', 'circle', 'status', 'creationTime', 'minutes', 'actions'];
  dataSource = new MatTableDataSource<CircleReportListDto>();

  // 🔢 خصائص الباجينيتور – سيرفر سايد
  totalCount = 0; // إجمالي عدد الريكوردز من الـ API (207 مثلاً)
  pageSize = 10; // عدد العناصر في الصفحة
  pageIndex = 0; // 0-based

  filter: FilteredResultRequestDto = {
    skipCount: 0,
    maxResultCount: 10
  };

  circles: CircleDto[] = [];
  students: StudentOption[] = [];
  private allStudents: StudentOption[] = [];
  nationalities: NationalityDto[] = [];
  residencyGroupOptions = RESIDENCY_GROUP_OPTIONS;

  isLoading = false;
  isLoadingStudents = false;
  isLoadingMore = false;
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
  private selectedResidentId?: number | null;
  private selectedResidencyGroup: ResidencyGroupFilter = 'all';
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
    this.loadNationalities();
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

    this.filterForm
      .get('residentId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((residentId) => this.onResidencyChange(residentId));

    this.filterForm
      .get('residentGroup')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((group: ResidencyGroupFilter | null) => this.onResidencyGroupChange(group));
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────── Circles / Nationalities / Students ─────────

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
    this.isLoadingStudents = true;
    this.lookupService
      .getUsersForSelects(
        {
          skipCount: 0,
          maxResultCount: 100,
          searchTerm: searchTerm?.trim() || undefined,
          residentGroup: this.selectedResidencyGroup
        },
        Number(UserTypesEnum.Student),
        0,
        0,
        0,
        this.selectedResidentId ?? undefined
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            const mapped = res.data.items
              .filter(
                (s) =>
                  this.matchesSelectedResidentId(s.residentId) &&
                  this.matchesSelectedResidency(s.residentId)
              )
              .map((s) => this.mapLookupToStudentOption(s));
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
    return { id: user.id, name };
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
              .filter((student) =>
                this.matchesSelectedResidentId(
                  (student.student as LookUpUserDto | undefined)?.residentId
                ) &&
                this.matchesSelectedResidency(
                  (student.student as LookUpUserDto | undefined)?.residentId ?? null
                )
              )
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

  private applyFilters(): void {
    const { circleId, studentId } = this.filterForm.value;
    this.selectedCircleId = circleId ?? undefined;
    this.selectedStudentId = studentId ?? undefined;
    this.filter.residentGroup = this.selectedResidencyGroup;
    this.filter.skipCount = 0;
    this.pageIndex = 0;
    this.loadReports();
  }

  private onResidencyChange(residentId: number | null): void {
    this.selectedResidentId = residentId && residentId > 0 ? residentId : null;
    this.filterForm.patchValue({ studentId: null }, { emitEvent: false });
    this.students = [];
    this.loadAllStudents();
    const circleId = this.selectedCircleId ?? null;
    if (circleId !== null) {
      this.onCircleChange(circleId);
    } else {
      this.applyFilters();
    }
  }

  private onResidencyGroupChange(group: ResidencyGroupFilter | null): void {
    this.selectedResidencyGroup = group ?? 'all';
    this.filterForm.patchValue({ studentId: null }, { emitEvent: false });
    this.students = [];
    this.loadAllStudents();
    const circleId = this.selectedCircleId ?? null;
    if (circleId !== null) {
      this.onCircleChange(circleId);
    } else {
      this.applyFilters();
    }
  }

  private matchesSelectedResidentId(residentId?: number | null): boolean {
    if (!this.selectedResidentId || this.selectedResidentId <= 0) return true;
    return residentId === this.selectedResidentId;
  }

  private matchesSelectedResidency(residentId?: number | null): boolean {
    if (!this.selectedResidencyGroup || this.selectedResidencyGroup === 'all') return true;
    const nationality = this.getNationalityById(residentId);
    return matchesResidencyGroup(nationality ?? null, this.selectedResidencyGroup);
  }

  private getNationalityById(id?: number | null): NationalityDto | undefined {
    if (id === null || id === undefined) return undefined;
    return this.nationalities.find((n) => n.id === Number(id));
  }

  // ───────── Search / Filters ─────────

  onSearch(): void {
    const term = (this.filterForm.value.searchTerm || '').toString().trim();
    this.filter.searchTerm = term.length ? term : undefined;

    this.pageIndex = 0;
    this.loadReports();
  }

  clearSearch(): void {
    this.filterForm.patchValue({ searchTerm: '' }, { emitEvent: false });
    this.onSearch();
  }


 
  // ───────── Server-side Pagination: Reports ─────────

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
        residentGroup: this.selectedResidencyGroup
      })
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            this.dataSource.data = append
              ? [...this.dataSource.data, ...res.data.items]
              : res.data.items;
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
          this.toast.error('Error loading reports');
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

  // ───────── Display Helpers ─────────

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
    const def = {
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
        return def;
    }
  }

  formatDate(value?: string | Date | null): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  }

  getTeacherDisplay(report: CircleReportListDto): string {
    return (
      (report.teacherName as string | undefined) ||
      (report['teacher'] as string | undefined) ||
      (report['teacherFullName'] as string | undefined) ||
      (typeof report.teacherId === 'number' ? `Teacher #${report.teacherId}` : '')
    );
  }

  // ───────── WhatsApp Logic ─────────

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
    if (model.newRate) lines.push(`تقييم الجديد: ${model.newRate}`);
    if (model.recentPast) lines.push(`الماضي القريب: ${model.recentPast}`);
    if (model.recentPastRate) lines.push(`تقييم الماضي القريب: ${model.recentPastRate}`);
    if (model.distantPast) lines.push(`الماضي البعيد: ${model.distantPast}`);
    if (model.distantPastRate) lines.push(`تقييم الماضي البعيد: ${model.distantPastRate}`);
    if (model.farthestPast) lines.push(`الأبعد: ${model.farthestPast}`);
    if (model.farthestPastRate) lines.push(`تقييم الأبعد: ${model.farthestPastRate}`);
    if (model.theWordsQuranStranger) lines.push(`غريب القرآن: ${model.theWordsQuranStranger}`);
    if (model.intonation) lines.push(`التجويد: ${model.intonation}`);
    if (model.other) lines.push(`ملاحظات: ${model.other}`);

    return lines.join('\n');
  }

  private getSurahName(value?: number | null): string | null {
    if (!value) return null;
    const key = (Object.keys(QuranSurahEnum) as Array<keyof typeof QuranSurahEnum>).find(
      (k) => QuranSurahEnum[k] === Number(value)
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
    const url = message ? `https://wa.me/?text=${encodeURIComponent(message)}` : `https://wa.me/`;
    window.open(url, '_blank');
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
      <button mat-flat-button color="primary" type="button" (click)="onSend()">
        إرسال واتساب
      </button>
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
