// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto,
} from 'src/app/@theme/services/lookup.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { TeacherDetailsComponent } from '../teacher-details/teacher-details.component';

@Component({
  selector: 'app-teacher-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule],
  templateUrl: './teacher-list.component.html',
  styleUrl: './teacher-list.component.scss'
})
export class TeacherListComponent implements OnInit, AfterViewInit {
  private lookupService = inject(LookupService);
  dialog = inject(MatDialog);

  // public props
  displayedColumns: string[] = ['fullName', 'email', 'mobile', 'nationality', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  // paginator
readonly paginator = viewChild.required(MatPaginator);  // if Angular ≥17


  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.filter.skipCount = 0;
    this.paginator()?.firstPage();
    this.loadTeachers();
  }

  ngOnInit() {
    this.loadTeachers();
  }

  private loadTeachers() {
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Teacher),
        0,
        0,
        0
      )
      .subscribe((res) => {
        if (res.isSuccess && res.data?.items) {
          this.dataSource.data = res.data.items;
          this.totalCount = res.data.totalCount;
        } else {
          this.dataSource.data = [];
          this.totalCount = 0;
        }
      });
  }

  teacherDetails(teacher: LookUpUserDto): void {
    this.dialog.open(TeacherDetailsComponent, {
      width: '800px',
      data: teacher
    });
  }

  // life cycle event
  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.loadTeachers();
    });
  }
}
