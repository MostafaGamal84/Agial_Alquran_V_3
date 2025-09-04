import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { CircleDto, CircleStudentDto } from 'src/app/@theme/services/circle.service';


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
}
