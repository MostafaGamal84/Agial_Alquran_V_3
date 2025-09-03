// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { RouterModule, Router } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleService,
  CircleDto
} from 'src/app/@theme/services/circle.service';
import {
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';

@Component({
  selector: 'app-courses-view',
  imports: [SharedModule, RouterModule],
  templateUrl: './courses-view.component.html',
  styleUrl: './courses-view.component.scss'
})
export class CoursesViewComponent implements OnInit, AfterViewInit {
  private circleService = inject(CircleService);
  private router = inject(Router);

  displayedColumns: string[] = ['name', 'teacher', 'action'];
  dataSource = new MatTableDataSource<CircleDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  readonly paginator = viewChild.required(MatPaginator);

  ngOnInit() {
    this.loadCircles();
  }

  private loadCircles() {
    this.circleService.getAll(this.filter).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        this.dataSource.data = res.data.items;
        this.totalCount = res.data.totalCount;
      } else {
        this.dataSource.data = [];
        this.totalCount = 0;
      }
    });
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

  editCircle(id: number) {
    this.router.navigate(['/online-course/courses/edit', id]);
  }

  deleteCircle(id: number) {
    this.circleService.delete(id).subscribe(() => this.loadCircles());
  }
}

