// angular import
import { AfterViewInit, Component, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { managerApply } from 'src/app/fake-data/manager_apply';

export interface managerApply {
  name: string;
  img: string;
  department: string;
  qualification: string;
  mobile: string;
  date: string;
  time: string;
}

const ELEMENT_DATA: managerApply[] = managerApply;

@Component({
  selector: 'app-manager-apply',
  imports: [SharedModule, CommonModule],
  templateUrl: './manager-apply.component.html',
  styleUrl: './manager-apply.component.scss'
})
export class ManagerApplyComponent implements AfterViewInit {
  // public props
  displayedColumns: string[] = ['name', 'department', 'qualification', 'mobile', 'date', 'action'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);

  // paginator
readonly paginator = viewChild.required(MatPaginator);  // if Angular ≥17

  readonly sort = viewChild(MatSort);

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // life cycle event
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator()!;
    this.dataSource.sort = this.sort()!;
  }
}
