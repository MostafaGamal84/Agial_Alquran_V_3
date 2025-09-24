// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleService,
  CircleDayDto,
  CircleDto,
  CircleManagerDto
} from 'src/app/@theme/services/circle.service';
import {
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { formatDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue } from 'src/app/@theme/utils/time';


@Component({
  selector: 'app-courses-view',
  imports: [SharedModule, RouterModule],
  templateUrl: './courses-view.component.html',
  styleUrl: './courses-view.component.scss'
})
export class CoursesViewComponent implements OnInit, AfterViewInit {
  private circleService = inject(CircleService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);


  displayedColumns: string[] = ['name', 'teacher', 'day', 'time', 'managers', 'action'];
  dataSource = new MatTableDataSource<CircleDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };

  readonly paginator = viewChild.required(MatPaginator);
  isTeacherOrStudent = [UserTypesEnum.Teacher, UserTypesEnum.Student].includes(this.auth.getRole()!);
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

  deleteCircle(id: number) {
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.circleService.delete(id).subscribe({
          next: () => {
            this.toast.success('Course deleted successfully');
            this.loadCircles();
          },
          error: () => this.toast.error('Error deleting course')
        });
      }
    });
  }

  displayManagers(
    managers?: (CircleManagerDto | number | string | null | undefined)[]
  ): string {
    if (!managers || !managers.length) {
      return '';
    }

    const names = managers
      .map((m) => {
        if (m === null || m === undefined) {
          return '';
        }

        if (typeof m === 'number' || typeof m === 'string') {
          return String(m);
        }

        const manager = m.manager;

        if (typeof manager === 'string') {
          return manager;
        }

        if (manager && typeof manager === 'object') {
          const lookUp = manager as { fullName?: string; name?: string };
          if (lookUp.fullName) {
            return lookUp.fullName;
          }

          if (lookUp.name) {
            return lookUp.name;
          }
        }

        if (m.managerName) {
          return m.managerName;
        }

        if (m.managerId !== undefined && m.managerId !== null) {
          return String(m.managerId);
        }

        return '';
      })
      .filter((name) => !!name);

    return names.join(', ');
  }

  getDayLabel(circle: CircleDto): string {
    const primaryDay = this.resolvePrimaryDay(circle);

    if (primaryDay) {
      if (primaryDay.dayName) {
        return primaryDay.dayName;
      }

      if (primaryDay.dayId !== undefined && primaryDay.dayId !== null) {
        return formatDayValue(primaryDay.dayId);
      }
    }

    if (circle.dayNames?.length) {
      const candidate = circle.dayNames[0];
      if (candidate) {
        return candidate;
      }
    }

    if (circle.dayName) {
      return circle.dayName;
    }

    return formatDayValue(circle.dayId ?? circle.day);
  }

  getFormattedStartTime(circle: CircleDto): string {
    const primaryDay = this.resolvePrimaryDay(circle);
    const timeSource = primaryDay?.time ?? circle.startTime ?? circle.time;

    return formatTimeValue(timeSource);
  }

  private resolvePrimaryDay(circle?: CircleDto | null): CircleDayDto | undefined {
    if (!circle || !Array.isArray(circle.days)) {
      return undefined;
    }

    return circle.days.find((day): day is CircleDayDto => Boolean(day)) ?? undefined;
  }
}

@Component({
  selector: 'app-delete-confirm-dialog',
  template: `
    <div class="m-b-0 p-10 f-16 f-w-600">Delete course</div>
    <div class="p-10">Are you sure you want to delete this course?</div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>No</button>
      <button mat-button color="warn" [mat-dialog-close]="true">Yes</button>
    </div>
  `,
  imports: [MatDialogActions, MatButton, MatDialogClose]
})
export class DeleteConfirmDialogComponent {}

