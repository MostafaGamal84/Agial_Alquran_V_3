// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

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
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { isEgyptianNationality } from 'src/app/@theme/utils/nationality.utils';

@Component({
  selector: 'app-user-edit',
  imports: [CommonModule, SharedModule, NgxMaskDirective],
  templateUrl: './user-edit.component.html',
  styleUrl: './user-edit.component.scss',
  providers: [provideNgxMask()]
})
export class UserEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private lookupService = inject(LookupService);
  private circleService = inject(CircleService);
  private countryService = inject(CountryService);
  private auth = inject(AuthenticationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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
  isManager = false;
  isTeacher = false;
  isStudent = false;
  isBranchLeaderUser = false;
  submitted = false;
  isSaving = false;
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

  private get shouldLockManagerAssignment(): boolean {
    return (this.isTeacher || this.isStudent) && this.auth.getRole() === UserTypesEnum.Manager;
  }

  private getEffectiveManagerId(managerId?: number | null): number {
    return this.loggedInManagerId ?? managerId ?? 0;
  }

  ngOnInit(): void {
    this.isManager = this.router.url.includes('/manager/');
    this.isTeacher = this.router.url.includes('/teacher/');
    this.isStudent = this.router.url.includes('/student/');
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

    this.basicInfoForm
      .get('residentId')
      ?.valueChanges.subscribe((residentId) => this.applyGovernorateRequirement(residentId));

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

    const idParam = this.route.snapshot.paramMap.get('id');
    const parsedId = idParam ? Number(idParam) : NaN;
    if (!isNaN(parsedId)) {
      this.userId = parsedId;
      this.loadUserDetails(parsedId);
    } else {
      this.toast.error('No user id provided');
    }
  }

  private loadUserDetails(id: number) {
    this.lookupService.getUserDetails(id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.currentUser = res.data as typeof this.currentUser;
          this.populateUserForm();
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
          this.onManagerChange(mId, true);
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

  onManagerChange(managerId: number, initial = false) {
    const fullListFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 1000 };
    const effectiveManagerId = this.getEffectiveManagerId(managerId);

    if (effectiveManagerId) {
      this.lookupService
        .getUsersForSelects(
          fullListFilter,
          Number(UserTypesEnum.Teacher),
          effectiveManagerId,
          0,
          this.currentUser?.branchId || 0
        )
        .subscribe((res) => {
          if (res.isSuccess) {
            this.teachers = res.data.items;
            const current = this.basicInfoForm.get('teacherId')?.value;
            if (!initial) {
              this.basicInfoForm.patchValue({ teacherId: null });
            } else if (current && !this.teachers.some((t) => t.id === current)) {
              this.basicInfoForm.patchValue({ teacherId: null });
            }
          }
        });
      this.basicInfoForm.get('teacherId')?.enable();
      if (!initial) {
        this.basicInfoForm.patchValue({ circleId: null });
      }
      this.circles = [];
      this.basicInfoForm.get('circleId')?.disable();
    } else {
      this.teachers = [];
      this.basicInfoForm.patchValue({ teacherId: null, circleId: null });
      this.basicInfoForm.get('teacherId')?.disable();
      this.circles = [];
      this.basicInfoForm.get('circleId')?.disable();
    }
  }

  onTeacherChange(selection: unknown) {
    const teacherId = this.extractSelectIds(selection)[0] ?? null;
    const circleFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };

    if (teacherId) {
      this.circleService.getAll(circleFilter, undefined, teacherId).subscribe((res) => {
        if (res.isSuccess) {
          this.circles = res.data.items;
          const first = this.circles[0];
          this.basicInfoForm.patchValue({ circleId: first ? first.id : null });
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
        managerId: primaryManagerId,
        teacherId: null,
        circleId: null
      },
      { emitEvent: false }
    );

    this.circles = [];

    if (primaryManagerId) {
      this.onManagerChange(primaryManagerId);
      return;
    }

    this.teachers = [];
    this.basicInfoForm.get('teacherId')?.disable();
    this.basicInfoForm.get('circleId')?.disable();
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

  onSubmit() {
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
        managerId: this.isTeacher || this.isStudent ? managerIdForUpdate : undefined,
        managerIds: this.isTeacher || this.isStudent ? managerIdsForUpdate : undefined,
        teacherIds: managerTeacherIds,
        teacherId: this.isStudent ? formValue.teacherId : undefined,

        studentIds: this.isManager || this.isTeacher ? formValue.studentIds : undefined,
        circleIds: this.isManager ? formValue.circleIds : undefined,
        circleId: this.isTeacher || this.isStudent ? formValue.circleId : undefined
      };
      this.isSaving = true;
      this.userService
        .updateUser(model)
        .pipe(finalize(() => (this.isSaving = false)))
        .subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            this.toast.success(res.message || (this.isManager ? 'تم تحديث البيانات والعلاقات بنجاح' : 'تم تحديث البيانات بنجاح'));
            this.router.navigate([this.getListRoute()]);
          } else if (res?.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error('خطأ في تحديث البيانات');
          }
        },
          error: () => this.toast.error('خطأ في تحديث البيانات')
        });
    } else {
      this.basicInfoForm.markAllAsTouched();
    }
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
}
