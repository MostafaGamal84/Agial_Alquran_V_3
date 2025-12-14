import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';


import { LookupService, FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { CircleService } from 'src/app/@theme/services/circle.service';
import { CircleReportService, CircleReportAddDto } from 'src/app/@theme/services/circle-report.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AttendStatusEnum } from 'src/app/@theme/types/AttendStatusEnum';
import { QuranSurahEnum } from 'src/app/@theme/types/QuranSurahEnum';
import { SmartSelectComponent } from 'src/app/shared/smart-select/smart-select';

@Component({
  selector: 'app-report-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SmartSelectComponent],
  templateUrl: './report-add.component.html',
  styleUrl: './report-add.component.scss'
})
export class ReportAddComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private lookup = inject(LookupService);
  private circleService = inject(CircleService);
  private reportService = inject(CircleReportService);
  private auth = inject(AuthenticationService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  private destroy$ = new Subject<void>();

  reportForm!: FormGroup;

  // UI lists
  managers: { id: number; name: string }[] = [];
  teachers: { id: number; name: string }[] = [];
  students: { id: number; name: string }[] = [];
  circles: any[] = [];

  // loading
  isLoadingManagers = false;
  isLoadingTeachers = false;
  isLoadingStudents = false;
  isSubmitting = false;

  // locks
  lockManagerSelection = false;
  lockTeacherSelection = false;

  // enums
  AttendStatusEnum = AttendStatusEnum;
  UserTypesEnum = UserTypesEnum;

  selectedStatus: AttendStatusEnum | null = null;

  // options
  attendStatusOptions = [
    { label: 'حضر', value: AttendStatusEnum.Attended },
    { label: 'تغيب بعذر', value: AttendStatusEnum.ExcusedAbsence },
    { label: 'تغيب بدون عذر', value: AttendStatusEnum.UnexcusedAbsence }
  ];

  // surah list (زي عندك)
  surahList = Object.keys(QuranSurahEnum)
    .filter((k) => isNaN(Number(k)))
    .map((k) => ({
      id: QuranSurahEnum[k as keyof typeof QuranSurahEnum],
      name: k
    }));

  // filter request
  private readonly userFilter: FilteredResultRequestDto = { lookupOnly: true };

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    this.buildForm();
    this.applyStatusRules(null); // disable all dynamic fields initially
    this.initRoleFlow();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // ROLE VISIBILITY (زي الأول)
  // =========================
  get showSupervisorSelector(): boolean {
    return this.isSystemManager || this.isBranchManager;
  }
  get showTeacherSelector(): boolean {
    return this.isSystemManager || this.isBranchManager || this.isSupervisor;
  }
  get showStudentSelector(): boolean {
    return true;
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

  private get userTypeNumber(): number {
    const raw =
      (this.auth.currentUserValue as any)?.user?.userTypeId ??
      (this.auth.currentUserValue as any)?.userTypeId ??
      (this.auth.currentUserValue as any)?.user?.roleId ??
      this.auth.getRole?.() ??
      0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  private getUserId(): number | null {
    const raw =
      (this.auth.currentUserValue as any)?.user?.id ??
      (this.auth.currentUserValue as any)?.id ??
      null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // =========================
  // FORM
  // =========================
  private buildForm(): void {
    this.reportForm = this.fb.group({
      // ids
      managerId: [null],
      teacherId: [null],
      circleId: [null, Validators.required], // auto from teacher
      studentId: [null, Validators.required],

      // status
      attendStatueId: [null, Validators.required],

      // minutes
      minutes: [null],

      // attended fields (زي أول فورم)
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

      creationTime: [new Date(), Validators.required]
    });
  }

  // =========================
  // FLOW
  // =========================
  private initRoleFlow(): void {
    if (this.isTeacher) {
      this.lockManagerSelection = true;
      this.lockTeacherSelection = true;

      const myId = this.getUserId();
      this.reportForm.patchValue({ teacherId: myId }, { emitEvent: false });
      this.onTeacherChanged(myId);
      return;
    }

    if (this.isSupervisor) {
      this.lockManagerSelection = true;

      const myId = this.getUserId();
      this.reportForm.patchValue({ managerId: myId }, { emitEvent: false });
      this.onManagerChanged(myId);
      return;
    }

    // Admin / Branch Manager
    this.loadManagers();
  }

  onManagerChanged(managerId: number | null): void {
    const mid = this.toNumber(managerId);

    // reset everything below
    this.reportForm.patchValue(
      { managerId: mid, teacherId: null, circleId: null, studentId: null },
      { emitEvent: false }
    );
    this.teachers = [];
    this.circles = [];
    this.students = [];

    if (!mid) return;
    this.loadTeachers(mid);
  }

  onTeacherChanged(teacherId: number | null): void {
    const tid = this.toNumber(teacherId);

    this.reportForm.patchValue(
      { teacherId: tid, circleId: null, studentId: null },
      { emitEvent: false }
    );

    this.circles = [];
    this.students = [];

    if (!tid) return;
    this.loadAutoCircleForTeacher(tid);
  }

  onStudentChanged(studentId: number | null): void {
    this.reportForm.patchValue({ studentId: this.toNumber(studentId) }, { emitEvent: false });
  }

  onStatusChanged(status: number | null): void {
    const st = this.toNumber(status) as AttendStatusEnum | null;
    this.reportForm.patchValue({ attendStatueId: st }, { emitEvent: false });
    this.applyStatusRules(st);
  }

  // =========================
  // STATUS RULES (زي الأول)
  // =========================
  private allDynamicFields(): string[] {
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

  private applyStatusRules(status: AttendStatusEnum | null): void {
    this.selectedStatus = status ?? null;

    // disable + clear validators on all dynamic first
    for (const key of this.allDynamicFields()) {
      const c = this.reportForm.get(key);
      if (!c) continue;
      c.disable({ emitEvent: false });
      c.clearValidators();
      c.updateValueAndValidity({ emitEvent: false });
    }

    if (status === AttendStatusEnum.Attended) {
      // enable all (زي أول فورم)
      for (const key of this.allDynamicFields()) {
        this.reportForm.get(key)?.enable({ emitEvent: false });
      }
      return;
    }

    if (status === AttendStatusEnum.UnexcusedAbsence) {
      // enable minutes + required
      const minutes = this.reportForm.get('minutes');
      minutes?.enable({ emitEvent: false });
      minutes?.setValidators([Validators.required]);
      minutes?.updateValueAndValidity({ emitEvent: false });
      return;
    }

    // ExcusedAbsence: no dynamic fields
  }

  // =========================
  // LOADERS (Endpoints القديمة)
  // =========================
  private loadManagers(): void {
    this.isLoadingManagers = true;

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager), 0, 0, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = res.isSuccess ? res.data.items : [];
          this.managers = items.map((m: any) => ({
            id: Number(m.id),
            name: m.fullName
          }));
          this.isLoadingManagers = false;
        },
        error: () => {
          this.managers = [];
          this.isLoadingManagers = false;
        }
      });
  }

  private loadTeachers(managerId: number): void {
    this.isLoadingTeachers = true;

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Teacher), managerId, 0, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = res.isSuccess ? res.data.items : [];
          this.teachers = items.map((t: any) => ({
            id: Number(t.id),
            name: t.fullName 
          }));
          this.isLoadingTeachers = false;

          // optional: لو واحد بس اختاره تلقائيًا
          if (this.teachers.length === 1) {
            this.onTeacherChanged(this.teachers[0].id);
          }
        },
        error: () => {
          this.teachers = [];
          this.isLoadingTeachers = false;
        }
      });
  }

  private loadAutoCircleForTeacher(teacherId: number): void {
    // هنا: تحديد الحلقة تلقائيًا من المعلم (أول حلقة)
    this.circleService
      .getAll(this.userFilter, undefined, teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.circles = res.isSuccess ? res.data.items : [];
          const circleId = this.circles?.[0]?.id ?? null;

          this.reportForm.patchValue({ circleId }, { emitEvent: false });
          this.students = [];
          this.reportForm.patchValue({ studentId: null }, { emitEvent: false });

          if (circleId) this.loadStudents(circleId);
        },
        error: () => {
          this.circles = [];
          this.reportForm.patchValue({ circleId: null }, { emitEvent: false });
        }
      });
  }

  private loadStudents(circleId: number): void {
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
                s?.student?.fullName ||
                s?.fullName ||
                s?.name ||
                (id ? `Student #${id}` : null);
              if (!id || !name) return null;
              return { id, name };
            })
            .filter(Boolean) as { id: number; name: string }[];

          // unique
          const unique = new Map<number, { id: number; name: string }>();
          mapped.forEach(x => unique.set(x.id, x));
          this.students = Array.from(unique.values());

          this.isLoadingStudents = false;

          // لو واحد فقط اختاره
          if (this.students.length === 1) {
            this.onStudentChanged(this.students[0].id);
          }
        },
        error: () => {
          this.students = [];
          this.isLoadingStudents = false;
        }
      });
  }

  // =========================
  // VALIDATION HELPERS
  // =========================
  isInvalid(name: string): boolean {
    const c = this.reportForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorText(name: string): string {
    const c = this.reportForm.get(name);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return this.translate.instant('هذا الحقل مطلوب');
    return this.translate.instant('قيمة غير صحيحة');
  }

  // =========================
  // SUBMIT
  // =========================
  onSubmit(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    const model = this.reportForm.getRawValue() as CircleReportAddDto;

    this.isSubmitting = true;
    this.reportService.create(model).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.isSuccess) {
          this.toast.success(this.translate.instant('Report created successfully'));
          this.resetAfterCreate();
        } else if ((res as any).errors?.length) {
          (res as any).errors.forEach((e: any) => this.toast.error(e.message));
        } else {
          this.toast.error(this.translate.instant('Unable to create report'));
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.toast.error(this.translate.instant('Error creating report'));
      }
    });
  }

  private resetAfterCreate(): void {
    // reset form + keep creationTime
    this.reportForm.reset({ creationTime: new Date() }, { emitEvent: false });
    this.applyStatusRules(null);

    // reset selections depending on role
    this.students = [];
    this.circles = [];

    if (this.isTeacher) {
      const myId = this.getUserId();
      this.reportForm.patchValue({ teacherId: myId }, { emitEvent: false });
      this.onTeacherChanged(myId);
      return;
    }

    if (this.isSupervisor) {
      const myId = this.getUserId();
      this.reportForm.patchValue({ managerId: myId }, { emitEvent: false });
      this.onManagerChanged(myId);
      return;
    }

    // admin/branch: keep managers loaded, clear selections
    this.teachers = [];
  }

  private toNumber(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}
