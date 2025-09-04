import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { CircleDto, CircleService, CircleStudentDto } from 'src/app/@theme/services/circle.service';

@Component({
  selector: 'app-courses-details',
  imports: [SharedModule, RouterModule],
  templateUrl: './courses-details.component.html',
  styleUrl: './courses-details.component.scss'
})
export class CoursesDetailsComponent implements OnInit {
  private circleService = inject(CircleService);
  private route = inject(ActivatedRoute);

  course?: CircleDto;
  displayedColumns: string[] = ['fullName', 'action'];
  dataSource = new MatTableDataSource<CircleStudentDto>();

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.circleService.get(id).subscribe((res) => {
        if (res.isSuccess && res.data) {
          this.course = res.data;
          this.dataSource.data = res.data.students || [];
        }
      });
    }
  }
}
