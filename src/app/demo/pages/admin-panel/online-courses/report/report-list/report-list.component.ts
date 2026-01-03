import { AfterViewInit, Component, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportAddDto,
  CircleReportListDto,
  CircleReportService
} from 'src/app/@theme/services/circle-report.service';
import { CircleDto, CircleService, CircleStudentDto } from 'src/app/@theme/services/circle.service';
import {
  ApiResponse,
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
import { RESIDENCY_GROUP_OPTIONS, ResidencyGroupFilter } from 'src/app/@theme/types/residency-group';
import { matchesResidencyGroup } from 'src/app/@theme/utils/nationality.utils';
import { TranslateService } from '@ngx-translate/core';

import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';

interface StudentOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-report-list',
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
export class ReportListComponent implements OnInit, AfterViewInit, OnDestroy {
  private reportService = inject(CircleReportService);
  private circleService = inject(CircleService);
  private lookupService = inject(LookupService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);

  readonly paginator = viewChild.required(MatPaginator);

  filterForm: FormGroup = this.fb.group({
    searchTerm: [''],
    circleId: [null],
    studentId: [null],
    nationalityId: [null],
    residentGroup: ['all']
  });

  displayedColumns: string[] = ['student', 'circle', 'status', 'creationTime', 'actions'];
  dataSource = new MatTableDataSource<CircleReportListDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  circles: CircleDto[] = [];
  students: StudentOption[] = [];
  private allStudents: StudentOption[] = [];
  nationalities: NationalityDto[] = [];
  residencyGroupOptions = RESIDENCY_GROUP_OPTIONS;

  isLoading = false;
  isLoadingStudents = false;

  private destroy$ = new Subject<void>();

  private selectedCircleId?: number;
  private selectedStudentId?: number;
  private selectedNationalityId?: number | null;
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
      .get('nationalityId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((nationalityId) => this.onNationalityChange(nationalityId));

    this.filterForm
      .get('residentGroup')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((group: ResidencyGroupFilter | null) => this.onResidencyGroupChange(group));
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

  private loadNationalities(): void {
    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess && Array.isArray(res.data)) {
        this.nationalities = res.data;
      } else {
        this.nationalities = [];
      }
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
        this.selectedNationalityId ?? undefined
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            const mapped = res.data.items
              .filter(
                (s) =>
                  this.matchesSelectedNationality(s.nationalityId) &&
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
              .filter((student) =>
                this.matchesSelectedNationality(
                  (student.student as LookUpUserDto | undefined)?.nationalityId
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
    this.filter.residentGroup = this.selectedResidencyGroup;
    this.filter.skipCount = 0;
    this.paginator()?.firstPage();
    this.loadReports();
  }

  private onNationalityChange(nationalityId: number | null): void {
    this.selectedNationalityId = nationalityId && nationalityId > 0 ? nationalityId : null;
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

  private matchesSelectedNationality(nationalityId?: number | null): boolean {
    if (!this.selectedNationalityId || this.selectedNationalityId <= 0) {
      return true;
    }
    return nationalityId === this.selectedNationalityId;
  }

  private matchesSelectedResidency(residentId?: number | null): boolean {
    if (!this.selectedResidencyGroup || this.selectedResidencyGroup === 'all') {
      return true;
    }
    const nationality = this.getNationalityById(residentId);
    return matchesResidencyGroup(nationality ?? null, this.selectedResidencyGroup);
  }

  private getNationalityById(id?: number | null): NationalityDto | undefined {
    if (id === null || id === undefined) {
      return undefined;
    }
    return this.nationalities.find((n) => n.id === Number(id));
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
    this.filter.residentGroup = this.selectedResidencyGroup;
    this.reportService
      .getAll(this.filter, {
        circleId: this.selectedCircleId,
        studentId: this.selectedStudentId,
        teacherId: this.teacherId,
        nationalityId: this.selectedNationalityId ?? undefined,
        residentGroup: this.selectedResidencyGroup
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

  getStatusConfig(status?: number | null): { label: string; class: string } {
    const defaultConfig = {
      label: this.translate.instant('Attendance.Unknown'),
      class: 'status-pill--muted'
    };

    switch (status) {
      case AttendStatusEnum.Attended:
        return { label: this.translate.instant('Attendance.Attended'), class: 'status-pill--success' };
      case AttendStatusEnum.ExcusedAbsence:
        return { label: this.translate.instant('Attendance.ExcusedAbsence'), class: 'status-pill--warning' };
      case AttendStatusEnum.UnexcusedAbsence:
        return { label: this.translate.instant('Attendance.UnexcusedAbsence'), class: 'status-pill--danger' };
      default:
        return defaultConfig;
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

  getTeacherDisplay(report: CircleReportListDto): string {
    return (
      (report.teacherName as string | undefined) ||
      (report['teacher'] as string | undefined) ||
      (report['teacherFullName'] as string | undefined) ||
      (typeof report.teacherId === 'number' ? `Teacher #${report.teacherId}` : '')
    );
  }

  onSendWhatsApp(report: CircleReportListDto): void {
    const reportId = Number(report.id);
    if (!Number.isFinite(reportId)) {
      return;
    }

    const studentId = report.studentId ? Number(report.studentId) : null;
    const reportDetails$ = this.reportService.get(reportId);
    const studentDetails$ = studentId ? this.lookupService.getUserDetails(studentId) : of(null);

    this.isLoading = true;
    forkJoin({ report: reportDetails$, student: studentDetails$ }).subscribe({
      next: ({ report: reportResponse, student: studentResponse }) => {
        this.isLoading = false;
        if (!reportResponse?.isSuccess || !reportResponse.data) {
          this.toast.error(this.translate.instant('Unable to load report'));
          return;
        }

        const payload = this.buildWhatsAppPayload(
          report,
          reportResponse.data,
          this.extractStudentPhone(studentResponse)
        );
        this.openWhatsAppDialog(payload);
      },
      error: () => {
        this.isLoading = false;
        this.toast.error(this.translate.instant('Unable to load report'));
      }
    });
  }

  private extractStudentPhone(
    response: ApiResponse<LookUpUserDto> | null
  ): string | null {
    if (!response?.isSuccess || !response.data) {
      return null;
    }
    return response.data.mobile || null;
  }

  private buildWhatsAppPayload(
    report: CircleReportListDto,
    details: CircleReportAddDto,
    phone: string | null
  ): WhatsAppDialogPayload {
    const studentName = this.getStudentDisplay(report) || this.translate.instant('طالب');
    const circleName = this.getCircleDisplay(report) || '—';
    const teacherName = this.getTeacherDisplay(report) || '—';
    const statusLabel = this.getStatusConfig(details.attendStatueId ?? report.attendStatueId).label;
    const minutes = details.minutes ?? report.minutes ?? '—';

    const header = `تقرير الطالب ${studentName}\nالحلقة: ${circleName}\nالمعلم: ${teacherName}\nالحالة: ${statusLabel}\nالدقائق: ${minutes}`;
    const attendedDetails =
      Number(details.attendStatueId) === AttendStatusEnum.Attended
        ? this.buildAttendedDetails(details)
        : '';
    const message = attendedDetails ? `${header}\n${attendedDetails}` : header;

    return {
      studentName,
      phone,
      message
    };
  }

  private buildAttendedDetails(model: CircleReportAddDto): string {
    const lines: string[] = [];
    const surahName = this.getSurahName(model.newId);

    if (surahName) {
      lines.push(`السورة الجديدة: ${surahName}`);
    }
    if (model.newFrom) {
      lines.push(`الجديد من: ${model.newFrom}`);
    }
    if (model.newTo) {
      lines.push(`الجديد إلى: ${model.newTo}`);
    }
    if (model.newRate) {
      lines.push(`تقييم الجديد: ${model.newRate}`);
    }
    if (model.recentPast) {
      lines.push(`الماضي القريب: ${model.recentPast}`);
    }
    if (model.recentPastRate) {
      lines.push(`تقييم الماضي القريب: ${model.recentPastRate}`);
    }
    if (model.distantPast) {
      lines.push(`الماضي البعيد: ${model.distantPast}`);
    }
    if (model.distantPastRate) {
      lines.push(`تقييم الماضي البعيد: ${model.distantPastRate}`);
    }
    if (model.farthestPast) {
      lines.push(`الأبعد: ${model.farthestPast}`);
    }
    if (model.farthestPastRate) {
      lines.push(`تقييم الأبعد: ${model.farthestPastRate}`);
    }
    if (model.theWordsQuranStranger) {
      lines.push(`غريب القرآن: ${model.theWordsQuranStranger}`);
    }
    if (model.intonation) {
      lines.push(`التجويد: ${model.intonation}`);
    }
    if (model.other) {
      lines.push(`ملاحظات: ${model.other}`);
    }

    return lines.join('\n');
  }

  private getSurahName(value?: number | null): string | null {
    if (!value) {
      return null;
    }
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
      if (!result?.phone) {
        return;
      }
      this.launchWhatsApp(result.phone, payload.message);
    });
  }

  private launchWhatsApp(phone: string, message: string): void {
    const url = message
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${phone}`;
    window.open(url, '_blank');
  }
}

interface WhatsAppDialogPayload {
  studentName: string;
  phone: string | null;
  message: string;
}

@Component({
  selector: 'app-report-whatsapp-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>إرسال التقرير عبر واتساب</h2>
    <mat-dialog-content>
      <p>تأكد من رقم الطالب <strong>{{ data.studentName }}</strong> قبل الإرسال.</p>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>رقم واتساب</mat-label>
        <input matInput [formControl]="phoneControl" placeholder="مثال: 201234567890" />
        <mat-error *ngIf="phoneControl.hasError('required')">رقم الواتساب مطلوب</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="onSend()" [disabled]="phoneControl.invalid">
        إرسال واتساب
      </button>
    </mat-dialog-actions>
  `
})
export class ReportWhatsAppDialogComponent {
  private dialogRef = inject(MatDialogRef<ReportWhatsAppDialogComponent>);
  readonly data = inject<WhatsAppDialogPayload>(MAT_DIALOG_DATA);

  phoneControl = new FormControl(this.data.phone ?? '', { validators: [Validators.required], nonNullable: true });

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSend(): void {
    const normalized = this.normalizePhone(this.phoneControl.value);
    if (!normalized) {
      this.phoneControl.setErrors({ required: true });
      return;
    }
    this.dialogRef.close({ phone: normalized });
  }

  private normalizePhone(value: string): string {
    return (value ?? '').replace(/\D/g, '');
  }
}
