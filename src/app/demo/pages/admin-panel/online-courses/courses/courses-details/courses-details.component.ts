import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleDayDto,
  CircleDto,
  CircleStudentDto
} from 'src/app/@theme/services/circle.service';
import { formatDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue } from 'src/app/@theme/utils/time';



@Component({
  selector: 'app-courses-details',
  imports: [SharedModule, RouterModule],
  templateUrl: './courses-details.component.html',
  styleUrl: './courses-details.component.scss'
})
export class CoursesDetailsComponent implements OnInit {

  course?: CircleDto;
  displayedColumns: string[] = ['fullName', 'action'];
  dataSource = new MatTableDataSource<CircleStudentDto>();
  ngOnInit() {
    const course = history.state.course as CircleDto | undefined;
    if (course) {
      this.course = course;
      this.dataSource.data = course.students || [];

    }
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
