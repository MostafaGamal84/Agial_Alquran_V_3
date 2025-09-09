import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { StudentSubscribeService, ViewStudentSubscribeReDto } from 'src/app/@theme/services/student-subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';

@Component({
  selector: 'app-membership-view',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './membership-view.component.html',
  styleUrl: './membership-view.component.scss'
})
export class MembershipViewComponent implements OnInit, AfterViewInit {
  private service = inject(StudentSubscribeService);
  private route = inject(ActivatedRoute);

  displayedColumns: string[] = ['plan', 'remainingMinutes', 'startDate', 'status'];
  dataSource = new MatTableDataSource<ViewStudentSubscribeReDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  studentId = 0;

  readonly paginator = viewChild.required(MatPaginator);

  ngOnInit() {
    this.studentId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  private load() {
    this.service.getStudents(this.filter, this.studentId).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        this.dataSource.data = res.data.items;
        this.totalCount = res.data.totalCount;
      } else {
        this.dataSource.data = [];
        this.totalCount = 0;
      }
    });
  }

  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.load();
    });
  }
}

