import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { LookUpUserDto, LookupService } from 'src/app/@theme/services/lookup.service';
import {
  AuditLogChangeDto,
  AuditLogFilterDto,
  AuditLogFilterOptionDto,
  AuditLogListItemDto,
  AuditLogParticipantDto,
  OperationsLogService
} from 'src/app/@theme/services/operations-log.service';
import { SubscribeDto, SubscribeService, SubscribeTypeDto } from 'src/app/@theme/services/subscribe.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { SharedModule } from 'src/app/demo/shared/shared.module';

interface SelectOption {
  id: number;
  name: string;
}

const ACTION_LABELS: Record<string, string> = {
  Create: 'إضافة',
  Update: 'تعديل',
  Delete: 'حذف',
  Restore: 'استعادة'
};

const ENTITY_LABELS: Record<string, string> = {
  User: 'مستخدم',
  Circle: 'حلقة',
  CircleReport: 'تقرير حلقة',
  Subscribe: 'باقة',
  SubscribeType: 'نوع باقة',
  StudentSubscribe: 'اشتراك طالب',
  StudentPayment: 'دفعة طالب',
  TeacherSallary: 'راتب معلم',
  ManagerTeacher: 'ربط مشرف بمعلم',
  ManagerStudent: 'ربط مشرف بطالب',
  ManagerCircle: 'ربط مشرف بحلقة'
};

const PARTICIPANT_LABELS: Record<string, string> = {
  Student: 'طالب',
  Teacher: 'معلم',
  Manager: 'مشرف',
  BranchLeader: 'قائد فرع',
  Admin: 'إدمن',
  Subscribe: 'باقة',
  SubscribeType: 'نوع باقة',
  Circle: 'حلقة',
  CircleReport: 'تقرير',
  StudentPayment: 'دفعة',
  User: 'مستخدم'
};

const FIELD_LABELS: Record<string, string> = {
  FullName: 'الاسم',
  Name: 'الاسم',
  UserName: 'اسم المستخدم',
  Email: 'البريد الإلكتروني',
  Mobile: 'الجوال',
  SecondMobile: 'الجوال الإضافي',
  ResidentId: 'الإقامة',
  ResidenceId: 'الإقامة',
  NationalityId: 'الجنسية',
  GovernorateId: 'المحافظة',
  BranchId: 'الفرع',
  UserTypeId: 'نوع المستخدم',
  TeacherId: 'المعلم',
  StudentId: 'الطالب',
  ManagerId: 'المشرف',
  CircleId: 'الحلقة',
  StudentSubscribeId: 'الباقة',
  SubscribeId: 'الباقة',
  OldSubscribeId: 'الباقة السابقة',
  NewSubscribeId: 'الباقة الجديدة',
  SubscribeTypeId: 'نوع الباقة',
  StudentSubscribeTypeId: 'نوع الباقة',
  StudentPaymentId: 'الدفعة',
  CircleReportId: 'التقرير',
  Price: 'السعر',
  Amount: 'المبلغ',
  Minutes: 'الدقائق',
  HourPrice: 'سعر الساعة',
  Month: 'الشهر',
  PaymentDate: 'تاريخ الدفع',
  PayedAt: 'تاريخ السداد',
  Inactive: 'الحالة',
  PasswordHash: 'كلمة المرور',
  Other: 'ملاحظات',
  GeneralRate: 'التقييم العام',
  Intonation: 'أحكام التجويد',
  RecentPast: 'القريب الماضي',
  DistantPast: 'البعيد الماضي',
  FarthestPast: 'الأبعد ماضيًا',
  NextCircleOrder: 'واجب الحلقة القادمة',
  ReceiptPath: 'الإيصال',
  Sallary: 'الراتب',
  IsPayed: 'تم السداد',
  PayStatus: 'حالة السداد',
  PayStatue: 'حالة السداد',
  IsCancelled: 'ملغي'
};

const VALUE_LABELS: Record<string, string> = {
  true: 'نعم',
  false: 'لا',
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
  paid: 'مدفوع',
  unpaid: 'غير مدفوع',
  cash: 'نقدي',
  transfer: 'تحويل',
  banktransfer: 'تحويل بنكي',
  male: 'ذكر',
  female: 'أنثى',
  admin: 'إدمن',
  manager: 'مشرف',
  branchleader: 'قائد فرع',
  teacher: 'معلم',
  student: 'طالب'
};

const SOURCE_ROUTE_LABELS: Array<{ route: string; label: string }> = [
  { route: '/online-course/student', label: 'شاشة الطلاب' },
  { route: '/online-course/teacher', label: 'شاشة المعلمين' },
  { route: '/online-course/manager', label: 'شاشة المشرفين' },
  { route: '/online-course/branch-manager', label: 'شاشة قادة الفروع' },
  { route: '/online-course/courses', label: 'شاشة الحلقات' },
  { route: '/online-course/report', label: 'شاشة التقارير' },
  { route: '/online-course/pricing', label: 'شاشة الأسعار' },
  { route: '/online-course/site', label: 'شاشة الموقع' },
  { route: '/online-course/setting', label: 'شاشة الإعدادات' },
  { route: '/online-course/deleted-objects', label: 'شاشة العناصر المحذوفة' },
  { route: '/online-course/operations-log', label: 'شاشة سجل العمليات' },
  { route: '/online-course/dashboard', label: 'شاشة لوحة التحكم' },
  { route: '/auth/login', label: 'شاشة تسجيل الدخول' }
];

const SOURCE_SCREEN_KEY_LABELS: Record<string, string> = {
  students: 'شاشة الطلاب',
  teachers: 'شاشة المعلمين',
  managers: 'شاشة المشرفين',
  'branch-managers': 'شاشة قادة الفروع',
  circles: 'شاشة الحلقات',
  reports: 'شاشة التقارير',
  pricing: 'شاشة الأسعار',
  site: 'شاشة الموقع',
  settings: 'شاشة الإعدادات',
  'deleted-objects': 'شاشة العناصر المحذوفة',
  'operations-log': 'شاشة سجل العمليات',
  dashboard: 'شاشة لوحة التحكم',
  login: 'شاشة تسجيل الدخول'
};

const DEFAULT_ACTION_OPTIONS: AuditLogFilterOptionDto[] = [
  { value: 'Create', label: ACTION_LABELS['Create'] },
  { value: 'Update', label: ACTION_LABELS['Update'] },
  { value: 'Delete', label: ACTION_LABELS['Delete'] },
  { value: 'Restore', label: ACTION_LABELS['Restore'] }
];

const DEFAULT_ENTITY_OPTIONS: AuditLogFilterOptionDto[] = [
  { value: 'User', label: ENTITY_LABELS['User'] },
  { value: 'Circle', label: ENTITY_LABELS['Circle'] },
  { value: 'CircleReport', label: ENTITY_LABELS['CircleReport'] },
  { value: 'Subscribe', label: ENTITY_LABELS['Subscribe'] },
  { value: 'SubscribeType', label: ENTITY_LABELS['SubscribeType'] },
  { value: 'StudentSubscribe', label: ENTITY_LABELS['StudentSubscribe'] },
  { value: 'StudentPayment', label: ENTITY_LABELS['StudentPayment'] },
  { value: 'TeacherSallary', label: ENTITY_LABELS['TeacherSallary'] },
  { value: 'ManagerTeacher', label: ENTITY_LABELS['ManagerTeacher'] },
  { value: 'ManagerStudent', label: ENTITY_LABELS['ManagerStudent'] },
  { value: 'ManagerCircle', label: ENTITY_LABELS['ManagerCircle'] }
];

@Component({
  selector: 'app-operations-log',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SharedModule, LoadingOverlayComponent],
  templateUrl: './operations-log.component.html',
  styleUrl: './operations-log.component.scss'
})
export class OperationsLogComponent implements OnInit, OnDestroy {
  private readonly operationsLogService = inject(OperationsLogService);
  private readonly lookupService = inject(LookupService);
  private readonly subscribeService = inject(SubscribeService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  private readonly destroy$ = new Subject<void>();
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;
  private readonly expandedChangesLogIds = new Set<number>();
  private readonly expandedParticipantsLogIds = new Set<number>();
  private readonly defaultChangesPreviewCount = 3;
  private readonly updateChangesPreviewCount = 4;
  private readonly participantsPreviewCount = 4;

  readonly displayedColumns = ['createdAt', 'actionType', 'entityType', 'actor', 'details', 'participants'];
  readonly filterForm = this.fb.group({
    searchTerm: [''],
    actionType: [null as string | null],
    entityType: [null as string | null],
    studentId: [null as number | null],
    managerId: [null as number | null],
    teacherId: [null as number | null],
    subscribeId: [null as number | null],
    subscribeTypeId: [null as number | null],
    fromDate: [null as Date | null],
    toDate: [null as Date | null]
  });

  logs: AuditLogListItemDto[] = [];
  totalCount = 0;
  pageIndex = 0;
  pageSize = 20;
  isLoading = false;
  isLoadingMore = false;
  isLoadingFilters = false;

  actionOptions: AuditLogFilterOptionDto[] = [...DEFAULT_ACTION_OPTIONS];
  entityOptions: AuditLogFilterOptionDto[] = [...DEFAULT_ENTITY_OPTIONS];
  students: SelectOption[] = [];
  managers: SelectOption[] = [];
  teachers: SelectOption[] = [];
  subscribes: SelectOption[] = [];
  subscribeTypes: SelectOption[] = [];

  private filter: AuditLogFilterDto = {
    skipCount: 0,
    maxResultCount: this.pageSize,
    sortBy: 'CreatedAt',
    sortingDirection: 'DESC'
  };

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadLookupFilters();
    this.loadLogs();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearFilters(): void {
    this.filterForm.reset(
      {
        searchTerm: '',
        actionType: null,
        entityType: null,
        studentId: null,
        managerId: null,
        teacherId: null,
        subscribeId: null,
        subscribeTypeId: null,
        fromDate: null,
        toDate: null
      },
      { emitEvent: false }
    );

    this.applyFilters();
  }

  refresh(): void {
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadLogs();
  }

  hasMoreResults(): boolean {
    return this.logs.length < this.totalCount;
  }

  getActionLabel(actionType: string | null | undefined): string {
    return ACTION_LABELS[actionType ?? ''] || this.normalizeText(actionType) || 'غير محدد';
  }

  getActionClass(actionType: string | null | undefined): string {
    switch (actionType) {
      case 'Create':
        return 'create';
      case 'Update':
        return 'update';
      case 'Delete':
        return 'delete';
      case 'Restore':
        return 'restore';
      default:
        return 'default';
    }
  }

  getEntityLabel(entityType: string | null | undefined): string {
    return ENTITY_LABELS[entityType ?? ''] || this.normalizeText(entityType) || 'غير محدد';
  }

  getParticipantTypeLabel(participantType: string | null | undefined): string {
    return PARTICIPANT_LABELS[participantType ?? ''] || this.normalizeText(participantType) || 'عنصر';
  }

  getParticipantDisplay(participant: AuditLogParticipantDto): string {
    const displayName = this.normalizeText(participant.displayName);
    const resolvedName =
      this.resolveReferencedName(participant.participantType, participant.participantId, displayName) ||
      (participant.participantId && participant.participantId > 0 ? `#${participant.participantId}` : 'غير محدد');

    return `${this.getParticipantTypeLabel(participant.participantType)}: ${resolvedName}`;
  }

  getActorDisplay(log: AuditLogListItemDto): string {
    return this.normalizeText(log.actorName) || 'النظام';
  }

  getActorRoleLabel(roleId: number | null | undefined): string {
    switch (`${roleId ?? ''}`) {
      case UserTypesEnum.Admin:
        return 'إدمن';
      case UserTypesEnum.BranchLeader:
        return 'قائد فرع';
      case UserTypesEnum.Manager:
        return 'مشرف';
      case UserTypesEnum.Teacher:
        return 'معلم';
      case UserTypesEnum.Student:
        return 'طالب';
      default:
        return '';
    }
  }

  getSummaryText(log: AuditLogListItemDto): string {
    const rawSummary = this.normalizeText(log.summary);
    const generatedSummary = this.buildArabicSummary(log);

    if (log.actionType === 'Update' && (log.changes?.length ?? 0) > 0) {
      return generatedSummary || rawSummary || 'لا يوجد وصف متاح لهذه العملية';
    }

    if (rawSummary && this.containsArabic(rawSummary)) {
      return rawSummary;
    }

    return generatedSummary || rawSummary || 'لا يوجد وصف متاح لهذه العملية';
  }

  hasSourceInfo(log: AuditLogListItemDto): boolean {
    return !!(this.getSourceScreenDisplay(log) || this.getSourceRequestDisplay(log));
  }

  getSourceDisplay(log: AuditLogListItemDto): string {
    return this.getSourceScreenDisplay(log) || 'غير محدد';
  }

  getSourceScreenDisplay(log: AuditLogListItemDto): string | null {
    return (
      this.resolveSourceLabel(this.normalizeText(log.sourceScreen)) ||
      this.normalizeText(log.sourceScreen) ||
      this.resolveSourceLabelFromRoute(log.sourceRoute) ||
      this.resolveSourceLabelFromRoute(log.requestPath)
    );
  }

  getSourceRequestDisplay(log: AuditLogListItemDto): string | null {
    const requestPath = this.normalizeRoute(log.requestPath);
    const httpMethod = this.normalizeText(log.httpMethod)?.toUpperCase();
    if (!requestPath && !httpMethod) {
      return null;
    }

    return [httpMethod, requestPath].filter((value): value is string => !!value).join(' ');
  }

  getEntityDisplayName(log: AuditLogListItemDto): string | null {
    return (
      this.resolveReferencedName(log.entityType, log.entityId, this.normalizeText(log.entityDisplayName)) ||
      this.normalizeText(log.entityLabel)
    );
  }

  getChangeLabel(change: AuditLogChangeDto): string {
    const rawLabel = this.normalizeText(change.propertyLabel);
    if (rawLabel && this.containsArabic(rawLabel)) {
      return rawLabel;
    }

    const mappedLabel =
      this.resolveFieldLabel(change.propertyName) ||
      this.resolveFieldLabel(rawLabel) ||
      rawLabel ||
      this.normalizeText(change.propertyName);

    return mappedLabel || 'الحقل';
  }

  isParticipantsExpanded(log: AuditLogListItemDto): boolean {
    return this.expandedParticipantsLogIds.has(log.id);
  }

  toggleParticipants(log: AuditLogListItemDto): void {
    if (this.isParticipantsExpanded(log)) {
      this.expandedParticipantsLogIds.delete(log.id);
      return;
    }

    this.expandedParticipantsLogIds.add(log.id);
  }

  getParticipantsToggleLabel(log: AuditLogListItemDto): string {
    return this.isParticipantsExpanded(log)
      ? 'إخفاء الأطراف'
      : `عرض كل الأطراف (+${this.getHiddenParticipantsCount(log)})`;
  }

  getVisibleParticipants(log: AuditLogListItemDto): AuditLogParticipantDto[] {
    const participants = log.participants ?? [];
    return this.isParticipantsExpanded(log)
      ? participants
      : participants.slice(0, this.participantsPreviewCount);
  }

  getHiddenParticipantsCount(log: AuditLogListItemDto): number {
    return Math.max(0, (log.participants?.length ?? 0) - this.getVisibleParticipants(log).length);
  }

  isChangesExpanded(log: AuditLogListItemDto): boolean {
    return this.expandedChangesLogIds.has(log.id);
  }

  toggleChanges(log: AuditLogListItemDto): void {
    if (this.isChangesExpanded(log)) {
      this.expandedChangesLogIds.delete(log.id);
      return;
    }

    this.expandedChangesLogIds.add(log.id);
  }

  getChangesToggleLabel(log: AuditLogListItemDto): string {
    return this.isChangesExpanded(log)
      ? 'إخفاء التغييرات'
      : `عرض كل التغييرات (+${this.getHiddenChangesCount(log)})`;
  }

  getVisibleChanges(log: AuditLogListItemDto): AuditLogChangeDto[] {
    const changes = log.changes ?? [];
    if (this.isChangesExpanded(log)) {
      return changes;
    }

    const previewCount =
      log.actionType === 'Update' ? this.updateChangesPreviewCount : this.defaultChangesPreviewCount;

    return changes.slice(0, previewCount);
  }

  getHiddenChangesCount(log: AuditLogListItemDto): number {
    return Math.max(0, (log.changes?.length ?? 0) - this.getVisibleChanges(log).length);
  }

  formatAuditValue(value: string | null | undefined): string {
    const normalizedValue = this.normalizeText(value);
    if (!normalizedValue) {
      return 'فارغ';
    }

    const normalizedKey = normalizedValue.toLowerCase().replace(/[\s_-]/g, '');
    if (VALUE_LABELS[normalizedKey]) {
      return VALUE_LABELS[normalizedKey];
    }

    if (ACTION_LABELS[normalizedValue]) {
      return ACTION_LABELS[normalizedValue];
    }

    if (ENTITY_LABELS[normalizedValue]) {
      return ENTITY_LABELS[normalizedValue];
    }

    if (PARTICIPANT_LABELS[normalizedValue]) {
      return PARTICIPANT_LABELS[normalizedValue];
    }

    if (this.looksLikeDate(normalizedValue)) {
      return this.formatCreatedAt(normalizedValue);
    }

    return normalizedValue;
  }

  formatChangeValue(change: AuditLogChangeDto, value: string | null | undefined): string {
    const normalizedValue = this.normalizeText(value);
    const resolvedReference = this.resolveReferenceByProperty(change.propertyName, normalizedValue);
    return resolvedReference || this.formatAuditValue(normalizedValue);
  }

  formatCreatedAt(value: string | Date | null | undefined): string {
    if (!value) {
      return 'غير محدد';
    }

    const parsedDate = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? 'غير محدد' : this.dateTimeFormatter.format(parsedDate);
  }

  private applyFilters(): void {
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadLogs();
  }

  private loadLogs(append = false): void {
    this.syncFilterWithForm();
    this.isLoading = !append;
    this.isLoadingMore = append;

    this.operationsLogService
      .getLogs(this.filter)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe({
        next: (response) => {
          if (!append) {
            this.expandedChangesLogIds.clear();
            this.expandedParticipantsLogIds.clear();
          }

          if (!response.isSuccess || !response.data) {
            if (!append) {
              this.logs = [];
            }
            this.totalCount = 0;
            return;
          }

          const items = Array.isArray(response.data.items) ? response.data.items : [];
          this.logs = append ? [...this.logs, ...items] : items;
          this.totalCount = response.data.totalCount ?? items.length;
        },
        error: () => {
          if (!append) {
            this.logs = [];
          }
          this.totalCount = 0;
          this.toast.error('تعذر تحميل سجل العمليات');
        }
      });
  }

  private loadFilterOptions(): void {
    this.operationsLogService.getFilterOptions().subscribe({
      next: (response) => {
        if (!response.isSuccess || !response.data) {
          return;
        }

        this.actionOptions = response.data.actionTypes?.length
          ? response.data.actionTypes.map((action) => ({
              ...action,
              label: this.getActionLabel(action.value)
            }))
          : [...DEFAULT_ACTION_OPTIONS];

        this.entityOptions = response.data.entityTypes?.length
          ? response.data.entityTypes.map((entity) => ({
              ...entity,
              label: this.getEntityLabel(entity.value)
            }))
          : [...DEFAULT_ENTITY_OPTIONS];
      }
    });
  }

  private loadLookupFilters(): void {
    this.isLoadingFilters = true;

    forkJoin({
      students: this.lookupService.getUsersForSelects(
        { lookupOnly: true },
        Number(UserTypesEnum.Student),
        0,
        0,
        0
      ),
      managers: this.lookupService.getUsersForSelects(
        { lookupOnly: true },
        Number(UserTypesEnum.Manager),
        0,
        0,
        0
      ),
      teachers: this.lookupService.getUsersForSelects(
        { lookupOnly: true },
        Number(UserTypesEnum.Teacher),
        0,
        0,
        0
      ),
      subscribes: this.subscribeService.getAll({
        skipCount: 0,
        maxResultCount: 250,
        sortBy: 'Name',
        sortingDirection: 'ASC'
      }),
      subscribeTypes: this.subscribeService.getAllTypes({
        skipCount: 0,
        maxResultCount: 250,
        sortBy: 'Name',
        sortingDirection: 'ASC'
      })
    })
      .pipe(finalize(() => (this.isLoadingFilters = false)))
      .subscribe({
        next: ({ students, managers, teachers, subscribes, subscribeTypes }) => {
          this.students = this.mapUserOptions(students.data?.items);
          this.managers = this.mapUserOptions(managers.data?.items);
          this.teachers = this.mapUserOptions(teachers.data?.items);
          this.subscribes = this.mapSubscribeOptions(subscribes.data?.items);
          this.subscribeTypes = this.mapSubscribeTypeOptions(subscribeTypes.data?.items);
        },
        error: () => {
          this.toast.error('تعذر تحميل بيانات الفلاتر');
        }
      });
  }

  private mapUserOptions(users: LookUpUserDto[] | undefined): SelectOption[] {
    return (users ?? [])
      .map((user) => ({
        id: Number(user.id),
        name: this.normalizeText(user.fullName) || ''
      }))
      .filter((user) => Number.isFinite(user.id) && user.id > 0 && !!user.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  private mapSubscribeOptions(items: SubscribeDto[] | undefined): SelectOption[] {
    return (items ?? [])
      .map((item) => ({
        id: Number(item.id),
        name: this.normalizeText(item.name) || ''
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && !!item.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  private mapSubscribeTypeOptions(items: SubscribeTypeDto[] | undefined): SelectOption[] {
    return (items ?? [])
      .map((item) => ({
        id: Number(item.id),
        name: this.normalizeText(item.name) || ''
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0 && !!item.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  private syncFilterWithForm(): void {
    const formValue = this.filterForm.getRawValue();

    this.filter = {
      ...this.filter,
      skipCount: this.pageIndex * this.pageSize,
      maxResultCount: this.pageSize,
      searchTerm: this.normalizeText(formValue.searchTerm) || undefined,
      actionType: formValue.actionType,
      entityType: formValue.entityType,
      studentId: formValue.studentId,
      managerId: formValue.managerId,
      teacherId: formValue.teacherId,
      subscribeId: formValue.subscribeId,
      subscribeTypeId: formValue.subscribeTypeId,
      fromDate: formValue.fromDate,
      toDate: formValue.toDate
    };
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
    if (this.isLoading || this.isLoadingMore || !this.hasMoreResults()) {
      return;
    }

    this.pageIndex += 1;
    this.loadLogs(true);
  }

  private buildArabicSummary(log: AuditLogListItemDto): string {
    const actor = this.getActorDisplay(log);
    const entityLabel = this.getEntityLabel(log.entityType);
    const entityName = this.getEntityDisplayName(log);
    const entityDescriptor =
      entityName && entityName !== entityLabel
        ? `${entityLabel} ${entityName}`
        : log.entityId
          ? `${entityLabel} رقم ${log.entityId}`
          : entityLabel;

    switch (log.actionType) {
      case 'Create':
        return `${actor} أضاف ${entityDescriptor}`;
      case 'Update':
        return this.buildUpdateSummary(actor, entityDescriptor, log.changes ?? []);
      case 'Delete':
        return `${actor} حذف ${entityDescriptor}`;
      case 'Restore':
        return `${actor} استعاد ${entityDescriptor}`;
      default:
        return `${actor} نفّذ إجراءً على ${entityDescriptor}`;
    }
  }

  private buildUpdateSummary(
    actor: string,
    entityDescriptor: string,
    changes: AuditLogChangeDto[]
  ): string {
    if (!changes.length) {
      return `${actor} عدّل ${entityDescriptor}`;
    }

    const visibleChanges = changes.slice(0, 3).map((change) => this.buildChangeSnippet(change));
    const hiddenChangesCount = changes.length - visibleChanges.length;
    const changesSummary =
      hiddenChangesCount > 0
        ? `${visibleChanges.join('، ')}، و${hiddenChangesCount} تغييرات أخرى`
        : visibleChanges.join('، ');

    return `${actor} عدّل ${entityDescriptor}: ${changesSummary}`;
  }

  private buildChangeSnippet(change: AuditLogChangeDto): string {
    return `${this.getChangeLabel(change)} من ${this.formatChangeValue(change, change.oldValue)} إلى ${this.formatChangeValue(change, change.newValue)}`;
  }

  private resolveFieldLabel(value: string | null | undefined): string | null {
    const normalizedValue = this.normalizeText(value);
    if (!normalizedValue) {
      return null;
    }

    const candidates = [
      normalizedValue,
      normalizedValue.replace(/\s+/g, ''),
      normalizedValue.replace(/Id$/i, '')
    ];

    for (const candidate of candidates) {
      if (FIELD_LABELS[candidate]) {
        return FIELD_LABELS[candidate];
      }
    }

    return null;
  }

  private resolveSourceLabelFromRoute(route: string | null | undefined): string | null {
    const normalizedRoute = this.normalizeRoute(route)?.toLowerCase();
    if (!normalizedRoute) {
      return null;
    }

    return SOURCE_ROUTE_LABELS.find((item) => normalizedRoute.includes(item.route))?.label ?? null;
  }

  private resolveSourceLabel(value: string | null | undefined): string | null {
    const normalizedValue = this.normalizeText(value)?.toLowerCase();
    if (!normalizedValue) {
      return null;
    }

    return SOURCE_SCREEN_KEY_LABELS[normalizedValue] || null;
  }

  private normalizeRoute(value: string | null | undefined): string | null {
    const normalizedValue = this.normalizeText(value);
    return normalizedValue ? normalizedValue.split('?')[0] : null;
  }

  private looksLikeDate(value: string): boolean {
    if (!/[T:/-]/.test(value)) {
      return false;
    }

    return !Number.isNaN(new Date(value).getTime());
  }

  private containsArabic(value: string): boolean {
    return /[\u0600-\u06FF]/.test(value);
  }

  private resolveReferenceByProperty(propertyName: string | null | undefined, value: string | null): string | null {
    const referenceId = this.tryExtractId(value);
    if (!referenceId) {
      return null;
    }

    switch (propertyName) {
      case 'StudentId':
        return this.findOptionName(this.students, referenceId);
      case 'TeacherId':
        return this.findOptionName(this.teachers, referenceId) || this.getUserNameById(referenceId);
      case 'ManagerId':
        return this.findOptionName(this.managers, referenceId) || this.getUserNameById(referenceId);
      case 'StudentSubscribeId':
      case 'SubscribeId':
      case 'OldSubscribeId':
      case 'NewSubscribeId':
        return this.findOptionName(this.subscribes, referenceId);
      case 'SubscribeTypeId':
      case 'StudentSubscribeTypeId':
        return this.findOptionName(this.subscribeTypes, referenceId);
      case 'BranchId':
        return this.getBranchLabel(referenceId);
      case 'UserTypeId':
        return this.getActorRoleLabel(referenceId);
      default:
        return null;
    }
  }

  private getBranchLabel(branchId: number): string | null {
    switch (branchId) {
      case 1:
        return 'الرجال';
      case 2:
        return 'النساء';
      default:
        return null;
    }
  }

  private resolveReferencedName(
    referenceType: string | null | undefined,
    referenceId: number | null | undefined,
    fallbackDisplayName?: string | null
  ): string | null {
    if (fallbackDisplayName && !this.isIdentifierOnly(fallbackDisplayName)) {
      return fallbackDisplayName;
    }

    const resolvedId = referenceId || this.tryExtractId(fallbackDisplayName);
    if (!resolvedId) {
      return fallbackDisplayName || null;
    }

    switch (referenceType) {
      case 'User':
      case 'Student':
      case 'Teacher':
      case 'Manager':
      case 'Admin':
      case 'BranchLeader':
        return this.getUserNameById(resolvedId) || fallbackDisplayName || null;
      case 'Subscribe':
        return this.findOptionName(this.subscribes, resolvedId) || fallbackDisplayName || null;
      case 'SubscribeType':
        return this.findOptionName(this.subscribeTypes, resolvedId) || fallbackDisplayName || null;
      default:
        return fallbackDisplayName || null;
    }
  }

  private getUserNameById(userId: number): string | null {
    return (
      this.findOptionName(this.students, userId) ||
      this.findOptionName(this.managers, userId) ||
      this.findOptionName(this.teachers, userId)
    );
  }

  private findOptionName(options: SelectOption[], optionId: number): string | null {
    return options.find((option) => option.id === optionId)?.name || null;
  }

  private isIdentifierOnly(value: string): boolean {
    return /^#?\d+$/.test(value.trim());
  }

  private tryExtractId(value: string | null | undefined): number | null {
    const normalizedValue = this.normalizeText(value);
    if (!normalizedValue) {
      return null;
    }

    const parsedId = Number(normalizedValue.replace('#', ''));
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private normalizeText(value: string | null | undefined): string | null {
    const normalizedValue = `${value ?? ''}`.trim();
    return normalizedValue || null;
  }
}
