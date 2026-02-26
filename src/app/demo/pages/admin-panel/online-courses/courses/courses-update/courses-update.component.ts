import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  ValidatorFn
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import {
  CircleDto,
  CircleDayDto,
  CircleManagerDto,
  CircleStudentDto,
  CircleService,
  UpdateCircleDto,
  CircleDayRequestDto
} from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { DAY_OPTIONS, DayValue, coerceDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue, timeStringToTimeSpanString } from 'src/app/@theme/utils/time';
import { Subject, takeUntil } from 'rxjs';
import { ProfileDto, UserService } from 'src/app/@theme/services/user.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

interface CircleScheduleFormValue {
  dayId: DayValue | null;
  startTime: string | null;
}

interface CircleFormValue {
  name: string;
  branchId: number | null;
  teacherId: number | null;
  days: CircleScheduleFormValue[];
  managers: number[];
  studentsIds: number[];
}

type DayOptionNormalized = { label: string; value: any };

@Component({
  selector: 'app-courses-update',
  imports: [SharedModule, CommonModule],
  templateUrl: './courses-update.component.html',
  styleUrl: './courses-update.component.scss'
})
export class CoursesUpdateComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private lookup = inject(LookupService);
  private circle = inject(CircleService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthenticationService);
  private userService = inject(UserService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  private readonly userFilter: FilteredResultRequestDto = { lookupOnly: true };
  private readonly fullListFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 1000 };

  circleForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  id!: number;

  isManager = false;
  private currentManagerId: number | null = null;
  private lastLoadedManagerId: number | null = null;
  private managerFallback: LookUpUserDto | null = null;

  // ✅ تطبيع DAY_OPTIONS عشان ng-select (bindValue="value") يشتغل 100%
  days: DayOptionNormalized[] = [];

  branchOptions = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  submitted = false;
  isSaving = false;

  ngOnInit(): void {



    // ✅ جهز قائمة الأيام بشكل ثابت {label,value}
    this.days = this.normalizeDayOptions(DAY_OPTIONS as any);

    this.isManager = this.auth.getRole() === UserTypesEnum.Manager;
    this.currentManagerId = this.isManager ? this.resolveCurrentManagerId() : null;

    this.circleForm = this.fb.group({
      name: ['', Validators.required],
      branchId: [null, Validators.required],
      teacherId: [{ value: null, disabled: true }, Validators.required],

      // ✅ Validator عام على FormArray
      days: this.fb.array([this.createDayGroup()], this.daysArrayValidator()),

      managers: [
        {
          value: this.currentManagerId !== null ? [this.currentManagerId] : [],
          disabled: false
        }
      ],
      studentsIds: [{ value: [], disabled: true }]
    });

    // ✅ مهم جدًا: إعادة تقييم الـ FormArray فور أي تغيير داخل أي صف (حل رسالة “اليوم مطلوب” اللي بتفضل)
    this.daysArray.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.daysArray.updateValueAndValidity({ onlySelf: false, emitEvent: false });
      });



    const teacherControl = this.circleForm.get('teacherId');
    const managersControl = this.circleForm.get('managers');

    this.managers = this.ensureCurrentManagerPresence([]);

    if (this.currentManagerId !== null) {
      this.applyManagerSelection(managersControl, this.currentManagerId);
    }

    if (this.isManager) {
      this.resolveManagerFromProfile();
    }

    managersControl
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((managerIds: number[] | null) => {
        const managerId = this.resolvePrimaryId(managerIds);
        this.loadTeachers(managerId);
      });

    teacherControl
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((teacherId: number | null) => {
        const resolvedTeacherId = typeof teacherId === 'number' ? teacherId : null;
        this.loadStudents(resolvedTeacherId);
      });

    const course = history.state.course as CircleDto | undefined;

    this.lookup
      .getUsersForSelects(this.fullListFilter, Number(UserTypesEnum.Manager), 0, 0, this.getSelectedBranchId())
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res.isSuccess) {
          const existing = new Map(this.managers.map((m) => [m.id, m]));
          const fetched = res.data.items ?? [];
          fetched.forEach((m) => existing.set(m.id, m));
          const mergedManagers = Array.from(existing.values());
          const detectedId = this.tryResolveManagerIdentity(mergedManagers);
          if (detectedId !== null) {
            this.currentManagerId = detectedId;
          }
          this.managers = this.ensureCurrentManagerPresence(mergedManagers);
          if (this.currentManagerId !== null) {
            this.applyManagerSelection(managersControl, this.currentManagerId);
          }
        }
      });

    const initialManagerId = this.resolvePrimaryId(managersControl?.value as number[] | null);
    if (initialManagerId !== null && this.lastLoadedManagerId !== initialManagerId) {
      this.loadTeachers(initialManagerId);
    }

    if (course) {
      this.initializeFromCourse(course);
      if (this.requiresSupplementalData(course)) {
        this.circle
          .get(course.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res.isSuccess) {
              this.initializeFromCourse(res.data);
            }
          });
      }
    } else {
      this.id = Number(this.route.snapshot.paramMap.get('id'));
      if (this.id) {
        this.circle
          .get(this.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res.isSuccess) {
              this.initializeFromCourse(res.data);
            }
          });
      }
    }
  }
private extractDayValueFromEvent(event: any): any {
  // مع bindValue غالباً event = رقم (DaysEnum)
  if (event === null || event === undefined) return null;

  // أحيانًا ng-select يبعث object كامل
  return event?.value ?? event?.id ?? event?.dayId ?? event;
}

onDayChanged(index: number, event: any): void {
  const ctrl = this.daysArray.at(index)?.get('dayId');
  if (!ctrl) return;

  const value = this.extractDayValueFromEvent(event);

  ctrl.setValue(value ?? null, { emitEvent: true });
  ctrl.markAsDirty();
  ctrl.markAsTouched();
  ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });

  // مهم: حدث حالة الـ FormArray عشان الرسائل تتحدث فورًا
  this.daysArray.updateValueAndValidity({ onlySelf: false, emitEvent: false });
}
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get daysArray(): FormArray<FormGroup> {
    return this.circleForm.get('days') as FormArray<FormGroup>;
  }

  addDay(): void {
    this.daysArray.push(this.createDayGroup());
    this.daysArray.markAsDirty();
    this.daysArray.markAsTouched();
    this.daysArray.updateValueAndValidity();
  }

  removeDay(index: number): void {
    if (this.daysArray.length <= 1) {
      this.daysArray.at(0).reset({ dayId: null, startTime: null });
      this.daysArray.markAsDirty();
      this.daysArray.markAsTouched();
      this.daysArray.updateValueAndValidity();
      return;
    }

    this.daysArray.removeAt(index);
    this.daysArray.markAsDirty();
    this.daysArray.markAsTouched();
    this.daysArray.updateValueAndValidity();
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ✅ تطبيع DAY_OPTIONS لأي شكل (id/value/dayId...) لــ {label,value}
  private normalizeDayOptions(options: any[]): DayOptionNormalized[] {
    const list = Array.isArray(options) ? options : [];
    return list
      .map((o) => {
        const label = String(o?.label ?? o?.name ?? o?.text ?? o?.dayName ?? '');
        const value = o?.value ?? o?.id ?? o?.dayId ?? o?.key ?? o?.code;
        return { label, value };
      })
      .filter((x) => x.label && x.value !== undefined);
  }

  // ✅ مهم: لا تستخدم !!day عشان لو القيمة 0 (الأحد = 0) مايتحسبش فاضي
  private isEmptyValue(v: any): boolean {
    return v === null || v === undefined || v === '';
  }

  // ✅ Validator عام: لازم صف واحد مكتمل على الأقل
  private daysArrayValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const array = control as FormArray;
    if (!array?.controls?.length) return { noValidDay: true };

    const hasOneCompleteRow = array.controls.some((g) => {
      const day = g.get('dayId')?.value;
      const time = g.get('startTime')?.value;

      const dayOk = day !== null && day !== undefined && day !== '';
      const timeOk =
        time !== null &&
        time !== undefined &&
        String(time).trim().length > 0;

      return dayOk && timeOk;
    });

    return hasOneCompleteRow ? null : { noValidDay: true };
  };
}

  // ✅ createDayGroup (موجودة فعلًا داخل الكلاس)
private createDayGroup(initial?: Partial<CircleScheduleFormValue>): FormGroup {
  return this.fb.group({
    dayId: [initial?.dayId ?? null, Validators.required],
    startTime: [initial?.startTime ?? null, Validators.required]
  });
}

  // ✅ شيل الصفوف الفاضية بالكامل قبل الإرسال عشان ما تمنعش الطلب
  private pruneEmptyDaysRows(): void {
    for (let i = this.daysArray.length - 1; i >= 0; i--) {
      const g = this.daysArray.at(i);
      const day = g.get('dayId')?.value;
      const time = g.get('startTime')?.value;

      const dayEmpty = this.isEmptyValue(day);
      const timeEmpty = this.isEmptyValue(time) || (typeof time === 'string' && time.trim().length === 0);

      if (dayEmpty && timeEmpty && this.daysArray.length > 1) {
        this.daysArray.removeAt(i);
      }
    }
  }

  // ✅ يحول أي قيمة (رقم/سترنج/أوبجكت) لرقم dayId أو null
  private toDayIdNumber(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;

    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

    if (typeof raw === 'string') {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }

    if (typeof raw === 'object') {
      const candidate = raw.value ?? raw.id ?? raw.dayId ?? raw.key ?? raw.code;
      const n = this.toDayIdNumber(candidate);
      if (n !== null) return n;
    }

    const coerced = coerceDayValue(raw);
    if (coerced === undefined || coerced === null) return null;

    return this.toDayIdNumber(coerced as any);
  }

  private buildSchedulePayload(): CircleDayRequestDto[] {
    return this.daysArray.controls
      .map((dayGroup): CircleDayRequestDto | null => {
        const rawDay = dayGroup.get('dayId')?.value;

        // ✅ هنا بنضمن رقم حتى لو الأحد = 0
        const dayIdNum = this.toDayIdNumber(rawDay);
        if (dayIdNum === null) return null;

        const startTime = (dayGroup.get('startTime')?.value as string | null) ?? '';
        const trimmed = startTime.trim();
        if (!trimmed) return null;

        const startTimeValue = timeStringToTimeSpanString(trimmed);

        return {
          dayId: dayIdNum, // ✅ number مؤكد
          time: startTimeValue ?? null
        };
      })
      .filter((item): item is CircleDayRequestDto => item !== null);
  }

  // ===========================
  // باقي كودك كما هو (بدون تغيير)
  // ===========================

  private initializeFromCourse(course: CircleDto | null | undefined): void {
    if (!course) {
      return;
    }

    this.id = course.id;

    const courseManagers =
      course.managers?.map((m: CircleManagerDto) =>
        m.manager ? (m.manager as LookUpUserDto) : (m as unknown as LookUpUserDto)
      ) ?? [];
    if (courseManagers.length) {
      const existingManagers = new Map(this.managers.map((manager) => [manager.id, manager]));
      courseManagers.forEach((manager) => existingManagers.set(manager.id, manager));
      this.managers = this.ensureCurrentManagerPresence(Array.from(existingManagers.values()));
    } else {
      this.managers = this.ensureCurrentManagerPresence(this.managers);
    }

    const managersControl = this.circleForm.get('managers');
    const detectedManagerId = this.tryResolveManagerIdentity(this.managers);
    if (detectedManagerId !== null) {
      this.currentManagerId = detectedManagerId;
      this.applyManagerSelection(managersControl, this.currentManagerId);
    }

    const managerIds =
      course.managers
        ?.map((m: CircleManagerDto | number) => (typeof m === 'number' ? m : m.managerId))
        .filter((id): id is number => id !== undefined && id !== null) ?? [];

    const effectiveManagerIds =
      this.isManager && this.currentManagerId !== null ? [this.currentManagerId] : managerIds;

    const studentIds = this.extractStudentIds(course);
    const courseStudents = this.mapStudentsToLookups(course);
    if (courseStudents.length) {
      const existingStudents = new Map(this.students.map((student) => [student.id, student]));
      courseStudents.forEach((student) => existingStudents.set(student.id, student));
      this.students = Array.from(existingStudents.values());
    }

    const fallbackTeacher = course.teacher ?? null;

    this.circleForm.patchValue(
      {
        name: course.name ?? '',
        branchId: course.branchId ?? null
      },
      { emitEvent: false }
    );
    this.circleForm.get('managers')?.setValue(effectiveManagerIds, { emitEvent: false });

    const schedule = this.extractSchedule(course);
    this.setDays(schedule);

    const primaryManagerId = this.resolvePrimaryId(effectiveManagerIds);
    const teacherId = typeof course.teacherId === 'number' ? course.teacherId : null;

    this.loadTeachers(primaryManagerId, teacherId, studentIds, fallbackTeacher, courseStudents);

    if (primaryManagerId === null && teacherId !== null) {
      this.loadStudents(teacherId, studentIds, courseStudents);
    }
  }

  private requiresSupplementalData(course: CircleDto | null | undefined): boolean {
    if (!course) {
      return false;
    }

    const studentIds = this.extractStudentIds(course);
    if (!studentIds.length) {
      return true;
    }

    const schedule = this.extractSchedule(course);
    const hasDayValue = schedule.some((entry) => entry.dayId !== null && entry.dayId !== undefined);
    const hasTimeValue = schedule.some((entry) =>
      typeof entry.startTime === 'string' ? entry.startTime.trim().length > 0 : false
    );

    return !hasDayValue || !hasTimeValue;
  }

  private loadTeachers(
    managerId: number | null,
    selectedTeacherId: number | null = null,
    selectedStudents: number[] = [],
    fallbackTeacher?: LookUpUserDto | null,
    fallbackStudents: LookUpUserDto[] = []
  ): void {
    const teacherControl = this.circleForm.get('teacherId');
    const studentsControl = this.circleForm.get('studentsIds');

    this.lastLoadedManagerId = managerId ?? null;

    const normalizedSelectedStudents = Array.isArray(selectedStudents) ? selectedStudents : [];
    const fallbackStudentLookups = Array.isArray(fallbackStudents) ? fallbackStudents : [];
    const fallbackTeacherList =
      fallbackTeacher && typeof fallbackTeacher.id === 'number' ? [fallbackTeacher] : [];

    this.teachers = this.mergeUnique([], fallbackTeacherList);
    teacherControl?.reset(selectedTeacherId ?? null, { emitEvent: false });
    teacherControl?.disable({ emitEvent: false });

    this.students = this.mergeUnique([], fallbackStudentLookups);
    const initialStudentSelection = normalizedSelectedStudents.filter((id) =>
      this.students.some((student) => student.id === id)
    );
    studentsControl?.reset(initialStudentSelection, { emitEvent: false });
    studentsControl?.disable({ emitEvent: false });

    if (!managerId) {
      return;
    }

    this.lookup
      .getUsersForSelects(this.fullListFilter, Number(UserTypesEnum.Teacher), 0, 0, this.getSelectedBranchId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            const fetchedTeachers = res.data.items ?? [];
            this.teachers = this.mergeUnique(fetchedTeachers, fallbackTeacherList);
            teacherControl?.enable({ emitEvent: false });

            if (selectedTeacherId !== null) {
              teacherControl?.setValue(selectedTeacherId, { emitEvent: false });
              this.loadStudents(selectedTeacherId, normalizedSelectedStudents, fallbackStudentLookups);
            }
          }
        },
        error: () => {
          teacherControl?.disable({ emitEvent: false });
        }
      });
  }

  private loadStudents(
    teacherId: number | null,
    selectedStudents: number[] = [],
    fallbackStudents: LookUpUserDto[] = []
  ): void {
    const studentsControl = this.circleForm.get('studentsIds');

    const normalizedSelection = Array.isArray(selectedStudents) ? selectedStudents : [];
    const fallbackList = Array.isArray(fallbackStudents) ? fallbackStudents : [];

    this.students = this.mergeUnique([], fallbackList);
    const initialSelection = normalizedSelection.filter((id) =>
      this.students.some((student) => student.id === id)
    );
    studentsControl?.reset(initialSelection, { emitEvent: false });
    studentsControl?.disable({ emitEvent: false });

    if (teacherId === null) {
      return;
    }

    this.lookup
      .getUsersForSelects(this.fullListFilter, Number(UserTypesEnum.Student), 0, 0, this.getSelectedBranchId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            const fetchedStudents = res.data.items ?? [];
            this.students = this.mergeUnique(fetchedStudents, fallbackList);
            studentsControl?.enable({ emitEvent: false });

            const filteredSelection = normalizedSelection.filter((id) =>
              this.students.some((student) => student.id === id)
            );
            studentsControl?.setValue(filteredSelection, { emitEvent: false });
          }
        },
        error: () => {
          studentsControl?.disable({ emitEvent: false });
        }
      });
  }

  private getSelectedBranchId(): number {
    const branchId = Number(this.circleForm?.get('branchId')?.value);
    return Number.isFinite(branchId) && branchId > 0 ? branchId : 0;
  }

  private resolvePrimaryId(ids: number[] | null | undefined): number | null {
    if (!Array.isArray(ids) || !ids.length) {
      return null;
    }

    const candidate = Number(ids[0]);
    return Number.isFinite(candidate) ? candidate : null;
  }

  private resolveCurrentManagerId(): number | null {
    const current = this.auth.currentUserValue;
    const id = current?.user?.id;
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private ensureCurrentManagerPresence(list: LookUpUserDto[]): LookUpUserDto[] {
    if (!Array.isArray(list)) {
      list = [];
    }

    if (!this.isManager) {
      return list;
    }

    const managerId = this.currentManagerId ?? this.managerFallback?.id ?? null;
    if (managerId === null) {
      return list;
    }

    const exists = list.some((manager) => manager?.id === managerId);
    if (exists) {
      return list;
    }

    const fallback = this.managerFallback ?? this.buildManagerFallback(managerId);
    if (!fallback) {
      return list;
    }

    return [...list, fallback];
  }

  private buildManagerFallback(managerId: number): LookUpUserDto | null {
    const current = this.auth.currentUserValue;
    if (!current) {
      return null;
    }

    return {
      id: managerId,
      fullName: current.user?.name ?? '',
      email: current.user?.email ?? '',
      mobile: '',
      secondMobile: '',
      nationality: '',
      nationalityId: 0,
      governorate: '',
      governorateId: 0,
      branchId: 0
    };
  }

  private tryResolveManagerIdentity(list: LookUpUserDto[]): number | null {
    if (!this.isManager) {
      return this.currentManagerId;
    }

    if (this.currentManagerId !== null) {
      const exists = list.some((manager) => manager?.id === this.currentManagerId);
      if (exists) {
        return this.currentManagerId;
      }
    }

    const current = this.auth.currentUserValue;
    const email = this.normalizeIdentity(current?.user?.email);
    if (email) {
      const match = list.find((manager) => this.normalizeIdentity(manager?.email) === email);
      if (match?.id) {
        return match.id;
      }
    }

    const name = this.normalizeIdentity(current?.user?.name);
    if (name) {
      const match = list.find((manager) => this.normalizeIdentity(manager?.fullName) === name);
      if (match?.id) {
        return match.id;
      }
    }

    return this.currentManagerId;
  }

  private normalizeIdentity(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : null;
  }

  private applyManagerSelection(control: AbstractControl | null, managerId: number | null): void {
    if (!control || managerId === null) {
      return;
    }

    control.setValue([managerId], { emitEvent: false });

    if (this.isManager) {
      control.disable({ emitEvent: false });
    }
  }

  private resolveManagerFromProfile(): void {
    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (!res.isSuccess || !res.data) {
          return;
        }

        const managerLookup = this.mapProfileToLookup(res.data);
        if (!managerLookup) {
          return;
        }

        this.managerFallback = managerLookup;
        this.currentManagerId = managerLookup.id;

        this.managers = this.ensureCurrentManagerPresence(this.managers);

        const managersControl = this.circleForm.get('managers');
        this.applyManagerSelection(managersControl, this.currentManagerId);

        const currentTeacherId = this.circleForm.get('teacherId')?.value as number | null;
        const selectedStudents = this.circleForm.get('studentsIds')?.value as number[] | null;
        const normalizedStudents = Array.isArray(selectedStudents) ? selectedStudents : [];
        const fallbackTeacher =
          typeof currentTeacherId === 'number'
            ? this.teachers.find((teacher) => teacher.id === currentTeacherId) ?? null
            : null;
        const fallbackStudents = this.students.filter((student) =>
          normalizedStudents.includes(student.id)
        );
        if (this.lastLoadedManagerId !== this.currentManagerId) {
          this.loadTeachers(
            this.currentManagerId,
            typeof currentTeacherId === 'number' ? currentTeacherId : null,
            normalizedStudents,
            fallbackTeacher,
            fallbackStudents
          );
        }
      });
  }

  private mapProfileToLookup(profile: ProfileDto | null | undefined): LookUpUserDto | null {
    if (!profile) {
      return null;
    }

    const parsedId = Number(profile.id);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return null;
    }

    return {
      id: parsedId,
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      mobile: profile.mobile ?? '',
      secondMobile: profile.secondMobile ?? '',
      nationality: '',
      nationalityId: profile.nationalityId ?? 0,
      governorate: '',
      governorateId: profile.governorateId ?? 0,
      branchId: profile.branchId ?? 0
    } as LookUpUserDto;
  }

  private mergeUnique(primary: LookUpUserDto[], fallback: LookUpUserDto[]): LookUpUserDto[] {
    const map = new Map<number, LookUpUserDto>();
    primary
      .filter((item): item is LookUpUserDto => Boolean(item) && typeof item.id === 'number')
      .forEach((item) => map.set(item.id, item));
    fallback
      .filter((item): item is LookUpUserDto => Boolean(item) && typeof item.id === 'number')
      .forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }

  private extractStudentIds(circle: CircleDto | null | undefined): number[] {
    return (
      circle?.students
        ?.map((s: CircleStudentDto) => s.id ?? s.studentId ?? s.student?.id)
        .filter((id): id is number => id !== undefined && id !== null) ?? []
    );
  }

  private mapStudentsToLookups(circle: CircleDto | null | undefined): LookUpUserDto[] {
    if (!circle?.students?.length) {
      return [];
    }

    return circle.students
      .map((s: CircleStudentDto) =>
        (s as CircleStudentDto).student
          ? ((s as CircleStudentDto).student as LookUpUserDto)
          : (s as unknown as LookUpUserDto)
      )
      .filter((student): student is LookUpUserDto => Boolean(student) && typeof student.id === 'number');
  }

  private setDays(schedule: CircleScheduleFormValue[]): void {
    const array = this.daysArray;
    while (array.length) {
      array.removeAt(array.length - 1);
    }

    if (!schedule.length) {
      array.push(this.createDayGroup());
    } else {
      schedule.forEach((entry) => array.push(this.createDayGroup(entry)));
    }

    array.markAsPristine();
    array.markAsUntouched();
    array.updateValueAndValidity();
  }

  private extractSchedule(circle?: CircleDto | null): CircleScheduleFormValue[] {
    if (!circle) {
      return [];
    }

    const normalized =
      Array.isArray(circle.days) && circle.days.length
        ? circle.days
          .map((day) => {
            const resolvedDay = coerceDayValue(day?.dayId ?? day?.dayName ?? undefined);
            const startTime = formatTimeValue(day?.time);
            return {
              dayId: (resolvedDay ?? null) as DayValue | null,
              startTime: startTime ? startTime : ''
            };
          })
          .filter((entry) => entry.dayId !== null)
        : [];

    if (normalized.length) {
      return normalized;
    }

    const primaryDay = this.resolvePrimaryDay(circle);
    const fallbackDayId =
      coerceDayValue(
        primaryDay?.dayId ??
        circle.dayIds?.[0] ??
        circle.dayNames?.[0] ??
        circle.dayId ??
        (circle as any).day
      ) ?? null;

    const fallbackTime = formatTimeValue(primaryDay?.time ?? (circle as any).startTime ?? (circle as any).time);
    const trimmedFallbackTime = fallbackTime.trim();

    if (fallbackDayId === null && !trimmedFallbackTime) {
      return [];
    }

    return [
      {
        dayId: (fallbackDayId ?? null) as DayValue | null,
        startTime: trimmedFallbackTime || ''
      }
    ];
  }

  private resolvePrimaryDay(circle?: CircleDto | null): CircleDayDto | undefined {
    if (!circle || !Array.isArray(circle.days)) {
      return undefined;
    }

    return circle.days.find((day): day is CircleDayDto => Boolean(day)) ?? undefined;
  }
onTimeChanged(index: number, value: string | null): void {
  const ctrl = this.daysArray.at(index)?.get('startTime');
  if (!ctrl) return;

  const v = (value ?? '').toString().trim();

  ctrl.setValue(v.length ? v : null, { emitEvent: true });
  ctrl.markAsDirty();
  ctrl.markAsTouched();
  ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });

  // حدّث حالة الـ FormArray عشان noValidDay تتشال فورًا
  this.daysArray.updateValueAndValidity({ onlySelf: false, emitEvent: false });
}
  onSubmit() {
    this.submitted = true;
console.log('Days raw:', this.daysArray.getRawValue());
console.log('Days errors:', this.circleForm.get('days')?.errors);
console.log('Row0 dayId:', this.daysArray.at(0).get('dayId')?.value);
console.log('Row0 startTime:', this.daysArray.at(0).get('startTime')?.value);
    // ✅ شيل صفوف فاضية بالكامل قبل التحقق
    this.pruneEmptyDaysRows();
    this.circleForm.updateValueAndValidity({ onlySelf: false, emitEvent: false });

    if (this.circleForm.invalid) {
      this.circleForm.markAllAsTouched();
      return;
    }

    if (!Number.isFinite(this.id) || this.id <= 0) {
      this.toast.error('تعذر تحديد الحلقة المراد تحديثها');
      return;
    }

    const formValue = this.circleForm.getRawValue() as CircleFormValue;
    if (typeof formValue.teacherId !== 'number' || formValue.teacherId <= 0) {
      this.toast.error('يرجى اختيار المعلم قبل تحديث الحلقة');
      return;
    }

    const schedule = this.buildSchedulePayload();

    if (!schedule.length) {
      this.toast.error('يجب إدخال موعد واحد على الأقل');
      return;
    }

    const model: UpdateCircleDto = {
      id: this.id,
      name: formValue.name,
      branchId: formValue.branchId,
      teacherId: formValue.teacherId,
      days: schedule,
      managers: formValue.managers,
      studentsIds: formValue.studentsIds
    };

    this.isSaving = true;
    this.circle.update(model).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.isSuccess) {
          this.toast.success('تم تحديث البيانات بنجاح ');
          this.router.navigate(['/online-course/courses/view']);
        } else if (res.errors?.length) {
          res.errors.forEach((e) => this.toast.error(e.message));
        } else {
          this.toast.error('خطا في الحفظ');
        }
      },
      error: () => {
        this.isSaving = false;
        this.toast.error('خطا في الحفظ');
      }
    });
  }
}