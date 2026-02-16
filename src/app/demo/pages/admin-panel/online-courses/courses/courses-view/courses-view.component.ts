// angular import
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { finalize } from 'rxjs/operators';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';


// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleService,
  CircleDayDto,
  CircleDto,
  CircleManagerDto,
  CircleStudentDto
} from 'src/app/@theme/services/circle.service';
import {
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { DayValue, formatDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue } from 'src/app/@theme/utils/time';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

interface CircleScheduleEntry {
  day: string;
  time: string;
}

type CircleViewModel = CircleDto & {
  scheduleEntries: CircleScheduleEntry[];
  managerLabels: string[];
  studentLabels: string[];
};

interface CourseParticipantsDialogData {
  name?: string | null;
  managers: string[];
  students: string[];
  showManagers: boolean;
  showStudents: boolean;
}

interface CourseParticipantsDialogOptions {
  showManagers?: boolean;
  showStudents?: boolean;
}

@Component({
  selector: 'app-courses-view',
  imports: [SharedModule, RouterModule, LoadingOverlayComponent],
  templateUrl: './courses-view.component.html',
  styleUrl: './courses-view.component.scss'
})
export class CoursesViewComponent implements OnInit, OnDestroy {
  private circleService = inject(CircleService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);


  displayedColumns: string[] = [
    'index',
    'name',
    'branch',
    'teacher',
    'schedule',
    'managers',
    'students',
    'action'
  ];
  dataSource = new MatTableDataSource<CircleViewModel>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  isLoading = false;
  isLoadingMore = false;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

  isTeacherOrStudent = [UserTypesEnum.Teacher, UserTypesEnum.Student].includes(this.auth.getRole()!);
  ngOnInit() {
    this.loadCircles();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadCircles(append = false) {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.circleService
      .getAll(this.filter)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            const sourceCircles = res.data.items;
            const viewModels = sourceCircles.map((circle) => this.buildViewModel(circle));
            this.dataSource.data = append
              ? [...this.dataSource.data, ...viewModels]
              : viewModels;
            this.totalCount = res.data.totalCount;
          } else {
            if (!append) {
              this.dataSource.data = [];
            }
            this.totalCount = 0;
          }
        },
        error: () => {
          if (!append) {
            this.dataSource.data = [];
          }
          this.totalCount = 0;
          this.toast.error('Error loading courses');
        }
      });
  }

  private buildViewModel(circle: CircleDto): CircleViewModel {
    return {
      ...circle,
      scheduleEntries: this.buildScheduleEntries(circle),
      managerLabels: this.buildManagerLabels(circle.managers),
      studentLabels: this.buildStudentLabels(circle.students)
    };
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadCircles();
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
    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;
    this.loadCircles(true);
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }

  deleteCircle(id: number) {
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.circleService.delete(id).subscribe({
          next: () => {
            this.toast.success('تم الحذف بنجاح');
            this.loadCircles();
          },
          error: () => this.toast.error('خطأ . حاول مرة أخرى.')
        });
      }
    });
  }

  openParticipantsDialog(
    course: CircleViewModel,
    { showManagers = true, showStudents = true }: CourseParticipantsDialogOptions = {}
  ): void {
    if (!showManagers && !showStudents) {
      return;
    }


    this.dialog.open(CourseParticipantsDialogComponent, {
      width: '480px',
      data: {
        name: course.name,
        managers: showManagers ? course.managerLabels ?? [] : [],
        students: showStudents ? course.studentLabels ?? [] : [],
        showManagers,
        showStudents
      }
    });
  }

  private buildScheduleEntries(circle?: CircleDto | null): CircleScheduleEntry[] {
    if (!circle) {
      return [];
    }

    const schedule: CircleScheduleEntry[] = [];

    if (Array.isArray(circle.days)) {
      circle.days.forEach((day) => {
        if (!day) {
          return;
        }

        const dayLabel = this.resolveDayLabel(day);
        const timeLabel = formatTimeValue(day.time);

        if (dayLabel || timeLabel) {
          schedule.push({ day: dayLabel, time: timeLabel });
        }
      });
    }

    if (!schedule.length) {
      const fallbackDay = this.resolveFallbackDay(circle);
      const fallbackTime = formatTimeValue(circle.startTime ?? circle.time);

      if (fallbackDay || fallbackTime) {
        schedule.push({ day: fallbackDay, time: fallbackTime });
      }
    }

    return schedule;
  }

  private resolveDayLabel(day: CircleDayDto): string {
    if (typeof day.dayName === 'string' && day.dayName.trim()) {
      return day.dayName.trim();
    }

    return formatDayValue(day.dayId);
  }

  private resolveFallbackDay(circle: CircleDto): string {
    const dayCandidates: DayValue[] = [
      circle.dayName ?? undefined,
      circle.dayNames?.[0] ?? undefined,
      circle.dayId ?? undefined,
      circle.dayIds?.[0] ?? undefined,
      circle.day ?? undefined
    ];

    for (const candidate of dayCandidates) {
      const label = formatDayValue(candidate);
      if (label) {
        return label;
      }
    }

    return '';
  }

  private buildManagerLabels(
    managers?: (CircleManagerDto | string | number | null | undefined)[] | null
  ): string[] {
    return this.extractManagerLabels(managers);
  }

  private buildStudentLabels(students?: (CircleStudentDto | null | undefined)[] | null): string[] {
    return this.extractStudentLabels(students);
  }

  formatSchedule(schedule: CircleScheduleEntry): string {
    const day = schedule.day?.trim();
    const time = schedule.time?.trim();

    if (day && time) {
      return `${day} • ${time}`;
    }

    return day || time || '-';
  }

  getBranchLabel(branchId: number | null | undefined): string {
    if (branchId === BranchesEnum.Mens) {
      return 'الرجال';
    }

    if (branchId === BranchesEnum.Women) {
      return 'النساء';
    }

    return '-';
  }

  private extractManagerLabels(
    managers?: (CircleManagerDto | string | number | null | undefined)[] | null
  ): string[] {
    if (!Array.isArray(managers)) {
      return [];
    }

    const labels = managers
      .map((manager) => {
        if (manager === null || manager === undefined) {
          return '';
        }

        if (typeof manager === 'string' || typeof manager === 'number') {
          return String(manager).trim();
        }

        const value = manager.manager;

        if (typeof value === 'string') {
          return value.trim();
        }

        if (value && typeof value === 'object') {
          const lookUp = value as { fullName?: string | null; name?: string | null };
          if (lookUp.fullName && lookUp.fullName.trim()) {
            return lookUp.fullName.trim();
          }

          if (lookUp.name && lookUp.name.trim()) {
            return lookUp.name.trim();
          }
        }

        if (manager.managerName && manager.managerName.trim()) {
          return manager.managerName.trim();
        }

        if (manager.managerId !== undefined && manager.managerId !== null) {
          return `#${manager.managerId}`;
        }

        return '';
      })
      .filter((label) => !!label) as string[];

    return Array.from(new Set(labels));
  }

  private extractStudentLabels(students?: (CircleStudentDto | null | undefined)[] | null): string[] {
    if (!Array.isArray(students)) {
      return [];
    }

    const labels = students
      .map((student) => {
        if (!student) {
          return '';
        }

        if (student.fullName && student.fullName.trim()) {
          return student.fullName.trim();
        }

        if (student.student) {
          const lookUp = student.student as { fullName?: string | null; name?: string | null };
          if (lookUp.fullName && lookUp.fullName.trim()) {
            return lookUp.fullName.trim();
          }

          if (lookUp.name && lookUp.name.trim()) {
            return lookUp.name.trim();
          }
        }

        if (student.studentId !== undefined && student.studentId !== null) {
          return `#${student.studentId}`;
        }

        if (student.id !== undefined && student.id !== null) {
          return `#${student.id}`;
        }

        return '';
      })
      .filter((label) => !!label) as string[];

    return Array.from(new Set(labels));
  }

  trackBySchedule(_index: number, schedule: CircleScheduleEntry): string {
    return `${schedule.day ?? ''}-${schedule.time ?? ''}`;
  }

  trackByLabel(_index: number, label: string): string {
    return label;
  }

  hasMissingAssignments(circle: CircleViewModel): boolean {
    const teacherLabel = circle.teacher?.fullName ?? circle.teacherName ?? circle.teacherId;
    const hasTeacher = typeof teacherLabel === 'number' || !!String(teacherLabel ?? '').trim();
    const hasManagers =
      (circle.managerLabels?.length ?? 0) > 0 || (circle.managers?.length ?? 0) > 0;
    const hasStudents =
      (circle.studentLabels?.length ?? 0) > 0 || (circle.students?.length ?? 0) > 0;

    return !(hasTeacher && hasManagers && hasStudents);
  }

}

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">Delete course</div>
    <div class="p-10">هل انت متاكد من الحذف؟</div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>لا</button>
      <button mat-button color="warn" [mat-dialog-close]="true">نعم</button>
    </div>
  `,
  styles: [
    `
      :host {
        color: var(--accent-900);
      }

      :host-context(.dark) {
        color: rgba(255, 255, 255, 0.87);
      }
    `
  ],
  imports: [MatDialogActions, MatButton, MatDialogClose]
})
export class DeleteConfirmDialogComponent {}

@Component({
  selector: 'app-course-participants-dialog',
  template: `
    <div mat-dialog-title>{{ dialogTitle }}</div>
    <div mat-dialog-content class="participants-dialog">
      <section class="participants-section" *ngIf="data.showManagers">
        <h3>المشرف</h3>
        <ng-container *ngIf="data.managers.length; else noManagers">
          <ul>
            <li *ngFor="let manager of data.managers">{{ manager }}</li>
          </ul>
        </ng-container>
        <ng-template #noManagers>
          <p class="empty-state">لا يوجد مشرفين</p>
        </ng-template>
      </section>
      <section class="participants-section" *ngIf="data.showStudents">
        <h3>الطلاب</h3>
        <ng-container *ngIf="data.students.length; else noStudents">
          <ul>
            <li *ngFor="let student of data.students">{{ student }}</li>
          </ul>
        </ng-container>
        <ng-template #noStudents>
          <p class="empty-state">لا يوجد طلاب بعد</p>
        </ng-template>
      </section>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>اغلاق</button>
    </div>
  `,
  styles: [
    `
      .participants-dialog {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-height: 60vh;
        overflow: auto;
      }

      .participants-section h3 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
        font-weight: 600;
      }

      .participants-section ul {
        margin: 0;
        padding-left: 1.25rem;
      }

      .participants-section li {
        margin-bottom: 0.35rem;
      }

      .empty-state {
        margin: 0;
        color: rgba(0, 0, 0, 0.54);
        font-style: italic;
      }
    `
  ],
  imports: [MatDialogTitle, MatDialogContent, NgIf, NgFor, MatDialogActions, MatButton, MatDialogClose]
})
export class CourseParticipantsDialogComponent {
  readonly data = inject<CourseParticipantsDialogData>(MAT_DIALOG_DATA);

  get dialogTitle(): string {
    const courseName = this.data.name?.trim() || 'حلقة';

    if (this.data.showManagers && !this.data.showStudents) {
      return `${courseName} `;
    }

    if (this.data.showStudents && !this.data.showManagers) {
      return `${courseName} `;
    }

    return `${courseName} `;
  }
}
