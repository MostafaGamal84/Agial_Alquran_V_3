// angular import
import { AfterViewInit, Component, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { PaginatorState } from 'primeng/paginator';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { teacherApply } from 'src/app/fake-data/teacher_apply';

export interface teacherApply {
  name: string;
  img: string;
  department: string;
  qualification: string;
  mobile: string;
  date: string;
  time: string;
}

const ELEMENT_DATA: teacherApply[] = teacherApply;

@Component({
  selector: 'app-teacher-apply',
  imports: [SharedModule, CommonModule],
  templateUrl: './teacher-apply.component.html',
  styleUrl: './teacher-apply.component.scss'
})
export class TeacherApplyComponent implements OnInit, AfterViewInit {
  // public props
  displayedColumns: string[] = ['name', 'department', 'qualification', 'mobile', 'date', 'action'];
  dataSource = new MatTableDataSource<teacherApply>([]);
  totalCount = ELEMENT_DATA.length;
  pageIndex = 0;
  pageSize = 10;
  private allRows = [...ELEMENT_DATA];
  private filteredRows = [...ELEMENT_DATA];
  readonly sort = viewChild(MatSort);

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    const normalized = filterValue.trim().toLowerCase();
    this.filteredRows = this.allRows.filter((row) =>
      Object.values(row).some((value) =>
        value?.toString().toLowerCase().includes(normalized)
      )
    );
    this.pageIndex = 0;
    this.updatePagedRows();
  }

  ngOnInit() {
    this.updatePagedRows();
  }

  // life cycle event
  ngAfterViewInit() {
    this.dataSource.sort = this.sort()!;
  }

  onPageChange(event: PaginatorState): void {
    this.pageIndex = event.page ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
    this.updatePagedRows();
  }

  private updatePagedRows(): void {
    this.totalCount = this.filteredRows.length;
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.filteredRows.slice(start, end);
  }
}
