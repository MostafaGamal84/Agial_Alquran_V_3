import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { NgSelectModule } from '@ng-select/ng-select';

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
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
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

  private destroy$ = new Subject<void>();

  reportForm!: FormGroup;

  // enums
  AttendStatusEnum = AttendStatusEnum;
  UserTypesEnum = UserTypesEnum;

  selectedStatus: AttendStatusEnum | null = null;

  // lists
  managers: any[] = [];
  teachers: any[] = [];
  students: { id: number; name: string }[] = [];
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
  isLoadingStudents = false;
  isSubmitting = false;

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

  get showSupervisorSelector(): boolean {
    return this.isSystemManager || this.isBranchManager;
  }
  get showTeacherSelector(): boolean {
    return this.isSystemManager || this.isBranchManager || this.isSupervisor;
  }
  get showStudentSelector(): boolean {
    return true;
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
    this.buildForm();
    this.wireFormReactions();
    this.initRoleFlow();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.reportForm = this.fb.group({
      // selectors
      managerId: [null],
      teacherId: [null],
      circleId: [null, Validators.required], // auto from teacher
      studentId: [null, Validators.required],

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

  private wireFormReactions(): void {
    // Manager -> Teachers
    this.reportForm.get('managerId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((managerId) => {
        // reset below
        this.reportForm.patchValue(
          { teacherId: null, circleId: null, studentId: null },
          { emitEvent: false }
        );
        this.teachers = [];
        this.circles = [];
        this.students = [];

        if (managerId) this.loadTeachersForManager(Number(managerId));
      });

    // Teacher -> Circle auto -> Students
    this.reportForm.get('teacherId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((teacherId) => {
        this.reportForm.patchValue({ circleId: null, studentId: null }, { emitEvent: false });
        this.circles = [];
        this.students = [];

        if (teacherId) this.loadCirclesForTeacher(Number(teacherId));
      });

    // Circle -> Students
    this.reportForm.get('circleId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((circleId) => {
        this.reportForm.patchValue({ studentId: null }, { emitEvent: false });
        this.students = [];

        if (circleId) this.loadStudentsForCircle(Number(circleId));
      });

    // Status -> rules
    this.reportForm.get('attendStatueId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((st) => this.applyStatusRules(st));
  }

  private initRoleFlow(): void {
    if (this.isTeacher) {
      this.lockManagerSelection = true;
      this.lockTeacherSelection = true;
      const myId = this.getUserId();
      this.reportForm.patchValue({ teacherId: myId }, { emitEvent: true });
      return;
    }

    if (this.isSupervisor) {
      this.lockManagerSelection = true;
      const myId = this.getUserId();
      this.reportForm.patchValue({ managerId: myId }, { emitEvent: true });
      return;
    }

    // Admin / Branch Manager
    this.loadManagers();
  }

  // ===== loaders (endpoints القديمة) =====
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

  private loadTeachersForManager(managerId: number): void {
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

          if (this.teachers.length === 1) {
            this.reportForm.patchValue({ teacherId: this.teachers[0].id }, { emitEvent: true });
          }
        },
        error: () => {
          this.teachers = [];
          this.isLoadingTeachers = false;
        }
      });
  }

  private loadCirclesForTeacher(teacherId: number): void {
    this.circleService
      .getAll(this.userFilter, undefined, teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.circles = res.isSuccess ? res.data.items : [];
          const firstCircle = this.circles?.[0]?.id ?? null;
          this.reportForm.patchValue({ circleId: firstCircle }, { emitEvent: true });
        },
        error: () => {
          this.circles = [];
          this.reportForm.patchValue({ circleId: null }, { emitEvent: false });
        }
      });
  }

  private loadStudentsForCircle(circleId: number): void {
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
              const name = s?.student?.fullName || s?.fullName || s?.name || (id ? `Student #${id}` : null);
              if (!id || !name) return null;
              return { id, name };
            })
            .filter(Boolean) as { id: number; name: string }[];

          // unique
          const unique = new Map<number, { id: number; name: string }>();
          mapped.forEach((x) => unique.set(x.id, x));
          this.students = Array.from(unique.values());

          this.isLoadingStudents = false;

          if (this.students.length === 1) {
            this.reportForm.patchValue({ studentId: this.students[0].id }, { emitEvent: false });
          }
        },
        error: () => {
          this.students = [];
          this.isLoadingStudents = false;
        }
      });
  }

  // ===== status rules (زي فورمك) =====
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

  private applyStatusRules(status: any): void {
    const st = Number(status);
    this.selectedStatus =
      st === AttendStatusEnum.Attended || st === AttendStatusEnum.ExcusedAbsence || st === AttendStatusEnum.UnexcusedAbsence
        ? (st as AttendStatusEnum)
        : null;

    // disable all first
    for (const k of this.allDynamicFields()) {
      const c = this.reportForm.get(k);
      if (!c) continue;
      c.disable({ emitEvent: false });
      c.clearValidators();
      c.updateValueAndValidity({ emitEvent: false });
    }

    if (this.selectedStatus === AttendStatusEnum.Attended) {
      for (const k of this.allDynamicFields()) {
        this.reportForm.get(k)?.enable({ emitEvent: false });
      }
      return;
    }

    if (this.selectedStatus === AttendStatusEnum.UnexcusedAbsence) {
      const minutes = this.reportForm.get('minutes');
      minutes?.enable({ emitEvent: false });
      minutes?.setValidators([Validators.required]);
      minutes?.updateValueAndValidity({ emitEvent: false });
    }
  }

  // ===== validation helpers =====
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

  // ===== submit =====
  onSubmit(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    const model = this.reportForm.getRawValue() as CircleReportAddDto;

    this.isSubmitting = true;
    this.service.create(model).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.isSuccess) {
          this.toast.success(this.translate.instant('Report created successfully'));
          this.reportForm.reset({ creationTime: new Date() }, { emitEvent: false });
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

  trackById = (_: number, x: any) => x?.id;
}
