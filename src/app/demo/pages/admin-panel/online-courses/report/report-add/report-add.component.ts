import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportService,
  CircleReportAddDto,
  CircleReportListDto
} from 'src/app/@theme/services/circle-report.service';
import { CircleService, CircleDto } from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AttendStatusEnum } from 'src/app/@theme/types/AttendStatusEnum';
import {
  FilteredResultRequestDto,
  LookUpUserDto,
  LookupService
} from 'src/app/@theme/services/lookup.service';
import { QuranSurahEnum } from 'src/app/@theme/types/QuranSurahEnum';

type ReportState = Partial<CircleReportAddDto> & Partial<CircleReportListDto>;

@Component({
  selector: 'app-report-add',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './report-add.component.html',
  styleUrl: './report-add.component.scss'
})
export class ReportAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CircleReportService);
  private circleService = inject(CircleService);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private lookupService = inject(LookupService);

  reportForm!: FormGroup;
  private reportId?: number;
  private preselectedStudentId?: number;

  // عشان نستخدمهم في الـ HTML
  UserTypesEnum = UserTypesEnum;
  AttendStatusEnum = AttendStatusEnum;

  selectedStatus?: AttendStatusEnum;
  mode: 'add' | 'update' = 'add';
  cardTitle = 'Add Circle Report';
  submitLabel = 'Create';

  managers: LookUpUserDto[] = [];
  teachers: LookUpUserDto[] = [];
  circles: CircleDto[] = [];
  students: { id: number; name: string }[] = [];

  isLoadingManagers = false;
  isLoadingTeachers = false;
  isLoadingCircles = false;
  isLoadingStudents = false;

  lockManagerSelection = false;
  lockTeacherSelection = false;
  lockCircleSelection = true;

  private readonly userFilter: FilteredResultRequestDto = { lookupOnly: true };

  surahList = Object.keys(QuranSurahEnum)
    .filter((key) => isNaN(Number(key)))
    .map((key) => ({
      id: QuranSurahEnum[key as keyof typeof QuranSurahEnum],
      name: key
    }));

  // ================================
  // Helpers على اليوزر والدور
  // ================================
  private get currentUser(): any {
    const raw = this.auth.currentUserValue as any;
    return raw?.user ?? raw ?? null;
  }

  private getUserId(): number | undefined {
    const raw =
      (this.auth.currentUserValue as any)?.user?.id ??
      (this.auth.currentUserValue as any)?.id ??
      this.currentUser?.id ??
      this.currentUser?.userId;

    return this.toNumber(raw);
  }

  private getBranchId(): number | undefined {
    const raw =
      (this.auth.currentUserValue as any)?.user?.branchId ??
      (this.auth.currentUserValue as any)?.branchId ??
      this.currentUser?.branchId ??
      this.currentUser?.branch?.id;

    return this.toNumber(raw) ?? undefined;
  }

  private get userTypeNumber(): number {
    const raw =
      (this.auth.currentUserValue as any)?.user?.userTypeId ??
      (this.auth.currentUserValue as any)?.userTypeId ??
      this.currentUser?.userTypeId ??
      this.auth.getRole(); // مثال: "3" أو "4"

    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  get isSystemManager(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Admin); // "1"
  }

  get isBranchManager(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.BranchLeader); // "2"
  }

  get isSupervisor(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Manager); // "3"
  }

  get isTeacher(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Teacher); // "4"
  }

  // ================================
  // INIT
  // ================================
  ngOnInit(): void {
    this.mode = this.determineMode();
    if (this.mode === 'update') {
      this.cardTitle = 'Update Circle Report';
      this.submitLabel = 'Update';
    }

    console.log('[ReportAdd] init role info', {
      currentUser: this.currentUser,
      userTypeId: this.currentUser?.userTypeId,
      authRole: this.auth.getRole(),
      userTypeNumber: this.userTypeNumber,
      isSystemManager: this.isSystemManager,
      isBranchManager: this.isBranchManager,
      isSupervisor: this.isSupervisor,
      isTeacher: this.isTeacher
    });

    this.buildForm();
    this.toggleFields();

    if (this.mode === 'add') {
      // وضع الإضافة ➜ شغّل سيناريوهات اختيار مشرف/معلم/حلقة/طالب
      this.initAddMode();
      this.initializeSelectionFlow();
    } else {
      // وضع التعديل ➜ تحميل بيانات التقرير فقط وتعديلها
      this.initUpdateMode();

      // قفل العلاقات (مش ظاهرة في الـ UI لكن للتأكيد)
      this.reportForm.get('managerId')?.disable({ emitEvent: false });
      this.reportForm.get('teacherId')?.disable({ emitEvent: false });
      this.reportForm.get('circleId')?.disable({ emitEvent: false });
      this.reportForm.get('studentId')?.disable({ emitEvent: false });
    }
  }

  private buildForm(): void {
    this.reportForm = this.fb.group({
      minutes: [],
      newId: [],
      newFrom: [''],
      newTo: [''],
      newRate: [''],
      recentPast: [''],
      recentPastRate: [''],
      distantPast: [''],
      distantPastRate: [''],
      farthestPast: [''],
      farthestPastRate: [''],
      theWordsQuranStranger: [''],
      intonation: [''],
      other: [''],

      creationTime: [new Date(), Validators.required],

      managerId: [null],
      teacherId: [null, Validators.required],
      circleId: [null, Validators.required],
      studentId: [null, Validators.required],
      attendStatueId: []
    });
  }

  private initAddMode(): void {
    const course = history.state.circle as CircleDto | undefined;
    if (course) {
      this.reportForm.patchValue({
        teacherId: course.teacherId ?? course.teacher?.id,
        circleId: course.id
      });
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.preselectedStudentId = id;
      this.reportForm.get('studentId')?.setValue(id);
    }
  }

  private initUpdateMode(): void {
    const reportId = Number(this.route.snapshot.paramMap.get('id'));
    if (reportId) {
      this.reportId = reportId;
      const report = this.getReportFromState(reportId);
      if (report) {
        this.populateFormFromReport(report, reportId);
      } else {
        this.toast.error(
          this.translate.instant(
            'Report details are unavailable. Please return to the list and select a report to edit.'
          )
        );
      }
    } else {
      this.toast.error(this.translate.instant('Invalid report identifier'));
    }
  }

  // ================================
  // ROLE-BASED FLOW (يُستخدم في وضع الإضافة فقط)
  // ================================
  private initializeSelectionFlow(): void {
    // 4) Teacher
    if (this.isTeacher) {
      this.lockManagerSelection = true;
      this.lockTeacherSelection = true;
      this.lockCircleSelection = true;

      const teacherCtrl = this.reportForm.get('teacherId');
      teacherCtrl?.clearValidators();
      teacherCtrl?.updateValueAndValidity();

      const teacherId = this.getUserId();
      if (teacherId) {
        this.reportForm.patchValue({ teacherId }, { emitEvent: false });
      }
      console.log('[ReportAdd] Teacher flow', { teacherId });

      this.loadCirclesForTeacher(teacherId ?? 0, true);
      return;
    }

    // 3) Supervisor
    if (this.isSupervisor) {
      this.lockManagerSelection = true;

      const supervisorId = this.getUserId();
      const branchId = this.getBranchId();

      console.log('[ReportAdd] Supervisor flow', { supervisorId, branchId });

      if (supervisorId) {
        this.reportForm.patchValue({ managerId: supervisorId }, { emitEvent: false });
      } else {
        this.reportForm.patchValue({ managerId: null }, { emitEvent: false });
      }

      this.loadTeachersForManager(
        supervisorId ?? 0,
        undefined,
        true,
        branchId,
        true
      );

      return;
    }

    const existingTeacherId = this.toNumber(this.reportForm.get('teacherId')?.value);

    // 2) Branch Manager
    if (this.isBranchManager) {
      console.log('[ReportAdd] BranchManager flow');
      this.loadManagers(true, existingTeacherId);
      return;
    }

    // 1) System Admin
    if (this.isSystemManager) {
      console.log('[ReportAdd] SystemManager flow');
      this.loadManagers(true, existingTeacherId);
      return;
    }

    // Fallback
    console.log('[ReportAdd] Fallback flow');
    if (existingTeacherId) {
      this.loadTeachersForManager(0, existingTeacherId, true);
    } else {
      this.loadManagers();
    }
  }

  // ================================
  // UI VISIBILITY
  // ================================
  get showSupervisorSelector(): boolean {
    // مدير نظام + مدير فرع فقط وفي وضع الإضافة فقط
    return this.mode === 'add' && (this.isSystemManager || this.isBranchManager);
  }

  get showTeacherSelector(): boolean {
    // مدير نظام + مدير فرع + مشرف وفي وضع الإضافة فقط
    return (
      this.mode === 'add' &&
      (this.isSystemManager || this.isBranchManager || this.isSupervisor)
    );
  }

  get showCircleSelector(): boolean {
    return false; // الحلقة دايمًا auto
  }

  // جديد: إظهار الطالب في وضع الإضافة فقط
  get showStudentSelector(): boolean {
    return this.mode === 'add';
  }

  // ================================
  // LOAD MANAGERS (SUPERVISORS)
  // ================================
  private loadManagers(autoSelectFirst = false, teacherId?: number | null): void {
    this.isLoadingManagers = true;

    const branchId =
      this.isBranchManager || this.isSupervisor ? this.getBranchId() ?? 0 : 0;

    console.log('[ReportAdd] loadManagers', { branchId });

    this.lookupService
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager), 0, 0, branchId)
      .subscribe({
        next: (res) => {
          this.managers = res.isSuccess ? res.data.items : [];
          this.isLoadingManagers = false;

          console.log('[ReportAdd] managers loaded', this.managers);

          if (autoSelectFirst && this.managers.length > 0) {
            const managerId = this.toNumber(this.managers[0].id) ?? 0;
            this.reportForm.patchValue({ managerId }, { emitEvent: false });
            this.onManagerChange(managerId, true, teacherId ?? null);
          }
        },
        error: () => {
          this.managers = [];
          this.isLoadingManagers = false;
        }
      });
  }

  onManagerChange(managerId: number | null, initial = false, teacherId?: number | null): void {
    console.log('[ReportAdd] onManagerChange', { managerId, initial, teacherId });

    if (!initial) {
      this.reportForm.patchValue({ teacherId: null, circleId: null, studentId: null });
    }
    this.circles = [];
    this.students = [];
    this.teachers = [];

    if (managerId === null || managerId === undefined) return;

    const existingTeacherId =
      teacherId ?? this.toNumber(this.reportForm.get('teacherId')?.value);
    const branchId = this.isSupervisor || this.isBranchManager ? this.getBranchId() : undefined;

    this.loadTeachersForManager(managerId, existingTeacherId, true, branchId);
  }

  // ================================
  // LOAD TEACHERS
  // ================================
  private loadTeachersForManager(
    managerId: number,
    teacherId?: number | null,
    loadCircles = false,
    branchId?: number | null,
    autoSelectFirst = false
  ): void {
    this.isLoadingTeachers = true;

    const effectiveManagerId =
      managerId || (this.isSupervisor ? this.getUserId() ?? 0 : 0);

    console.log('[ReportAdd] loadTeachersForManager', {
      managerId,
      effectiveManagerId,
      branchId
    });

    this.lookupService
      .getUsersForSelects(
        this.userFilter,
        Number(UserTypesEnum.Teacher),
        effectiveManagerId,
        0,
        branchId ?? 0
      )
      .subscribe({
        next: (res) => {
          this.teachers = res.isSuccess ? res.data.items : [];
          this.isLoadingTeachers = false;

          console.log('[ReportAdd] teachers loaded', this.teachers);

          const existingId =
            teacherId ?? this.toNumber(this.reportForm.get('teacherId')?.value);

          if (existingId && this.teachers.some((t) => this.toNumber(t.id) === existingId)) {
            this.reportForm.patchValue({ teacherId: existingId }, { emitEvent: false });
            if (loadCircles) {
              this.loadCirclesForTeacher(existingId, true);
            }
          } else if (autoSelectFirst && this.teachers.length === 1) {
            const firstTeacherId = this.toNumber(this.teachers[0].id);
            if (firstTeacherId) {
              this.reportForm.patchValue(
                { teacherId: firstTeacherId },
                { emitEvent: false }
              );
              if (loadCircles) {
                this.loadCirclesForTeacher(firstTeacherId, true);
              }
            }
          }
        },
        error: () => {
          this.teachers = [];
          this.isLoadingTeachers = false;
        }
      });
  }

  // ================================
  // TEACHER CHANGE
  // ================================
  onTeacherChange(teacherId: number | null): void {
    console.log('[ReportAdd] onTeacherChange', { teacherId });

    this.reportForm.patchValue({ circleId: null, studentId: null });
    this.circles = [];
    this.students = [];

    if (!teacherId) return;

    const teacher = this.teachers.find((t) => this.toNumber(t.id) === teacherId);
    if (teacher?.managerId && !this.isSupervisor) {
      const mgrId = this.toNumber(teacher.managerId);
      if (mgrId) {
        this.reportForm.patchValue({ managerId: mgrId }, { emitEvent: false });
      }
    }

    this.loadCirclesForTeacher(teacherId, true);
  }

  // ================================
  // LOAD CIRCLES BY TEACHER
  // ================================
  private loadCirclesForTeacher(teacherId: number, autoSelect = false): void {
    this.isLoadingCircles = true;

    const effectiveTeacherId = teacherId || this.getUserId() || 0;

    console.log('[ReportAdd] loadCirclesForTeacher', {
      teacherId,
      effectiveTeacherId
    });

    this.circleService.getAll(this.userFilter, undefined, effectiveTeacherId).subscribe({
      next: (res) => {
        this.circles = res.isSuccess ? res.data.items : [];
        this.isLoadingCircles = false;

        console.log('[ReportAdd] circles loaded', this.circles);

        if (autoSelect && this.circles.length > 0) {
          const currentCircle = this.toNumber(this.reportForm.get('circleId')?.value);
          const targetCircle =
            currentCircle && this.circles.some((c) => c.id === currentCircle)
              ? currentCircle
              : this.circles[0]?.id ?? null;

          if (targetCircle) {
            this.reportForm.patchValue({ circleId: targetCircle }, { emitEvent: false });
            this.onCircleChange(targetCircle);
          }
        }
      },
      error: () => {
        this.circles = [];
        this.isLoadingCircles = false;
      }
    });
  }

  // ================================
  // LOAD STUDENTS BY CIRCLE
  // ================================
  onCircleChange(circleId: number | null): void {
    console.log('[ReportAdd] onCircleChange', { circleId });

    const existingStudentId =
      this.toNumber(this.reportForm.get('studentId')?.value) ?? this.preselectedStudentId;

    this.reportForm.patchValue({ studentId: null });
    this.students = [];

    if (!circleId) return;

    this.isLoadingStudents = true;

    this.circleService.get(circleId).subscribe({
      next: (res) => {
        console.log('[ReportAdd] circle details', res);

        if (res.isSuccess && res.data?.students) {
          const selectedTeacherId = this.toNumber(this.reportForm.get('teacherId')?.value);

          const relevantStudents = selectedTeacherId
            ? res.data.students.filter((student: any) => {
                const tId = this.toNumber(student.teacherId);
                return tId === undefined || tId === selectedTeacherId;
              })
            : res.data.students;

          const mapped = relevantStudents
            .map((student: any) => this.mapStudent(student))
            .filter(
              (s): s is { id: number; name: string } =>
                !!s
            );

          const unique = new Map(mapped.map((s) => [s.id, s]));
          this.students = Array.from(unique.values());

          const targetStudent = existingStudentId;
          if (targetStudent && this.students.some((s) => s.id === targetStudent)) {
            this.reportForm.patchValue({ studentId: targetStudent }, { emitEvent: false });
            this.preselectedStudentId = undefined;
          }
        }
        this.isLoadingStudents = false;
      },
      error: () => {
        this.students = [];
        this.isLoadingStudents = false;
      }
    });
  }

  private mapStudent(
    student: CircleDto['students'] extends (infer U)[] | null | undefined ? U : never
  ) {
    const data = (student as any).student;
    const id = this.toNumber((student as any).studentId ?? (student as any).id);
    const name =
      data?.fullName ||
      (student as any).fullName ||
      (student as any).name ||
      (typeof id === 'number' ? `Student #${id}` : undefined);

    if (id === undefined || name === undefined) return undefined;

    return { id, name };
  }

  // ================================
  // STATUS-BASED FIELDS
  // ================================
  private allFields(): string[] {
    return [
      'minutes',
      'newId',
      'newFrom',
      'newTo',
      'newRate',
      'recentPast',
      'recentPastRate',
      'distantPast',
      'distantPastRate',
      'farthestPast',
      'farthestPastRate',
      'theWordsQuranStranger',
      'intonation',
      'other'
    ];
  }

  private toggleFields(): void {
    const controls = this.allFields();
    controls.forEach((c) => {
      this.reportForm.get(c)?.disable();
      this.reportForm.get(c)?.clearValidators();
      this.reportForm.get(c)?.updateValueAndValidity();
    });
  }

  onStatusChange(status: AttendStatusEnum): void {
    this.selectedStatus = status;
    const controls = this.allFields();

    controls.forEach((c) => {
      this.reportForm.get(c)?.disable();
      this.reportForm.get(c)?.clearValidators();
      this.reportForm.get(c)?.updateValueAndValidity();
    });

    if (status === AttendStatusEnum.Attended) {
      controls.forEach((c) => this.reportForm.get(c)?.enable());
    } else if (status === AttendStatusEnum.UnexcusedAbsence) {
      this.reportForm.get('minutes')?.enable();
      this.reportForm.get('minutes')?.setValidators([Validators.required]);
      this.reportForm.get('minutes')?.updateValueAndValidity();
    }
  }

  // ================================
  // UTILITIES
  // ================================
  getAttendStatusLabel(value: any): string {
    const v = Number(value);
    switch (v) {
      case AttendStatusEnum.Attended:
        return 'حضر';
      case AttendStatusEnum.ExcusedAbsence:
        return 'تغيب بعذر';
      case AttendStatusEnum.UnexcusedAbsence:
        return 'تغيب بدون عذر';
      default:
        return '';
    }
  }

  private resolveStatus(report: ReportState): AttendStatusEnum | undefined {
    const rawStatus = this.toNumber(
      report.attendStatueId ??
        (report as { attendStatus?: unknown; attendStatusId?: unknown }).attendStatusId
    );

    if (rawStatus === undefined) {
      return undefined;
    }

    switch (rawStatus) {
      case AttendStatusEnum.Attended:
      case AttendStatusEnum.ExcusedAbsence:
      case AttendStatusEnum.UnexcusedAbsence:
        return rawStatus;
      default:
        return undefined;
    }
  }

  private resolveDate(value: unknown): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toString(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    return String(value);
  }

  private getReportFromState(id: number): ReportState | undefined {
    const maybeState = (history.state?.report as ReportState | undefined) ?? undefined;
    if (!maybeState) return undefined;

    const stateId = this.toNumber((maybeState as { id?: unknown }).id ?? maybeState.id);
    if (!stateId || stateId !== id) return undefined;

    return { ...maybeState, id: stateId };
  }

  private extractEntityId(
    report: ReportState,
    key: 'circle' | 'student' | 'teacher'
  ): number | undefined {
    const record = report as Record<string, unknown>;
    const direct = this.toNumber(record[`${key}Id`]);
    if (direct !== undefined) return direct;

    const entity = record[key];
    if (entity && typeof entity === 'object') {
      const nestedId = this.toNumber((entity as Record<string, unknown>)['id']);
      if (nestedId !== undefined) return nestedId;
    }

    return undefined;
  }

  private assignIfDefined<K extends keyof CircleReportAddDto>(
    target: Partial<CircleReportAddDto>,
    key: K,
    value: CircleReportAddDto[K] | undefined
  ): void {
    if (value !== undefined) {
      target[key] = value;
    }
  }

  private populateFormFromReport(report: ReportState, fallbackId: number): void {
    this.reportId = this.toNumber(report.id) ?? fallbackId;

    const status = this.resolveStatus(report);
    if (status !== undefined) {
      this.onStatusChange(status);
      this.reportForm.get('attendStatueId')?.setValue(status, { emitEvent: false });
    } else {
      this.selectedStatus = undefined;
      this.reportForm.get('attendStatueId')?.setValue(null, { emitEvent: false });
      this.toggleFields();
    }

    const creationTime = this.resolveDate(report.creationTime);

    const patch: Partial<CircleReportAddDto> = { creationTime };

    this.assignIfDefined(patch, 'minutes', this.toNumber(report.minutes));
    this.assignIfDefined(patch, 'newId', this.toNumber(report.newId));
    this.assignIfDefined(patch, 'newFrom', this.toString(report.newFrom));
    this.assignIfDefined(patch, 'newTo', this.toString(report.newTo));
    this.assignIfDefined(patch, 'newRate', this.toString(report.newRate));
    this.assignIfDefined(patch, 'recentPast', this.toString(report.recentPast));
    this.assignIfDefined(patch, 'recentPastRate', this.toString(report.recentPastRate));
    this.assignIfDefined(patch, 'distantPast', this.toString(report.distantPast));
    this.assignIfDefined(patch, 'distantPastRate', this.toString(report.distantPastRate));
    this.assignIfDefined(patch, 'farthestPast', this.toString(report.farthestPast));
    this.assignIfDefined(patch, 'farthestPastRate', this.toString(report.farthestPastRate));
    this.assignIfDefined(
      patch,
      'theWordsQuranStranger',
      this.toString(report.theWordsQuranStranger)
    );
    this.assignIfDefined(patch, 'intonation', this.toString(report.intonation));
    this.assignIfDefined(patch, 'other', this.toString(report.other));

    const circleId = this.extractEntityId(report, 'circle');
    const studentId = this.extractEntityId(report, 'student');
    const teacherId = this.extractEntityId(report, 'teacher');

    this.assignIfDefined(patch, 'circleId', circleId);
    this.assignIfDefined(patch, 'studentId', studentId);
    this.assignIfDefined(patch, 'teacherId', teacherId);

    if (studentId !== undefined) {
      this.preselectedStudentId = studentId;
    }

    this.reportForm.patchValue(patch, { emitEvent: false });
  }

  private determineMode(): 'add' | 'update' {
    const dataMode = this.route.snapshot.data['mode'] as 'add' | 'update' | undefined;
    if (dataMode) return dataMode;

    const path = this.route.snapshot.routeConfig?.path ?? '';
    if (path.includes('update') || path.includes('edit')) return 'update';
    return 'add';
  }

  // ================================
  // SUBMIT
  // ================================
  onSubmit(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    const formValue = this.reportForm.getRawValue() as CircleReportAddDto & {
      managerId?: number;
    };
    const { managerId: _managerId, ...model } = formValue;

    if (this.isTeacher && (!model.teacherId || model.teacherId === 0)) {
      const currentTeacherId = this.getUserId();
      if (currentTeacherId) {
        model.teacherId = currentTeacherId;
      }
    }

    if (this.mode === 'update') {
      if (!this.reportId) {
        this.toast.error(this.translate.instant('Missing report identifier'));
        return;
      }
      model.id = this.reportId;
      this.service.update(model).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.toast.success(this.translate.instant('Report updated successfully'));
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error(this.translate.instant('Unable to update report'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Error updating report'))
      });
    } else {
      this.service.create(model).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.toast.success(this.translate.instant('Report created successfully'));
            this.reportForm.reset();
            this.reportForm.get('creationTime')?.setValue(new Date());
            this.toggleFields();
            this.selectedStatus = undefined;

            const defaults: Partial<CircleReportAddDto> = { creationTime: new Date() };

            if (this.isTeacher) {
              const teacherId = this.getUserId();
              this.loadCirclesForTeacher(teacherId ?? 0, true);
            } else if (this.isSupervisor) {
              const supervisorId = this.getUserId();
              if (supervisorId) {
                this.reportForm.patchValue(
                  { managerId: supervisorId },
                  { emitEvent: false }
                );
                this.onManagerChange(supervisorId, true);
              } else {
                this.onManagerChange(0, true);
              }
            } else if (this.isSystemManager || this.isBranchManager) {
              this.loadManagers();
            }

            this.reportForm.patchValue(defaults, { emitEvent: false });
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error(this.translate.instant('Unable to create report'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Error creating report'))
      });
    }
  }
}
