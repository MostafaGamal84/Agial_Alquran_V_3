import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleDayDto,
  CircleDto,
  CircleManagerDto,
  CircleStudentDto,
  CircleService
} from 'src/app/@theme/services/circle.service';
import { formatDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue } from 'src/app/@theme/utils/time';
import { ToastService } from 'src/app/@theme/services/toast.service';



@Component({
  selector: 'app-courses-details',
  imports: [SharedModule, RouterModule],
  templateUrl: './courses-details.component.html',
  styleUrl: './courses-details.component.scss'
})
export class CoursesDetailsComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly circleService = inject(CircleService);
  private readonly toast = inject(ToastService);

  course?: CircleDto;
  displayedColumns: string[] = ['fullName', 'action'];
  dataSource = new MatTableDataSource<CircleStudentDto>();
  ngOnInit() {
    const course = history.state.course as CircleDto | undefined;
    if (course) {
      this.applyCourse(course);
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    const circleId = idParam ? Number(idParam) : undefined;

    if (circleId !== undefined && !Number.isNaN(circleId)) {
      this.loadCourse(circleId);
    }
  }

  private loadCourse(id: number): void {
    this.circleService.get(id).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.applyCourse(response.data);
        } else {
          this.toast.error('Unable to load course details');
        }
      },
      error: () => this.toast.error('Unable to load course details')
    });
  }

  private applyCourse(course: CircleDto): void {
    this.course = course;
    this.dataSource.data = course.students || [];
  }

  getManagers(circle?: CircleDto): string[] {
    if (!circle || !Array.isArray(circle.managers)) {
      return [];
    }

    return circle.managers
      .map((manager) => this.resolveManagerName(manager))
      .filter((name): name is string => Boolean(name));
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
