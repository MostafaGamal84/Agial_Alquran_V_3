// angular import
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ActivatedRoute, Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FieldErrorComponent } from 'src/app/shared/validation/field-error/field-error.component';
import { ValidationService } from 'src/app/shared/validation/validation.service';
import { LiveErrorStateMatcher } from 'src/app/shared/validation/live-error-state-matcher';
import { Subject, catchError, debounceTime, finalize, firstValueFrom, forkJoin, merge, of, startWith, switchMap, takeUntil, tap } from 'rxjs';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { UserService, UpdateUserDto } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import {
  LookupService,
  NationalityDto,
  GovernorateDto,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import { CircleService, CircleDto } from 'src/app/@theme/services/circle.service';
import { CountryService, Country } from 'src/app/@theme/services/country.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import {
  StudentSubscribeService,
  ViewStudentSubscribeReDto
} from 'src/app/@theme/services/student-subscribe.service';
import { SubscribeTypeCategory } from 'src/app/@theme/services/subscribe.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { ResidencyGroupFilter } from 'src/app/@theme/types/residency-group';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { isArabNationality, isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';
import { StudentSubscribeDialogComponent } from '../../membership/membership-list/student-subscribe-dialog/student-subscribe-dialog.component';
import { ResidencySubscribeWarningDialogComponent } from './residency-subscribe-warning-dialog.component';

@Component({
  selector: 'app-user-edit',
  imports: [CommonModule, SharedModule, NgxMaskDirective, FieldErrorComponent],
  templateUrl: './user-edit.component.html',
  styleUrl: './user-edit.component.scss',
  providers: [provideNgxMask()]
})
export class UserEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private lookupService = inject(LookupService);
  private circleService = inject(CircleService);
  private countryService = inject(CountryService);
  private auth = inject(AuthenticationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private studentSubscribeService = inject(StudentSubscribeService);
  private dialogRef = inject(MatDialogRef<UserEditComponent>, { optional: true });
  private dialogData = inject<{ userId: number; userType?: 'manager' | 'teacher' | 'student' | 'branch-manager' } | null>(MAT_DIALOG_DATA, {
    optional: true
  });
  readonly validationService = inject(ValidationService);

  basicInfoForm!: FormGroup;
  userId!: number;
  currentUser?: LookUpUserDto & {
    teachers?: LookUpUserDto[];
    students?: LookUpUserDto[];
    managers?: LookUpUserDto[];
    managerCircles?: { circleId: number; circle?: string }[];
    managerId?: number;
    managerName?: string;
    teacherId?: number;
    teacherName?: string;
    circleId?: number;
    circleName?: string;
  };
  nationalities: NationalityDto[] = [];
  governorates: GovernorateDto[] = [];
  countries: Country[] = [];
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  circles: CircleDto[] = [];
  teachersLoading = false;
  selectedManagers: number[] = [];
  private initialTeacherIds: number[] = [];
  private initialManagerIds: number[] = [];
  private initialStudentIds: number[] = [];
  private initialCircleIds: number[] = [];
  private initialTeacherId: number | null = null;
  private initialCircleId: number | null = null;
  private readonly studentManagerSelection$ = new Subject<{ managerIds: number[]; preserveSelection: boolean }>();
  private readonly destroy$ = new Subject<void>();
  isManager = false;
  isTeacher = false;
  isStudent = false;
  isBranchLeaderUser = false;
  submitted = false;
  liveErrorStateMatcher = new LiveErrorStateMatcher();
  isSaving = false;
  missingRequiredFields: string[] = [];
  currentStudentSubscription: ViewStudentSubscribeReDto | null = null;
  private pendingStudentSubscribeSelection:
    | {
        residentId: number;
        subscribeId: number;
        subscribeName?: string | null;
      }
    | null = null;
  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  phoneFormats: Record<string, { mask: string; placeholder: string }> = {
    '+1': { mask: '000-000-0000', placeholder: '123-456-7890' },
    '+44': { mask: '0000 000000', placeholder: '7123 456789' },
    '+966': { mask: '0000000000', placeholder: '5XXXXXXXXX' }
  };
  mobileMask = '';
  mobilePlaceholder = '';
  secondMobileMask = '';
  secondMobilePlaceholder = '';

  private get loggedInManagerId(): number | null {
    if (this.auth.getRole() !== UserTypesEnum.Manager) {
      return null;
    }

    const id = Number(this.auth.currentUserValue?.user?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get shouldLockManagerAssignment(): boolean {
    return (this.isTeacher || this.isStudent) && this.auth.getRole() === UserTypesEnum.Manager;
  }

  get canEditBranch(): boolean {
    return !((this.isStudent || this.isTeacher) && this.auth.getRole() === UserTypesEnum.Manager);
  }

  get canLeaveStudentWithoutTeacher(): boolean {
    const role = this.auth.getRole();
    return this.isStudent && (role === UserTypesEnum.Admin || role === UserTypesEnum.BranchLeader);
  }

  get isSubmitDisabled(): boolean {
    return this.isSaving || this.basicInfoForm.invalid;
  }

  get isDialogMode(): boolean {
    return !!this.dialogRef;
  }

  get submitValidationMessage(): string {
    if (this.isSaving || this.basicInfoForm.valid) {
      return '';
    }

    if (this.missingRequiredFields.length) {
      return `البيانات المطلوبة غير مكتملة: ${this.missingRequiredFields.join('، ')}`;
    }

    return 'يرجى مراجعة الحقول غير الصحيحة.';
  }

  private getEffectiveManagerId(managerId?: number | null): number {
    return this.loggedInManagerId ?? managerId ?? 0;
  }

  ngOnInit(): void {
    const dialogUserType = this.dialogData?.userType;
    this.isManager = dialogUserType ? dialogUserType === 'manager' || dialogUserType === 'branch-manager' : this.router.url.includes('/manager/');
    this.isTeacher = dialogUserType ? dialogUserType === 'teacher' : this.router.url.includes('/teacher/');
    this.isStudent = dialogUserType ? dialogUserType === 'student' : this.router.url.includes('/student/');
    this.isBranchLeaderUser = this.auth.getRole() === UserTypesEnum.BranchLeader;
    this.basicInfoForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobileCountryDialCode: [null, Validators.required],
      mobile: ['', Validators.required],
      secondMobileCountryDialCode: [''],
      secondMobile: [''],
      nationalityId: [null, Validators.required],
      residentId: [null, Validators.required],
      governorateId: [null],
      branchId: [null, Validators.required],
      teacherIds: [[]],
      teacherId: [null],
      managerId: [null],
      managerIds: [[]],

      studentIds: [[]],
      circleIds: [[]],
      circleId: [null]
    });

    this.updateStudentTeacherValidation();

    if (!this.canEditBranch) {
      this.basicInfoForm.get('branchId')?.disable({ emitEvent: false });
    }

    this.setupStudentManagersTeacherStream();

    this.basicInfoForm
      .get('residentId')
      ?.valueChanges.subscribe((residentId) => {
        this.applyGovernorateRequirement(residentId);
        this.resetPendingStudentSubscribeSelection(residentId);
      });

    this.setupMissingRequiredFieldsTracking();

    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess) {
        this.nationalities = res.data;
        this.applyGovernorateRequirement(this.basicInfoForm.get('residentId')?.value);
      }
    });

    this.lookupService.getAllGovernorates().subscribe((res) => {
      if (res.isSuccess) {
        this.governorates = res.data;
      }
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    const idParam = this.dialogData?.userId ?? (routeId ? Number(routeId) : NaN);
    const parsedId = Number(idParam);
    if (!isNaN(parsedId)) {
      this.userId = parsedId;
      this.loadUserDetails(parsedId);
    } else {
      this.toast.error('No user id provided');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserDetails(id: number) {
    this.lookupService.getUserDetails(id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.currentUser = res.data as typeof this.currentUser;
          this.populateUserForm();
          if (this.isStudent) {
            void this.getCurrentStudentSubscription(true);
          }
        } else {
          this.toast.error('Failed to load user details');
        }
      },
      error: () => this.toast.error('Failed to load user details')
    });
  }

  private populateUserForm() {
    if (!this.currentUser) {
      return;
    }

    const clean = (phone: string) => phone.replace(/\D/g, '');
    this.basicInfoForm.patchValue({
      fullName: this.currentUser.fullName,
      email: this.currentUser.email,
      mobile: clean(this.currentUser.mobile),
      secondMobile: this.currentUser.secondMobile ? clean(this.currentUser.secondMobile) : '',
      nationalityId: this.currentUser.nationalityId,
      residentId: this.currentUser.residentId ?? null,
      governorateId: this.currentUser.governorateId,
      branchId: this.currentUser.branchId
    });

    this.applyGovernorateRequirement(this.currentUser.residentId ?? null);

    if (this.isManager || this.isTeacher || this.isStudent) {
      if (this.isManager) {
        const teacherList = this.currentUser.teachers ?? [];
        const fallbackTeacherIds =
          typeof this.currentUser.teacherId === 'number' ? [this.currentUser.teacherId] : [];
        const selectedTeacherIds = this.normalizeTeacherIds([
          ...teacherList.map((teacher) => teacher.id),
          ...fallbackTeacherIds
        ]);

        if (teacherList.length) {
          this.teachers = teacherList;
        }

        this.basicInfoForm.patchValue({ teacherIds: selectedTeacherIds });
        if (!this.isBranchLeaderUser) {
          this.onTeachersChange(selectedTeacherIds);
        }
      } else if (this.isTeacher) {
        const selectedManagerIds = this.getSelectedManagerIds(this.currentUser);
        this.ensureSelectedManagersInList(selectedManagerIds);
        const primaryManagerId = selectedManagerIds[0] ?? null;
        this.basicInfoForm.patchValue({
          managerIds: selectedManagerIds,
          managerId: primaryManagerId
        });
      } else if (this.isStudent) {
        if (this.currentUser.teachers?.length) {
          this.teachers = this.currentUser.teachers;
          this.basicInfoForm.patchValue({
            teacherId: this.currentUser.teachers[0].id
          });
        } else if (this.currentUser.teacherId && this.currentUser.teacherName) {
          const teacher: LookUpUserDto = {
            id: this.currentUser.teacherId,
            fullName: this.currentUser.teacherName,
            email: '',
            mobile: '',
            secondMobile: '',
            nationality: '',
            nationalityId: 0,
            residentId: 0,
            governorate: '',
            governorateId: 0,
            branchId: 0
          };
          this.teachers = [teacher];
          this.basicInfoForm.patchValue({
            teacherId: teacher.id
          });
        }
        const selectedManagerIds = this.getSelectedManagerIds(this.currentUser);
        this.ensureSelectedManagersInList(selectedManagerIds);
        const primaryManagerId = selectedManagerIds[0] ?? null;
        this.basicInfoForm.patchValue({
          managerIds: selectedManagerIds,
          managerId: primaryManagerId
        });
      }

      if ((this.isManager || this.isTeacher) && this.currentUser.students?.length) {
        this.students = this.currentUser.students;
        this.basicInfoForm.patchValue({
          studentIds: this.currentUser.students.map((s) => s.id)
        });
      }
      if (this.currentUser.managerCircles?.length) {
        const circleList: CircleDto[] = this.currentUser.managerCircles
          .filter((c) => typeof c.circleId === 'number')
          .map((c) => ({
            id: c.circleId as number,
            name: c.circle || ''
          }));
        this.circles = circleList;
        if (this.isManager) {
          this.basicInfoForm.patchValue({
            circleIds: circleList.map((c) => c.id)
          });
        } else {
          this.basicInfoForm.patchValue({
            circleId: circleList[0]?.id ?? null
          });
        }
      } else if (this.currentUser.circleId && this.currentUser.circleName) {
        const circle: CircleDto = {
          id: this.currentUser.circleId,
          name: this.currentUser.circleName
        };
        this.circles = [circle];
        if (this.isManager) {
          this.basicInfoForm.patchValue({
            circleIds: [circle.id]
          });
        } else {
          this.basicInfoForm.patchValue({
            circleId: circle.id
          });
        }
      }
      this.loadRelatedUsers();
      if (this.isManager) {
        if (this.isBranchLeaderUser) {
          this.basicInfoForm.get('circleIds')?.enable();
          this.loadCircles();
        } else {
          this.basicInfoForm.get('circleIds')?.disable();
        }
      }
      if (this.isTeacher) {
        const managerIds = this.normalizeIds(this.basicInfoForm.get('managerIds')?.value ?? []);
        const primaryManagerId = managerIds[0] ?? this.basicInfoForm.get('managerId')?.value ?? null;
        if (primaryManagerId) {
          this.loadStudentsAndCircles(primaryManagerId);
        } else {
          this.basicInfoForm.get('studentIds')?.disable();
          this.basicInfoForm.get('circleId')?.disable();
        }
      } else if (this.isStudent) {
        this.basicInfoForm.get('teacherId')?.disable();
        this.basicInfoForm.get('circleId')?.disable();
        const managerIds = this.normalizeIds(this.basicInfoForm.get('managerIds')?.value ?? []);
        const mId = managerIds[0] ?? this.basicInfoForm.get('managerId')?.value;
        if (mId) {
          this.onStudentManagerSelectionChange(managerIds, true);
          const tId = this.basicInfoForm.get('teacherId')?.value;
          if (tId) {
            this.onTeacherChange(tId);
          }
        }
      } else {
        this.loadCircles();
      }

      if (this.shouldLockManagerAssignment) {
        this.basicInfoForm.get('managerIds')?.disable({ emitEvent: false });
        this.basicInfoForm.get('managerId')?.disable({ emitEvent: false });
      }

      this.captureInitialRelationState();
    }

    this.countryService.getCountries().subscribe((data) => {
      this.countries = data;
      if (this.currentUser) {
        const detected = this.detectDialCode(this.currentUser.mobile, this.countries);

        if (detected) {
          this.basicInfoForm.patchValue({
            mobileCountryDialCode: detected.dialCode,
            mobile: detected.number
          });
          this.onCountryCodeChange('mobileCountryDialCode');
        }
        if (this.currentUser.secondMobile) {
          const secondDetected = this.detectDialCode(this.currentUser.secondMobile, this.countries);

          if (secondDetected) {
            this.basicInfoForm.patchValue({
              secondMobileCountryDialCode: secondDetected.dialCode,
              secondMobile: secondDetected.number
            });
            this.onCountryCodeChange('secondMobileCountryDialCode');
          }
        }
      }
    });
  }

  private loadRelatedUsers() {
    const fullListFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 1000 };
    if (this.isManager) {
      this.lookupService
        .getUsersForSelects(fullListFilter, Number(UserTypesEnum.Teacher), 0, 0, this.currentUser?.branchId || 0)
        .subscribe((res) => {
          if (res.isSuccess) {
            const existing = new Map(this.teachers.map((t) => [t.id, t]));
            res.data.items.forEach((t) => existing.set(t.id, t));
            this.teachers = Array.from(existing.values());

          }
        });
    } else if (this.isTeacher) {
      this.lookupService
        .getUsersForSelects(fullListFilter, Number(UserTypesEnum.Manager), 0, 0, this.currentUser?.branchId || 0)
        .subscribe((res) => {
          if (res.isSuccess) {
            const existing = new Map(this.managers.map((m) => [m.id, m]));
            res.data.items.forEach((m) => existing.set(m.id, m));
            this.managers = Array.from(existing.values());
          }
        });
    } else if (this.isStudent) {
      this.lookupService
        .getUsersForSelects(fullListFilter, Number(UserTypesEnum.Manager), 0, 0, this.currentUser?.branchId || 0)
        .subscribe((res) => {
          if (res.isSuccess) {
            const existing = new Map(this.managers.map((m) => [m.id, m]));
            res.data.items.forEach((m) => existing.set(m.id, m));
            this.managers = Array.from(existing.values());
          }
        });
    }
    if (this.isManager) {
      this.lookupService
        .getUsersForSelects(fullListFilter, Number(UserTypesEnum.Student), 0, 0, this.currentUser?.branchId || 0)
        .subscribe((res) => {
          if (res.isSuccess) {
            const existing = new Map(this.students.map((s) => [s.id, s]));
            res.data.items.forEach((s) => existing.set(s.id, s));
            this.students = Array.from(existing.values());

          }
        });
    }
  }

  onTeachersChange(selection: unknown) {
    const teacherIds = this.normalizeTeacherIds(this.extractSelectIds(selection));
    if (!this.isManager) {
      return;
    }

    this.basicInfoForm.patchValue({ teacherIds }, { emitEvent: false });

    if (this.isBranchLeaderUser) {
      return;
    }

    if (!(teacherIds && teacherIds.length)) {
      this.circles = [];
      this.basicInfoForm.patchValue({ circleIds: [] });
      return;
    }
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    forkJoin(teacherIds.map((id) => this.circleService.getAll(filter, undefined, id))).subscribe(
      (responses) => {
        const allCircles = responses
          .filter((res) => res.isSuccess)
          .flatMap((res) => res.data.items);
        const unique = new Map(allCircles.map((c) => [c.id, c]));
        this.circles = Array.from(unique.values());
        this.basicInfoForm.patchValue({ circleIds: Array.from(unique.keys()) });
      }
    );

  }

  private setupStudentManagersTeacherStream(): void {
    this.studentManagerSelection$
      .pipe(
        debounceTime(200),
        tap(({ managerIds }) => {
          this.selectedManagers = managerIds;
          this.circles = [];

          if (managerIds.length === 0) {
            this.teachersLoading = false;
            this.teachers = [];
            this.basicInfoForm.patchValue({ teacherId: null, circleId: null }, { emitEvent: false });
            this.basicInfoForm.get('teacherId')?.disable({ emitEvent: false });
            this.basicInfoForm.get('circleId')?.disable({ emitEvent: false });
          } else {
            this.teachersLoading = true;
            this.basicInfoForm.get('teacherId')?.disable({ emitEvent: false });
            this.basicInfoForm.get('circleId')?.disable({ emitEvent: false });
          }
        }),
        switchMap(({ managerIds }) => {
          if (managerIds.length === 0) {
            return of<LookUpUserDto[]>([]);
          }

          const fullListFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 1000 };
          return this.lookupService
            .getUsersForSelects(
              fullListFilter,
              Number(UserTypesEnum.Teacher),
              0,
              0,
              this.currentUser?.branchId || 0,
              undefined,
              false,
              managerIds
            )
            .pipe(
              catchError(() => of(null)),
              tap(() => (this.teachersLoading = false)),
              switchMap((res) => of(res?.isSuccess ? res.data.items : []))
            );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((teachers) => {
        this.teachers = teachers;

        const teacherControl = this.basicInfoForm.get('teacherId');
        const currentTeacherId = teacherControl?.value;
        const teacherStillAvailable = currentTeacherId && this.teachers.some((teacher) => teacher.id === currentTeacherId);

        if (!teacherStillAvailable) {
          this.basicInfoForm.patchValue({ teacherId: null, circleId: null }, { emitEvent: false });
        }

        if (this.selectedManagers.length > 0) {
          teacherControl?.enable({ emitEvent: false });
        }
      });
  }

  onStudentManagerSelectionChange(managerIds: number[], initial = false): void {
    this.studentManagerSelection$.next({
      managerIds,
      preserveSelection: initial
    });
  }

  onTeacherChange(selection: unknown) {
    const teacherId = this.extractSelectIds(selection)[0] ?? null;
    const circleFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };

    if (teacherId) {
      this.circleService.getAll(circleFilter, undefined, teacherId).subscribe((res) => {
        if (res.isSuccess) {
          this.circles = res.data.items;
          const currentCircleId = this.toNumberOrNull(this.basicInfoForm.get('circleId')?.value);
          const hasCurrentCircle = !!currentCircleId && this.circles.some((circle) => circle.id === currentCircleId);
          const first = this.circles[0];
          this.basicInfoForm.patchValue({ circleId: hasCurrentCircle ? currentCircleId : first ? first.id : null });
        }
      });
    } else {
      this.circles = [];
      this.basicInfoForm.patchValue({ circleId: null });
    }

    this.basicInfoForm.get('circleId')?.disable();
  }

  private toNumberOrNull(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private loadStudentsAndCircles(managerId: number) {
    const fullListFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 1000 };
    const effectiveManagerId = this.getEffectiveManagerId(managerId);

    this.lookupService
      .getUsersForSelects(
        fullListFilter,
        Number(UserTypesEnum.Student),
        effectiveManagerId,
        0,
        this.currentUser?.branchId || 0
      )
      .subscribe((res) => {
        if (res.isSuccess) {
          this.students = res.data.items;
        }
      });
    const circleFilter: FilteredResultRequestDto = {
      skipCount: 0,
      maxResultCount: 100
    };
    this.circleService.getAll(circleFilter, effectiveManagerId).subscribe((res) => {
      if (res.isSuccess) {
        this.circles = res.data.items;
      }
    });
    this.basicInfoForm.get('studentIds')?.enable();
    this.basicInfoForm.get('circleId')?.enable();
  }

  onTeacherManagersChange(selection: unknown) {
    if (this.shouldLockManagerAssignment) {
      return;
    }

    const managerIds = this.normalizeIds(this.extractSelectIds(selection));
    this.basicInfoForm.patchValue({ managerIds }, { emitEvent: false });

    const primaryManagerId = managerIds[0] ?? null;
    this.basicInfoForm.patchValue({ managerId: primaryManagerId }, { emitEvent: false });

    if (primaryManagerId) {
      this.loadStudentsAndCircles(primaryManagerId);
    } else {
      this.students = [];
      this.circles = [];
      this.basicInfoForm.patchValue({ studentIds: [], circleId: null });
      this.basicInfoForm.get('studentIds')?.disable();
      this.basicInfoForm.get('circleId')?.disable();
    }
  }

  onStudentManagersChange(selection: unknown): void {
    if (this.shouldLockManagerAssignment) {
      return;
    }

    const managerIds = this.normalizeIds(this.extractSelectIds(selection));
    const primaryManagerId = managerIds[0] ?? null;

    this.basicInfoForm.patchValue(
      {
        managerIds,
        managerId: primaryManagerId
      },
      { emitEvent: false }
    );

    this.onStudentManagerSelectionChange(managerIds);
  }

  private loadCircles() {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.circleService.getAll(filter).subscribe((res) => {
      if (res.isSuccess) {
        const existing = new Map(this.circles.map((c) => [c.id, c]));
        res.data.items.forEach((c) => existing.set(c.id, c));
        this.circles = Array.from(existing.values());
      }
    });
  }

  onCountryCodeChange(control: 'mobileCountryDialCode' | 'secondMobileCountryDialCode') {
    const code = this.basicInfoForm.get(control)?.value;
    const format = this.phoneFormats[code] || { mask: '', placeholder: '' };
    if (control === 'mobileCountryDialCode') {
      this.mobileMask = format.mask;
      this.mobilePlaceholder = format.placeholder;
    } else {
      this.secondMobileMask = format.mask;
      this.secondMobilePlaceholder = format.placeholder;
    }
  }

  private detectDialCode(phone: string, countries: Country[]): { dialCode: string; number: string } | null {
    const digits = phone.replace(/\D/g, '');
    const codes = countries.map((c) => c.dialCode.replace('+', '')).sort((a, b) => b.length - a.length);
    for (const code of codes) {
      if (digits.startsWith(code)) {
        return { dialCode: `+${code}`, number: digits.slice(code.length) };
      }
    }
    return null;
  }

  private applyGovernorateRequirement(residentId: number | null): void {
    const governorateControl = this.basicInfoForm.get('governorateId');
    if (!governorateControl) {
      return;
    }

    const nationality = this.nationalities.find((n) => n.id === Number(residentId)) ?? null;
    if (isEgyptianNationality(nationality)) {
      governorateControl.setValidators([Validators.required]);
    } else {
      governorateControl.clearValidators();
    }

    governorateControl.updateValueAndValidity({ emitEvent: false });
    this.refreshMissingRequiredFields();
  }

  private updateStudentTeacherValidation(): void {
    if (!this.isStudent) {
      return;
    }

    const teacherControl = this.basicInfoForm.get('teacherId');
    if (!teacherControl) {
      return;
    }

    if (this.canLeaveStudentWithoutTeacher) {
      teacherControl.clearValidators();
    } else {
      teacherControl.setValidators([Validators.required]);
    }

    teacherControl.updateValueAndValidity({ emitEvent: false });
  }

  private resetPendingStudentSubscribeSelection(residentId: number | null): void {
    if (!this.pendingStudentSubscribeSelection) {
      return;
    }

    const normalizedResidentId = Number(residentId);
    if (!Number.isFinite(normalizedResidentId) || normalizedResidentId <= 0) {
      this.pendingStudentSubscribeSelection = null;
      return;
    }

    if (this.pendingStudentSubscribeSelection.residentId !== normalizedResidentId) {
      this.pendingStudentSubscribeSelection = null;
    }
  }

  private async getCurrentStudentSubscription(forceRefresh = false): Promise<ViewStudentSubscribeReDto | null> {
    if (!this.isStudent || !this.userId) {
      return null;
    }

    if (!forceRefresh && this.currentStudentSubscription) {
      return this.currentStudentSubscription;
    }

    try {
      const response = await firstValueFrom(
        this.studentSubscribeService.getStudentSubscribesWithPayment(
          {
            skipCount: 0,
            maxResultCount: 1
          },
          this.userId
        )
      );

      this.currentStudentSubscription = response?.data?.items?.[0] ?? null;
    } catch {
      // Keep the form functional even if the current subscription cannot be loaded.
    }

    return this.currentStudentSubscription;
  }

  private resolveResidencyGroup(residentId: number | null | undefined): ResidencyGroupFilter | null {
    if (!residentId || residentId <= 0) {
      return null;
    }

    const nationality = this.nationalities.find((item) => item.id === residentId) ?? null;
    if (!nationality) {
      return null;
    }

    if (isEgyptianNationality(nationality)) {
      return 'egyptian';
    }

    if (isArabNationality(nationality)) {
      return 'arab';
    }

    return 'foreign';
  }

  private mapResidencyGroupToCategory(group: ResidencyGroupFilter | null): SubscribeTypeCategory | null {
    switch (group) {
      case 'egyptian':
        return SubscribeTypeCategory.Egyptian;
      case 'arab':
        return SubscribeTypeCategory.Arab;
      case 'foreign':
        return SubscribeTypeCategory.Foreign;
      default:
        return null;
    }
  }

  private getSubscribeCategoryLabel(category: SubscribeTypeCategory | null | undefined): string {
    switch (category ?? SubscribeTypeCategory.Unknown) {
      case SubscribeTypeCategory.Egyptian:
        return 'المصريين';
      case SubscribeTypeCategory.Arab:
        return 'العرب';
      case SubscribeTypeCategory.Foreign:
        return 'الأجانب';
      default:
        return 'غير محددة';
    }
  }

  private getResidentNameById(residentId: number | null | undefined): string {
    if (!residentId || residentId <= 0) {
      return 'المكان المحدد';
    }

    return this.nationalities.find((item) => item.id === residentId)?.name ?? 'المكان المحدد';
  }

  private async promptForCompatibleSubscription(
    targetResidentId: number,
    targetResidencyGroup: ResidencyGroupFilter,
    currentSubscription: ViewStudentSubscribeReDto | null
  ): Promise<number | null> {
    const targetCategory = this.mapResidencyGroupToCategory(targetResidencyGroup);
    const warningAccepted = await firstValueFrom(
      this.dialog
        .open(ResidencySubscribeWarningDialogComponent, {
          width: '560px',
          data: {
            targetResidentName: this.getResidentNameById(targetResidentId),
            currentPlanName: currentSubscription?.plan ?? null,
            currentGroupLabel: this.getSubscribeCategoryLabel(currentSubscription?.subscribeTypeGroup),
            targetGroupLabel: this.getSubscribeCategoryLabel(targetCategory)
          }
        })
        .afterClosed()
    );

    if (!warningAccepted) {
      return null;
    }

    const selectedPlan = await firstValueFrom(
      this.dialog
        .open(StudentSubscribeDialogComponent, {
          width: '520px',
          data: {
            studentId: this.userId,
            residentId: targetResidentId,
            residentGroup: targetResidencyGroup,
            selectionMode: 'select',
            title: 'اختيار الباقة المناسبة',
            submitLabel: 'اعتماد الباقة',
            description: 'اختر باقة متوافقة مع مكان الإقامة الجديد قبل حفظ بيانات الطالب.'
          }
        })
        .afterClosed()
    );

    if (!selectedPlan?.subscribeId) {
      return null;
    }

    this.pendingStudentSubscribeSelection = {
      residentId: targetResidentId,
      subscribeId: selectedPlan.subscribeId,
      subscribeName: selectedPlan.subscribeName ?? null
    };

    return selectedPlan.subscribeId;
  }

  private async resolveStudentSubscribeSelectionForResidentChange(
    targetResidentId: number | null | undefined
  ): Promise<number | null | undefined> {
    if (!this.isStudent || !this.currentUser) {
      return undefined;
    }

    const normalizedTargetResidentId = Number(targetResidentId);
    const originalResidentId = Number(this.currentUser.residentId ?? 0);

    if (!Number.isFinite(normalizedTargetResidentId) || normalizedTargetResidentId <= 0) {
      return undefined;
    }

    if (normalizedTargetResidentId === originalResidentId) {
      return undefined;
    }

    if (this.pendingStudentSubscribeSelection?.residentId === normalizedTargetResidentId) {
      return this.pendingStudentSubscribeSelection.subscribeId;
    }

    const targetResidencyGroup = this.resolveResidencyGroup(normalizedTargetResidentId);
    const targetCategory = this.mapResidencyGroupToCategory(targetResidencyGroup);
    if (!targetResidencyGroup || targetCategory === null) {
      return undefined;
    }

    const currentSubscription = await this.getCurrentStudentSubscription(true);
    const hasCurrentSubscription = !!currentSubscription?.plan;
    if (!hasCurrentSubscription) {
      return undefined;
    }

    if (currentSubscription?.subscribeTypeGroup === targetCategory) {
      return undefined;
    }

    return this.promptForCompatibleSubscription(
      normalizedTargetResidentId,
      targetResidencyGroup,
      currentSubscription
    );
  }

  private getListRoute(): string {
    if (this.isStudent) {
      return '/online-course/student/list';
    }
    if (this.isTeacher) {
      return '/online-course/teacher/list';
    }
    if (this.isManager) {
      return '/online-course/manager/list';
    }
    return '/online-course/student/list';
  }

  private captureInitialRelationState(): void {
    if (!this.currentUser) {
      return;
    }

    const managerTeacherIds = this.isManager
      ? this.normalizeTeacherIds([
          ...(this.currentUser.teachers ?? []).map((teacher) => teacher.id),
          ...(typeof this.currentUser.teacherId === 'number' ? [this.currentUser.teacherId] : [])
        ])
      : [];

    const managerIds = this.getSelectedManagerIds(this.currentUser);
    const studentIds = (this.currentUser.students ?? [])
      .map((student) => Number(student.id))
      .filter((id): id is number => Number.isFinite(id) && id > 0);
    const circleIds = (this.currentUser.managerCircles ?? [])
      .map((circle) => Number(circle.circleId))
      .filter((id): id is number => Number.isFinite(id) && id > 0);

    this.initialTeacherIds = managerTeacherIds;
    this.initialManagerIds = managerIds;
    this.initialStudentIds = this.normalizeIds(studentIds);
    this.initialCircleIds = this.normalizeIds(circleIds);
    this.initialTeacherId = this.currentUser.teacherId ?? this.currentUser.teachers?.[0]?.id ?? null;
    this.initialCircleId = this.currentUser.circleId ?? circleIds[0] ?? null;
  }

  private areSameIdSets(left: number[], right: number[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((id) => right.includes(id));
  }

  async onSubmit() {
    if (this.isSaving) {
      return;
    }

    this.submitted = true;
    if (this.basicInfoForm.valid) {
      // Use getRawValue so disabled controls like circleId are included
      const formValue = this.basicInfoForm.getRawValue();
      const clean = (v: string) => v.replace(/\D/g, '');
      const managerTeacherIds = this.isManager ? this.normalizeTeacherIds(formValue.teacherIds ?? []) : undefined;
      const managerIdsFromForm = this.normalizeIds(formValue.managerIds ?? []);
      const fallbackManagerId =
        typeof formValue.managerId === 'number' && Number.isFinite(formValue.managerId) && formValue.managerId > 0
          ? formValue.managerId
          : undefined;
      const managerIdsForUpdate =
        this.isTeacher || this.isStudent
          ? this.normalizeIds([
              ...managerIdsFromForm,
              ...(fallbackManagerId ? [fallbackManagerId] : [])
            ])
          : undefined;
      const managerIdForUpdate = managerIdsForUpdate?.[0] ?? fallbackManagerId;
      const currentStudentIds =
        this.isManager || this.isTeacher ? this.normalizeIds(formValue.studentIds ?? []) : [];
      const currentCircleIds = this.isManager ? this.normalizeIds(formValue.circleIds ?? []) : [];
      const currentTeacherId = this.isStudent ? this.toNumberOrNull(formValue.teacherId) : null;
      const currentCircleId = this.isTeacher ? this.toNumberOrNull(formValue.circleId) : null;
      const teacherIdsChanged = this.isManager && !this.areSameIdSets(managerTeacherIds ?? [], this.initialTeacherIds);
      const managerIdsChanged =
        (this.isTeacher || this.isStudent) && !this.areSameIdSets(managerIdsForUpdate ?? [], this.initialManagerIds);
      const studentIdsChanged =
        (this.isManager || this.isTeacher) && !this.areSameIdSets(currentStudentIds, this.initialStudentIds);
      const circleIdsChanged = this.isManager && !this.areSameIdSets(currentCircleIds, this.initialCircleIds);
      const teacherIdChanged = this.isStudent && currentTeacherId !== this.initialTeacherId;
      const circleIdChanged = this.isTeacher && currentCircleId !== this.initialCircleId;
      const model: UpdateUserDto = {
        id: this.userId,
        fullName: formValue.fullName,
        email: formValue.email,
        mobile: `${formValue.mobileCountryDialCode}${clean(formValue.mobile)}`,
        secondMobile: formValue.secondMobile ? `${formValue.secondMobileCountryDialCode}${clean(formValue.secondMobile)}` : undefined,
        nationalityId: formValue.nationalityId,
        residentId: formValue.residentId,
        governorateId: formValue.governorateId,
        branchId: formValue.branchId,
        managerId: managerIdsChanged ? (managerIdForUpdate ?? null) : undefined,
        managerIds: managerIdsChanged ? managerIdsForUpdate : undefined,
        teacherIds: teacherIdsChanged ? managerTeacherIds : undefined,
        teacherId: teacherIdChanged ? currentTeacherId ?? null : undefined,
        updateTeacherId: teacherIdChanged ? true : undefined,
        studentIds: studentIdsChanged ? currentStudentIds : undefined,
        circleIds: circleIdsChanged ? currentCircleIds : undefined,
        circleId: circleIdChanged ? currentCircleId ?? null : undefined,
        updateCircleId: circleIdChanged ? true : undefined
      };

      const pendingStudentSubscribeId = await this.resolveStudentSubscribeSelectionForResidentChange(
        formValue.residentId
      );

      if (pendingStudentSubscribeId === null) {
        return;
      }

      if (pendingStudentSubscribeId) {
        model.studentSubscribeId = pendingStudentSubscribeId;
      }

      this.isSaving = true;
      this.userService
        .updateUser(model)
        .pipe(finalize(() => (this.isSaving = false)))
        .subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            this.pendingStudentSubscribeSelection = null;
            this.currentStudentSubscription = null;
            this.toast.success(res.message || (this.isManager ? 'تم تحديث البيانات والعلاقات بنجاح' : 'تم تحديث البيانات بنجاح'));
            if (this.dialogRef) {
              this.lookupService.getUserDetails(this.userId).subscribe({
                next: (detailsRes) => {
                  if (detailsRes.isSuccess && detailsRes.data) {
                    this.dialogRef?.close(detailsRes.data);
                    return;
                  }
                  this.dialogRef?.close({
                    id: this.userId,
                    fullName: formValue.fullName,
                    email: formValue.email,
                    mobile: `${formValue.mobileCountryDialCode}${clean(formValue.mobile)}`,
                    secondMobile: formValue.secondMobile
                      ? `${formValue.secondMobileCountryDialCode}${clean(formValue.secondMobile)}`
                      : null
                  });
                },
                error: () =>
                  this.dialogRef?.close({
                    id: this.userId,
                    fullName: formValue.fullName,
                    email: formValue.email,
                    mobile: `${formValue.mobileCountryDialCode}${clean(formValue.mobile)}`,
                    secondMobile: formValue.secondMobile
                      ? `${formValue.secondMobileCountryDialCode}${clean(formValue.secondMobile)}`
                      : null
                  })
              });
              return;
            }
            const navigationState = this.isStudent ? { refreshStudentList: true } : undefined;
            this.router.navigate([this.getListRoute()], navigationState ? { state: navigationState } : undefined);
          } else if (res?.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error('خطأ في تحديث البيانات');
          }
        },
          error: () => this.toast.error('خطأ في تحديث البيانات')
        });
    } else {
      this.validationService.markAllAsTouched(this.basicInfoForm);
    }
  }

  closeEditor(): void {
    if (this.isSaving) {
      return;
    }

    if (this.dialogRef) {
      this.dialogRef.close();
      return;
    }

    const navigationState = this.isStudent ? { refreshStudentList: true } : undefined;
    this.router.navigate([this.getListRoute()], navigationState ? { state: navigationState } : undefined);
  }

  private extractSelectIds(selection: unknown): Array<number | null | undefined> {
    const eventValue =
      selection && typeof selection === 'object' && 'value' in (selection as Record<string, unknown>)
        ? (selection as { value?: unknown }).value
        : selection;

    if (Array.isArray(eventValue)) {
      return eventValue.map((item) =>
        typeof item === 'number' ? item : typeof item === 'object' && item && 'id' in item ? Number((item as { id?: unknown }).id) : null
      );
    }

    if (typeof eventValue === 'number') {
      return [eventValue];
    }

    if (typeof eventValue === 'object' && eventValue && 'id' in eventValue) {
      return [Number((eventValue as { id?: unknown }).id)];
    }

    return [];
  }

  private normalizeIds(ids: Array<number | null | undefined>): number[] {
    const uniqueIds = new Set<number>();
    ids.forEach((id) => {
      if (typeof id === 'number' && Number.isFinite(id) && id > 0) {
        uniqueIds.add(id);
      }
    });

    return Array.from(uniqueIds);
  }

  private normalizeTeacherIds(ids: Array<number | null | undefined>): number[] {
    return this.normalizeIds(ids);
  }

  private getSelectedManagerIds(user: NonNullable<UserEditComponent['currentUser']>): number[] {
    const relationManagerIds = Array.isArray(user.managers)
      ? user.managers.map((manager) => manager.id)
      : [];
    const managerIds = Array.isArray(user.managerIds) ? user.managerIds : [];
    const fallbackManagerId = typeof user.managerId === 'number' ? [user.managerId] : [];

    return this.normalizeIds([...relationManagerIds, ...managerIds, ...fallbackManagerId]);
  }

  private ensureSelectedManagersInList(selectedManagerIds: number[]): void {
    const existing = new Map(this.managers.map((manager) => [manager.id, manager]));
    const relationManagers = Array.isArray(this.currentUser?.managers) ? this.currentUser.managers : [];

    relationManagers.forEach((manager) => existing.set(manager.id, manager));

    selectedManagerIds.forEach((managerId, index) => {
      if (existing.has(managerId)) {
        return;
      }

      const fallbackName =
        this.currentUser?.managerNames?.[index] ??
        (this.currentUser?.managerId === managerId ? this.currentUser?.managerName : undefined) ??
        `المشرف #${managerId}`;

      existing.set(managerId, {
        id: managerId,
        fullName: fallbackName,
        email: '',
        mobile: '',
        secondMobile: '',
        nationality: '',
        nationalityId: 0,
        residentId: 0,
        governorate: '',
        governorateId: 0,
        branchId: this.currentUser?.branchId ?? 0
      });
    });

    this.managers = Array.from(existing.values());
  }

  private getMissingRequiredFields(): string[] {
    const requiredFieldLabels: Record<string, string> = {
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      mobileCountryDialCode: 'مفتاح الدولة للجوال',
      mobile: 'رقم الجوال',
      nationalityId: 'الجنسية',
      residentId: 'مكان الإقامة',
      governorateId: 'المحافظة',
      branchId: 'الفرع'
    };

    return Object.entries(requiredFieldLabels)
      .filter(([controlName]) => this.isRequiredControlMissing(controlName))
      .map(([, label]) => label);
  }

  private isRequiredControlMissing(controlName: string): boolean {
    const control = this.basicInfoForm.get(controlName);
    return !!control && control.enabled && control.hasError('required');
  }

  private refreshMissingRequiredFields(): void {
    this.missingRequiredFields = this.getMissingRequiredFields();
  }

  private setupMissingRequiredFieldsTracking(): void {
    merge(this.basicInfoForm.statusChanges, this.basicInfoForm.valueChanges)
      .pipe(startWith(null))
      .subscribe(() => this.refreshMissingRequiredFields());
  }
}
