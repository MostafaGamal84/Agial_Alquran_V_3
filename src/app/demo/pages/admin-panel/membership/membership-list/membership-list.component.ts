// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';

export interface membershipList {
  name: string;
  src: string;
  mobile: string;
  date: string;
  time: string;
  status: string;
  plan: string;
}

interface StudentApi {
  name?: string | null;
  src?: string | null;
  mobile?: string | null;
  date?: string | null;
  time?: string | null;
  plan?: string | null;
  payStatue?: boolean | null;
}

@Component({
  selector: 'app-membership-list',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './membership-list.component.html',
  styleUrl: './membership-list.component.scss'
})
export class MembershipListComponent implements AfterViewInit, OnInit {
  // public props
  displayedColumns: string[] = ['name', 'mobile', 'date', 'status', 'plan', 'action'];
  dataSource = new MatTableDataSource<membershipList>([]);

  private http = inject(HttpClient);

  // paginator
  readonly paginator = viewChild.required(MatPaginator); // if Angular ≥17

  readonly sort = viewChild(MatSort);

  ngOnInit() {
    this.http
      .get<StudentApi[]>('https://localhost:7260/api/StudentSubscrib/GetStudents')
      .subscribe((res) => {
        const data = res.map((item) => this.mapStudent(item));
        this.dataSource.data = data;
      });
  }

  private mapStudent(item: StudentApi): membershipList {
    const payStatus = item?.payStatue;
    return {
      name: this.normalize(item?.name),
      src: item?.src ?? 'assets/images/user/avatar-1.png',
      mobile: this.normalize(item?.mobile),
      date: this.normalize(item?.date),
      time: this.normalize(item?.time),
      status:
        payStatus === true
          ? 'payed'
          : payStatus === false
            ? 'not payed'
            : 'there is no',
      plan: this.normalize(item?.plan)
    };
  }

  private normalize(value: string | null | undefined): string {
    return value === null || value === undefined || value === '' ? 'there is no' : value;
  }

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
