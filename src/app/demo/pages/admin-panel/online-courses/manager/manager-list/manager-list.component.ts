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
import { ManagerDetailsComponent } from '../manager-details/manager-details.component';

@Component({
  selector: 'app-manager-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule],
  templateUrl: './manager-list.component.html',
  styleUrl: './manager-list.component.scss'
})
export class ManagerListComponent implements OnInit, AfterViewInit {
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
    this.loadManagers();
  }

  ngOnInit() {
    this.loadManagers();
  }

  private loadManagers() {
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Manager),
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

  managerDetails(manager: LookUpUserDto): void {
    this.dialog.open(ManagerDetailsComponent, {
      width: '800px',
      data: manager
    });
  }

  // life cycle event
  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.loadManagers();
    });
  }
}
