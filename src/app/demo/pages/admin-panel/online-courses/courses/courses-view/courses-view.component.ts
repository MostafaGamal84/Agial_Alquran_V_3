// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
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

interface CircleScheduleEntry {
  day: string;
  time: string;
}

type CircleViewModel = CircleDto & {
  scheduleEntries: CircleScheduleEntry[];
  managerLabels: string[];
  studentLabels: string[];
};

@Component({
  selector: 'app-courses-view',
  imports: [SharedModule, RouterModule],
  templateUrl: './courses-view.component.html',
  styleUrl: './courses-view.component.scss'
})
export class CoursesViewComponent implements OnInit, AfterViewInit {
  private circleService = inject(CircleService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);


  displayedColumns: string[] = ['name', 'teacher', 'schedule', 'managers', 'students', 'action'];
  dataSource = new MatTableDataSource<CircleViewModel>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  readonly paginator = viewChild.required(MatPaginator);
  isTeacherOrStudent = [UserTypesEnum.Teacher, UserTypesEnum.Student].includes(this.auth.getRole()!);
  ngOnInit() {
    this.loadCircles();
  }

  private loadCircles() {
    this.circleService.getAll(this.filter).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        const sourceCircles = res.data.items;
        const viewModels = sourceCircles.map((circle) => this.buildViewModel(circle));
        this.dataSource.data = viewModels;
        this.totalCount = res.data.totalCount;
      } else {
        this.dataSource.data = [];
        this.totalCount = 0;
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
    this.filter.skipCount = 0;
    this.paginator()?.firstPage();
    this.loadCircles();
  }

  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.loadCircles();
    });
  }

  deleteCircle(id: number) {
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.circleService.delete(id).subscribe({
          next: () => {
            this.toast.success('Course deleted successfully');
            this.loadCircles();
          },
          error: () => this.toast.error('Error deleting course')
        });
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

  displayManagers(
    managers?: (CircleManagerDto | string | number | null | undefined)[] | null
  ): string {
    return this.extractManagerLabels(managers).join(', ');
  }

  displayStudents(students?: (CircleStudentDto | null | undefined)[] | null): string {
    return this.extractStudentLabels(students).join(', ');
  }

  trackBySchedule(_index: number, schedule: CircleScheduleEntry): string {
    return `${schedule.day ?? ''}-${schedule.time ?? ''}`;
  }

  trackByLabel(_index: number, label: string): string {
    return label;
  }

}

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">Delete course</div>
    <div class="p-10">Are you sure you want to delete this course?</div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>No</button>
      <button mat-button color="warn" [mat-dialog-close]="true">Yes</button>
    </div>
  `,
  imports: [MatDialogActions, MatButton, MatDialogClose]
})
export class DeleteConfirmDialogComponent {}

