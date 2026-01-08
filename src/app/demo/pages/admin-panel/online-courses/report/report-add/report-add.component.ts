import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { NgSelectModule } from '@ng-select/ng-select';

import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { CircleReportService, CircleReportAddDto } from 'src/app/@theme/services/circle-report.service';
import { CircleService } from 'src/app/@theme/services/circle.service';
import { LookupService, FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AttendStatusEnum } from 'src/app/@theme/types/AttendStatusEnum';
import { QuranSurahEnum } from 'src/app/@theme/types/QuranSurahEnum';

@Component({
  selector: 'app-report-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, RouterModule, MatDialogModule, MatButtonModule],
  templateUrl: './report-add.component.html',
  styleUrl: './report-add.component.scss'
})
export class ReportAddComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(CircleReportService);
  private circleService = inject(CircleService);
  private lookupService = inject(LookupService);
  private auth = inject(AuthenticationService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  private destroy$ = new Subject<void>();

  reportForm!: FormGroup;

  AttendStatusEnum = AttendStatusEnum;
  UserTypesEnum = UserTypesEnum;

  selectedStatus: AttendStatusEnum | null = null;

  // lists
  managers: any[] = [];
  teachers: any[] = [];
  students: { id: number; name: string; mobile?: string | null }[] = [];
  circles: any[] = [];

  attendStatusOptions = [
    { label: 'حضر', value: AttendStatusEnum.Attended },
    { label: 'تغيب بعذر', value: AttendStatusEnum.ExcusedAbsence },
    { label: 'تغيب بدون عذر', value: AttendStatusEnum.UnexcusedAbsence }
  ];

  surahList = Object.keys(QuranSurahEnum)
    .filter((k) => isNaN(Number(k)))
    .map((k) => ({
      id: QuranSurahEnum[k as keyof typeof QuranSurahEnum],
      name: k
    }));

  // loading/locks
  isLoadingManagers = false;
  isLoadingTeachers = false;
  isLoadingCircles = false;
  isLoadingStudents = false;
  isSubmitting = false;

  // mode
  mode: 'add' | 'update' = 'add';
  reportId: number | null = null;

  readonlyLabels: { manager: string; teacher: string; circle: string; student: string } = {
    manager: '',
    teacher: '',
    circle: '',
    student: ''
  };

  lockManagerSelection = false;
  lockTeacherSelection = false;

  private readonly userFilter: FilteredResultRequestDto = { lookupOnly: true };

  // ===== role helpers =====
  private get currentUser(): any {
    const raw = this.auth.currentUserValue as any;
    return raw?.user ?? raw ?? null;
  }

  private get userTypeNumber(): number {
    const raw =
      (this.auth.currentUserValue as any)?.user?.userTypeId ??
      (this.auth.currentUserValue as any)?.userTypeId ??
      this.currentUser?.userTypeId ??
      this.auth.getRole?.();
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  get isSystemManager(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Admin);
  }
  get isBranchManager(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.BranchLeader);
  }
  get isSupervisor(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Manager);
  }
  get isTeacher(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Teacher);
  }

  // ===== UI flags =====
  get showSupervisorSelector(): boolean {
    // Admin + Branch Manager only
    return this.isSystemManager || this.isBranchManager;
  }
  get showTeacherSelector(): boolean {
    // Admin + Branch Manager + Supervisor
    return this.isSystemManager || this.isBranchManager || this.isSupervisor;
  }

  private getUserId(): number | null {
    const raw =
      (this.auth.currentUserValue as any)?.user?.id ??
      (this.auth.currentUserValue as any)?.id ??
      this.currentUser?.id ??
      null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data?.['mode'] === 'update' ? 'update' : 'add';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.reportId = Number.isFinite(id) ? id : null;

    this.buildForm();
    this.applyRoleBasedValidators();   // ✅ مهم
    this.wireFormReactions();
    this.initRoleFlow();              // ✅ مهم

    if (this.mode === 'update' && this.reportId) {
      const patchedFromState = this.tryPatchFromState(this.reportId);
      if (!patchedFromState) {
        this.loadReportForEdit(this.reportId);
      }
    }

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // Form
  // =========================
  private buildForm(): void {
    this.reportForm = this.fb.group({
      // selectors
      managerId: [null],
      teacherId: [null],
      circleId: [null, Validators.required],
      studentId: [null, Validators.required],

      attendStatueId: [null, Validators.required],

      // minutes
      minutes: [null],

      // attended fields
      newId: [null],
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

      creationTime: ['']
    });
  }

  /**
   * ✅ هنا بنطبق "البيزنس":
   * - Admin/Branch: managerId required + teacherId required
   * - Supervisor: managerId ثابت (مقفول) + teacherId required
   * - Teacher: teacherId ثابت (مقفول) + managerId غير مطلوب
   */
  private applyRoleBasedValidators(): void {
    const manager = this.reportForm.get('managerId');
    const teacher = this.reportForm.get('teacherId');

    manager?.clearValidators();
    teacher?.clearValidators();

    if (this.isSystemManager || this.isBranchManager) {
      manager?.setValidators([Validators.required]);
      teacher?.setValidators([Validators.required]);
    } else if (this.isSupervisor) {
      manager?.setValidators([Validators.required]);
      teacher?.setValidators([Validators.required]);
    } else if (this.isTeacher) {
      // managerId not required
      teacher?.setValidators([Validators.required]);
    }

    manager?.updateValueAndValidity({ emitEvent: false });
    teacher?.updateValueAndValidity({ emitEvent: false });
  }

  // =========================
  // Wiring Cascades
  // =========================
  private wireFormReactions(): void {
    // Manager -> Teachers
    this.reportForm.get('managerId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((managerId) => {
        // reset below
        this.setValueSilent('teacherId', null);
        this.setValueSilent('circleId', null);
        this.setValueSilent('studentId', null);

        this.teachers = [];
        this.circles = [];
        this.students = [];

        if (managerId) this.loadTeachersForManager(Number(managerId));
      });

    // Teacher -> Circle -> Students
    this.reportForm.get('teacherId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((teacherId) => {
        this.setValueSilent('circleId', null);
        this.setValueSilent('studentId', null);

        this.circles = [];
        this.students = [];

        if (teacherId) this.loadCirclesForTeacher(Number(teacherId));
      });

    // Circle -> Students
    this.reportForm.get('circleId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((circleId) => {
        this.setValueSilent('studentId', null);
        this.students = [];

        if (circleId) this.loadStudentsForCircle(Number(circleId));
      });

    // Status rules
    this.reportForm.get('attendStatueId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((st) => this.applyStatusRules(st));
  }

  /**
   * ✅ مهم جداً:
   * بدل patchValue مع disabled controls ونستنى valueChanges،
   * هنا بننفذ سلسلة التحميل يدويًا حسب الدور.
   */
 private initRoleFlow(): void {
  const myId = this.getUserId();

  // ===== Teacher =====
  if (this.isTeacher) {
    this.lockManagerSelection = true;
    this.lockTeacherSelection = true;

    // teacher ثابت
    this.reportForm.get('teacherId')?.enable({ emitEvent: false });
    this.reportForm.get('teacherId')?.setValue(myId, { emitEvent: false });
    this.reportForm.get('teacherId')?.disable({ emitEvent: false });

    // manager مش مطلوب هنا
    this.reportForm.get('managerId')?.setValue(null, { emitEvent: false });
    this.reportForm.get('managerId')?.disable({ emitEvent: false });

    // ✅ مهم: نحمّل الحلقات مباشرة (بدون valueChanges)
    if (myId) this.loadCirclesForTeacher(Number(myId));
    return;
  }

  // ===== Supervisor =====
  if (this.isSupervisor) {
    this.lockManagerSelection = true;

    // manager ثابت = نفسه
    this.reportForm.get('managerId')?.enable({ emitEvent: false });
    this.reportForm.get('managerId')?.setValue(myId, { emitEvent: false });
    this.reportForm.get('managerId')?.disable({ emitEvent: false });

    // ✅ مهم: نحمّل المعلمين مباشرة (ده اللي هينادي GetUsersForSelects)
    if (myId) this.loadTeachersForManager(Number(myId));
    return;
  }

  // ===== Admin / Branch =====
  this.loadManagers();
}

  // =========================
  // Loaders
  // =========================
  private loadManagers(): void {
    this.isLoadingManagers = true;

    this.lookupService
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager), 0, 0, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = res.isSuccess ? res.data.items : [];
          this.managers = items.map((m: any) => ({
            id: Number(m.id),
            fullName: m.fullName,
            displayName: m.fullName || m.email || `المشرف #${m.id}`
          }));
          this.isLoadingManagers = false;
        },
        error: () => {
          this.managers = [];
          this.isLoadingManagers = false;
        }
      });
  }

  private loadTeachersForManager(
    managerId: number,
    options?: { preselectTeacherId?: number | null; preselectCircleId?: number | null; preselectStudentId?: number | null }
  ): void {
    this.isLoadingTeachers = true;

    this.lookupService
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Teacher), managerId, 0, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = res.isSuccess ? res.data.items : [];
          this.teachers = items.map((t: any) => ({
            id: Number(t.id),
            fullName: t.fullName,
            displayName: t.fullName || t.email || `Teacher #${t.id}`
          }));
          this.isLoadingTeachers = false;

          if (options?.preselectTeacherId) {
            const exists = this.teachers.some((t) => t.id === options.preselectTeacherId);
            if (exists) {
              this.reportForm.get('teacherId')?.setValue(options.preselectTeacherId, { emitEvent: false });
              if (options.preselectCircleId) {
                this.loadCirclesForTeacher(options.preselectTeacherId, {
                  preselectCircleId: options.preselectCircleId,
                  preselectStudentId: options.preselectStudentId
                });
              }
              return;
            }
          }

          // لو فيه معلم واحد: اختاره تلقائيًا
          if (this.teachers.length === 1) {
            this.reportForm.get('teacherId')?.setValue(this.teachers[0].id, { emitEvent: true });
          }
        },
        error: () => {
          this.teachers = [];
          this.isLoadingTeachers = false;
        }
      });
  }

  private loadCirclesForTeacher(
    teacherId: number,
    options?: { preselectCircleId?: number | null; preselectStudentId?: number | null }
  ): void {
    this.isLoadingCircles = true;

    this.circleService
      .getAll(this.userFilter, undefined, teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = res.isSuccess ? res.data.items : [];
          this.circles = items.map((c: any) => ({
            id: Number(c.id),
            name: c.name || c.title || `Circle #${c.id}`
          }));

          // ✅ حسب البيزنس: ممكن الحلقة تتحدد تلقائيًا
          const firstCircle = this.circles?.[0]?.id ?? null;
          if (options?.preselectCircleId) {
            const exists = this.circles.some((c) => c.id === options.preselectCircleId);
            const valueToSet = exists ? options.preselectCircleId : firstCircle;
            this.reportForm.get('circleId')?.setValue(valueToSet, { emitEvent: false });

            if (valueToSet) {
              this.loadStudentsForCircle(Number(valueToSet), options.preselectStudentId ?? null);
            }
          } else {
            this.reportForm.get('circleId')?.setValue(firstCircle, { emitEvent: true });
          }

          this.isLoadingCircles = false;
        },
        error: () => {
          this.circles = [];
          this.isLoadingCircles = false;
          this.setValueSilent('circleId', null);
        }
      });
  }

  private loadStudentsForCircle(circleId: number, preselectStudentId: number | null = null): void {
    this.isLoadingStudents = true;

    this.circleService
      .get(circleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (res) => {
        const list = res.isSuccess && res.data?.students ? res.data.students : [];
        const mapped = list
          .map((s: any) => {
            const id = Number(s.studentId ?? s.id);
            const name =
              s?.student?.fullName || s?.fullName || s?.name || (id ? `Student #${id}` : null);
            const mobile = s?.student?.mobile ?? s?.mobile ?? s?.phone ?? null;
            if (!id || !name) return null;
            return { id, name, mobile };
          })
          .filter(Boolean) as { id: number; name: string; mobile?: string | null }[];

          const unique = new Map<number, { id: number; name: string }>();
          mapped.forEach((x) => unique.set(x.id, x));
          this.students = Array.from(unique.values());

          this.isLoadingStudents = false;

          if (preselectStudentId && this.students.some((s) => s.id === preselectStudentId)) {
            this.reportForm.get('studentId')?.setValue(preselectStudentId, { emitEvent: false });
          } else if (this.students.length === 1) {
            this.reportForm.get('studentId')?.setValue(this.students[0].id, { emitEvent: false });
          }
        },
        error: () => {
          this.students = [];
          this.isLoadingStudents = false;
        }
      });
  }

  // =========================
  // Status rules
  // =========================
  private evaluationFields(): string[] {
    return [
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

  private applyStatusRules(status: any, options?: { preserveValues?: boolean }): void {
    const st = Number(status);
    this.selectedStatus =
      st === AttendStatusEnum.Attended ||
      st === AttendStatusEnum.ExcusedAbsence ||
      st === AttendStatusEnum.UnexcusedAbsence
        ? (st as AttendStatusEnum)
        : null;

    // disable all evaluation fields
    for (const k of this.evaluationFields()) {
      const c = this.reportForm.get(k);
      if (!c) continue;
      c.disable({ emitEvent: false });
      c.clearValidators();
      if (!options?.preserveValues) {
        c.setValue(null, { emitEvent: false });
      }
      c.updateValueAndValidity({ emitEvent: false });
    }

    const minutes = this.reportForm.get('minutes');
    minutes?.enable({ emitEvent: false });
    minutes?.clearValidators();
    minutes?.updateValueAndValidity({ emitEvent: false });

    if (this.selectedStatus === AttendStatusEnum.Attended) {
      for (const k of this.evaluationFields()) {
        this.reportForm.get(k)?.enable({ emitEvent: false });
      }
      return;
    }

    if (this.selectedStatus === AttendStatusEnum.UnexcusedAbsence) {
      minutes?.enable({ emitEvent: false });
      minutes?.setValidators([Validators.required]);
      minutes?.updateValueAndValidity({ emitEvent: false });
    }
  }

  // =========================
  // Validation helpers
  // =========================
  isInvalid(name: string): boolean {
    const c = this.reportForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorText(name: string): string {
    const c = this.reportForm.get(name);
    if (!c?.errors) return '';
    if (c.errors['required']) return this.translate.instant('هذا الحقل مطلوب');
    return this.translate.instant('قيمة غير صحيحة');
  }

  private getWhatsAppPayload(model: CircleReportAddDto): WhatsAppDialogPayload | null {
    if (this.mode === 'update') {
      return null;
    }

    const studentId = Number(model.studentId ?? 0);
    if (!studentId) {
      return null;
    }

    const student = this.students.find((s) => s.id === studentId);
    const studentName = student?.name ?? this.studentDisplayName ?? this.translate.instant('طالب');
    const statusLabel =
      this.attendStatusOptions.find((option) => option.value === Number(model.attendStatueId))?.label ??
      this.translate.instant('غير محدد');
    const minutes = model.minutes ?? '—';
    const circleName = this.circleDisplayName || '—';
    const teacherName = this.teacherDisplayName || '—';
    const header = `تقرير الطالب ${studentName}\nالحلقة: ${circleName}\nالمعلم: ${teacherName}\nالحالة: ${statusLabel}\nالدقائق: ${minutes}`;
    const attendedDetails =
      Number(model.attendStatueId) === AttendStatusEnum.Attended
        ? this.buildAttendedDetails(model)
        : '';

    const message = attendedDetails ? `${header}\n${attendedDetails}` : header;

    return {
      studentName,
      message
    };
  }

  private openWhatsAppDialog(payload: WhatsAppDialogPayload): void {
    const dialogRef = this.dialog.open(ReportWhatsAppDialogComponent, {
      data: payload,
      width: '420px'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.launchWhatsApp(payload.message);
    });
  }

  private launchWhatsApp(message: string): void {
    const url = message ? `https://wa.me/?text=${encodeURIComponent(message)}` : `https://wa.me/`;
    window.open(url, '_blank');
  }

  private buildAttendedDetails(model: CircleReportAddDto): string {
    const lines: string[] = [];
    const surahName = this.surahList.find((s) => s.id === Number(model.newId))?.name;

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

  // =========================
  // Submit
  // =========================
  onSubmit(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    const rawModel = this.reportForm.getRawValue() as CircleReportAddDto & {
      creationTime?: string | Date | null;
    };
    const creationTime = this.resolveCreationTime(rawModel.creationTime);

    const model: CircleReportAddDto = { ...rawModel, creationTime };
    const whatsappPayload = this.getWhatsAppPayload(model);

    this.isSubmitting = true;
    const request$ = this.mode === 'update' ? this.service.update({ ...model, id: this.reportId ?? undefined }) : this.service.create(model);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.isSuccess) {
          const successMessage =
            this.mode === 'update'
              ? this.translate.instant('Report updated successfully')
              : this.translate.instant('Report created successfully');
          this.toast.success(successMessage);

          if (this.mode === 'update') {
            return;
          }

          if (whatsappPayload) {
            this.openWhatsAppDialog(whatsappPayload);
          }

          this.reportForm.reset({ creationTime: '' }, { emitEvent: false });

          // ✅ بعد reset لازم نعيد تطبيق قواعد الدور + reload flow
          this.applyRoleBasedValidators();
          this.initRoleFlow();
        } else if ((res as any).errors?.length) {
          (res as any).errors.forEach((e: any) => this.toast.error(e.message));
        } else {
          const fallbackMessage =
            this.mode === 'update'
              ? this.translate.instant('Unable to update report')
              : this.translate.instant('Unable to create report');
          this.toast.error(fallbackMessage);
        }
      },
      error: () => {
        this.isSubmitting = false;
        const errorMessage =
          this.mode === 'update'
            ? this.translate.instant('Error updating report')
            : this.translate.instant('Error creating report');
        this.toast.error(errorMessage);
      }
    });
  }

  // =========================
  // Utils
  // =========================
  private toDate(value: unknown): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateTimeLocalString(value: unknown): string {
    const date = this.toDate(value);
    if (!date) return '';

    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private resolveCreationTime(rawValue: unknown): Date {
    return this.toDate(rawValue) ?? new Date();
  }

  trackById = (_: number, x: any) => x?.id;

  get managerDisplayName(): string {
    const id = this.reportForm.get('managerId')?.value;
    const fromList = this.managers.find((m) => m.id === id)?.displayName;
    return fromList ?? this.readonlyLabels.manager ?? '';
  }

  get teacherDisplayName(): string {
    const id = this.reportForm.get('teacherId')?.value;
    const fromList = this.teachers.find((t) => t.id === id)?.displayName;
    return fromList ?? this.readonlyLabels.teacher ?? '';
  }

  get circleDisplayName(): string {
    const id = this.reportForm.get('circleId')?.value;
    const fromList = this.circles.find((c) => c.id === id)?.name;
    return fromList ?? this.readonlyLabels.circle ?? '';
  }

  get studentDisplayName(): string {
    const id = this.reportForm.get('studentId')?.value;
    const fromList = this.students.find((s) => s.id === id)?.name;
    return fromList ?? this.readonlyLabels.student ?? '';
  }

  get creationTimeMax(): string {
    return this.toDateTimeLocalString(new Date());
  }

  private setValueSilent(name: string, value: any): void {
    this.reportForm.get(name)?.setValue(value, { emitEvent: false });
  }

  private lockEditSelectors(): void {
    this.reportForm.get('managerId')?.disable({ emitEvent: false });
    this.reportForm.get('teacherId')?.disable({ emitEvent: false });
    this.reportForm.get('circleId')?.disable({ emitEvent: false });
    this.reportForm.get('studentId')?.disable({ emitEvent: false });
  }

  private loadReportForEdit(id: number): void {
    this.isSubmitting = true;
    this.service
      .get(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (!res.isSuccess || !res.data) {
            this.toast.error(this.translate.instant('Unable to load report'));
            this.router.navigate(['../'], { relativeTo: this.route });
            return;
          }

          this.patchReport(res.data);
        },
        error: () => {
          this.isSubmitting = false;
          this.toast.error(this.translate.instant('Unable to load report'));
          this.router.navigate(['../'], { relativeTo: this.route });
        }
      });
  }

  /**
   * If the navigation state already carries the report (from the list), hydrate the form
   * without making another API request. This prevents a failing fetch (404) when the
   * details endpoint is unavailable but the list already has the necessary data.
   */
  private tryPatchFromState(id: number): boolean {
    const navigationState = (this.router.getCurrentNavigation()?.extras?.state as any) ?? {};
    const historyState = (typeof history !== 'undefined' ? (history.state as any) : {}) ?? {};
    const candidate = navigationState.report ?? historyState.report;

    if (!candidate || Number(candidate.id) !== Number(id)) {
      return false;
    }

    const hydrated: CircleReportAddDto & { managerId?: number | null; studentName?: string } = {
      ...candidate,
      // normalize ids from possible nested objects
      circleId: candidate.circleId ?? candidate.circle?.id ?? null,
      studentId: candidate.studentId ?? candidate.student?.id ?? null,
      teacherId: candidate.teacherId ?? candidate.teacher?.id ?? null,
      attendStatueId: candidate.attendStatueId ?? candidate.attendStatusId ?? null,
      creationTime: candidate.creationTime ?? null
    };

    this.patchReport(hydrated);
    return true;
  }

  private patchReport(report: CircleReportAddDto & { managerId?: number | null; studentName?: string }): void {
    this.captureReadonlyLabels(report);

    // hydrate selection lists with current report path
    const managerId = (report as any).managerId ?? null;
    const teacherId = report.teacherId ?? null;
    const circleId = report.circleId ?? null;
    const studentId = report.studentId ?? null;

    if (managerId && (this.isSystemManager || this.isBranchManager || this.isSupervisor)) {
      this.reportForm.get('managerId')?.enable({ emitEvent: false });
      this.reportForm.get('managerId')?.setValue(managerId, { emitEvent: false });
      this.loadTeachersForManager(managerId, {
        preselectTeacherId: teacherId,
        preselectCircleId: circleId,
        preselectStudentId: studentId
      });
    } else if (teacherId && (this.isTeacher || this.isSupervisor || this.isSystemManager || this.isBranchManager)) {
      this.reportForm.get('teacherId')?.enable({ emitEvent: false });
      this.reportForm.get('teacherId')?.setValue(teacherId, { emitEvent: false });
      this.loadCirclesForTeacher(teacherId, { preselectCircleId: circleId, preselectStudentId: studentId });
    }

    if (circleId && !teacherId) {
      this.reportForm.get('circleId')?.setValue(circleId, { emitEvent: false });
      this.loadStudentsForCircle(circleId, studentId);
    }

    this.reportForm.patchValue(
      {
        ...report,
        creationTime: this.toDateTimeLocalString(report.creationTime)
      },
      { emitEvent: false }
    );

    if (report.attendStatueId !== undefined && report.attendStatueId !== null) {
      this.applyStatusRules(report.attendStatueId, { preserveValues: true });
    }

    if (this.mode === 'update') {
      this.lockEditSelectors();
    }
  }

  private captureReadonlyLabels(report: any): void {
    const resolveName = (x: any): string =>
      x?.fullName ?? x?.name ?? x?.title ?? x?.email ?? x?.studentName ?? '';

    this.readonlyLabels = {
      manager: resolveName(report.manager) ?? report.managerName ?? '',
      teacher: resolveName(report.teacher) ?? report.teacherName ?? '',
      circle: resolveName(report.circle) ?? report.circleName ?? '',
      student: resolveName(report.student) ?? report.studentName ?? ''
    };
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
      <p>سيتم فتح واتساب لاختيار جهة الاتصال الخاصة بالطالب <strong>{{ data.studentName }}</strong>.</p>
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
