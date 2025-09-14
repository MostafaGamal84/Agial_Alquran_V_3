// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import { UserService } from 'src/app/@theme/services/user.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-student-apply',
  imports: [SharedModule, CommonModule],
  templateUrl: './student-apply.component.html',
  styleUrl: './student-apply.component.scss'
})
export class StudentApplyComponent implements OnInit, AfterViewInit {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);

  // public props
  displayedColumns: string[] = ['fullName', 'email', 'mobile', 'nationality', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = {
    skipCount: 0,
    maxResultCount: 10,
    filter: 'inactive=true'
  };

  // paginator
  readonly paginator = viewChild.required(MatPaginator); // if Angular ≥17

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.filter.skipCount = 0;
    this.paginator().firstPage();
    this.loadStudents();
  }

  ngOnInit() {
    this.loadStudents();
  }

  private loadStudents() {
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Student),
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

  changeStatus(student: LookUpUserDto, status: boolean): void {
    this.userService.disableUser(student.id, status).subscribe((res) => {
      if (res.isSuccess) {
        this.dataSource.data = this.dataSource.data.filter((s) => s.id !== student.id);
        this.totalCount--;
      }
    });
  }

  // life cycle event
  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.loadStudents();
    });
  }
}
