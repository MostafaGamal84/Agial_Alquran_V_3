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

interface StudentApiItem {
  id: number;
  studentId: number;
  studentName?: string | null;
  studentMobile?: string | null;
  payStatus?: boolean | null;
  plan?: string | null;
  remainingMinutes?: number | null;
  startDate?: string | null;
}

interface StudentApiResponse {
  isSuccess: boolean;
  errors: { fieldName: string; code: string; message: string; fieldLang: string }[];
  data: {
    items: StudentApiItem[];
    totalCount: number;
  };
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
      .get<StudentApiResponse>('https://localhost:7260/api/StudentSubscrib/GetStudents')
      .subscribe((res) => {
        const items = res?.data?.items ?? [];
        const data = items.map((item) => this.mapStudent(item));
        this.dataSource.data = data;
      });
  }

  private mapStudent(item: StudentApiItem): membershipList {
    const payStatus = item?.payStatus;
    const start = item?.startDate ? new Date(item.startDate) : null;
    return {
      name: this.normalize(item?.studentName),
      src: 'assets/images/user/avatar-1.png',
      mobile: this.normalize(item?.studentMobile),
      date: start ? start.toLocaleDateString() : 'there is no',
      time: start ? start.toLocaleTimeString() : 'there is no',
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
