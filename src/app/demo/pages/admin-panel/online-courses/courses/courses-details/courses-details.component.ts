import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { CircleDto, CircleStudentDto } from 'src/app/@theme/services/circle.service';
import { DAY_LABELS, DaysEnum } from 'src/app/@theme/types/DaysEnum';
import { minutesToTimeString } from 'src/app/@theme/utils/time';


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
  private readonly dayLabelMap = DAY_LABELS;

  ngOnInit() {
    const course = history.state.course as CircleDto | undefined;
    if (course) {
      this.course = course;
      this.dataSource.data = course.students || [];

    }
  }

  getDayLabel(day?: DaysEnum | number | null | string): string {
    if (day === null || day === undefined) {
      return '';
    }
    if (typeof day === 'string') {
      return day;
    }
    return this.dayLabelMap.get(day as DaysEnum) ?? '';
  }

  getFormattedTime(time?: number | string | null): string {
    if (time === null || time === undefined) {
      return '';
    }
    if (typeof time === 'string') {
      return time;
    }
    return minutesToTimeString(time);
  }
}
