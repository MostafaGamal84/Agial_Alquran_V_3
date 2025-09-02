// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LookupService, LookUpUserDto } from 'src/app/@theme/services/lookup.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-manager-list',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './manager-list.component.html',
  styleUrl: './manager-list.component.scss'
})
export class ManagerListComponent implements OnInit, AfterViewInit {
  private lookupService = inject(LookupService);

  // public props
  displayedColumns: string[] = ['fullName', 'email', 'mobile', 'nationality', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();

  // paginator
  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  ngOnInit() {
    const filter = { skipCount: 0, maxResultCount: 25 };
    this.lookupService.getUsersByUserType(filter, Number(UserTypesEnum.Manager)).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        this.dataSource.data = res.data.items;
      } else {
        this.dataSource.data = [];
      }
    });
  }

  // life cycle event
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator()!;
    this.dataSource.sort = this.sort()!;
  }
}
