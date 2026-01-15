import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleDayDto,
  CircleDto,
  CircleManagerDto,
  CircleStudentDto
} from 'src/app/@theme/services/circle.service';
import { formatDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue } from 'src/app/@theme/utils/time';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';



@Component({
  selector: 'app-courses-details',
  imports: [SharedModule, RouterModule],
  templateUrl: './courses-details.component.html',
  styleUrl: './courses-details.component.scss'
})
export class CoursesDetailsComponent implements OnInit {

  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  course?: CircleDto;
  students: CircleStudentDto[] = [];
  displayedColumns = ['fullName', 'action'];
  dataSource = new MatTableDataSource<CircleStudentDto>();
  ngOnInit() {
    const course = history.state.course as CircleDto | undefined;
    if (course) {
      this.applyCourse(course);
      return;
    }

    this.toast.error('تفاصيل الحلقة are unavailable. Please select a course from the list.');
    this.navigateToCoursesList();
  }

  private applyCourse(course: CircleDto): void {
    this.course = course;
    this.students = course.students || [];
    this.dataSource.data = this.students;
  }

  private navigateToCoursesList(): void {
    this.router.navigate(['/online-course/courses/view']).catch(() => undefined);
  }

  getStudentName(student: CircleStudentDto | null | undefined): string {
    if (!student) {
      return 'Unknown student';
    }

    return (
      student.student?.fullName ||
      student.fullName ||
      `Student #${student.studentId ?? student.id ?? '—'}`
    );
  }

  getStudentIdentifier(student: CircleStudentDto | null | undefined): string | undefined {
    if (!student) {
      return undefined;
    }

    if (student.student?.email) {
      return student.student.email;
    }

   
    if (student.studentId || student.id) {
      return `ID: ${student.studentId ?? student.id}`;
    }

    return undefined;
  }

  getStudentInitials(student: CircleStudentDto | null | undefined): string {
    const name = this.getStudentName(student);
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'S';
  }

  getManagers(circle?: CircleDto): string[] {
    if (!circle || !Array.isArray(circle.managers)) {
      return [];
    }
      console.log(circle.managers);

    return circle.managers
      .map((manager) => this.resolveManagerName(manager))
      .filter((name): name is string => Boolean());
       
  }

  private resolveManagerName(
    manager: CircleManagerDto | number | string | null | undefined
  ): string | undefined {
    if (manager === null || manager === undefined) {
      return undefined;
    }

    if (typeof manager === 'string' || typeof manager === 'number') {
      return String(manager);
    }

    if (manager.manager) {
      const nestedManager = manager.manager as { fullName?: string; name?: string };
      if (nestedManager.fullName) {
        return nestedManager.fullName;
      }

      if (nestedManager.name) {
        return nestedManager.name;
      }
    }

    if (manager.managerName) {
      return manager.managerName;
    }

    if (manager.managerId !== undefined && manager.managerId !== null) {
      return String(manager.managerId);
    }

    return undefined;
  }

  getSchedule(circle?: CircleDto): CircleDayDto[] {
    if (!circle || !Array.isArray(circle.days)) {
      return [];
    }

    return circle.days.filter((day): day is CircleDayDto => Boolean(day));
  }

  getScheduleDayLabel(day?: CircleDayDto): string {
    if (!day) {
      return '';
    }

    if (day.dayName) {
      return day.dayName;
    }

    return formatDayValue(day.dayId);
  }

  getScheduleTimeLabel(day?: CircleDayDto): string {
    if (!day) {
      return '';
    }

    return formatTimeValue(day.time);
  }

  getDayLabel(circle?: CircleDto): string {
    if (!circle) {
      return '';
    }

    const primaryDay = this.resolvePrimaryDay(circle);
    if (primaryDay) {
      if (primaryDay.dayName) {
        return primaryDay.dayName;
      }

      if (primaryDay.dayId !== undefined && primaryDay.dayId !== null) {
        return formatDayValue(primaryDay.dayId);
      }
    }

    if (circle.dayNames?.length) {
      const candidate = circle.dayNames[0];
      if (candidate) {
        return candidate;
      }
    }

    if (circle.dayName) {
      return circle.dayName;
    }

    return formatDayValue(circle.dayId ?? circle.day);
  }

  getBranchLabel(branchId: number | null | undefined): string {
    if (branchId === BranchesEnum.Mens) {
      return 'الرجال';
    }

    if (branchId === BranchesEnum.Women) {
      return 'النساء';
    }

    return '';
  }

  getFormattedStartTime(circle?: CircleDto): string {
    if (!circle) {
      return '';
    }

    const primaryDay = this.resolvePrimaryDay(circle);
    const timeSource = primaryDay?.time ?? circle.startTime ?? circle.time;

    return formatTimeValue(timeSource);
  }

  private resolvePrimaryDay(circle?: CircleDto | null): CircleDayDto | undefined {
    if (!circle || !Array.isArray(circle.days)) {
      return undefined;
    }

    return circle.days.find((day): day is CircleDayDto => Boolean(day)) ?? undefined;
  }
}
