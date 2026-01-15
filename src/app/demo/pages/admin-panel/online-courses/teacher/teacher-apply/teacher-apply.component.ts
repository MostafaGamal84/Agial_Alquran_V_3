// angular import
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

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
export class TeacherApplyComponent implements OnInit, AfterViewInit, OnDestroy {
  // public props
  displayedColumns: string[] = ['name', 'department', 'qualification', 'mobile', 'date', 'action'];
  dataSource = new MatTableDataSource<teacherApply>([]);
  totalCount = ELEMENT_DATA.length;
  pageIndex = 0;
  pageSize = 10;
  private allRows = [...ELEMENT_DATA];
  private filteredRows = [...ELEMENT_DATA];
  readonly sort = viewChild(MatSort);
  isLoadingMore = false;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }

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

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private setupIntersectionObserver(): void {
    if (!this.loadMoreElement) {
      return;
    }

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadNextPage();
        }
      },
      { root: null, rootMargin: '0px 0px 20% 0px' }
    );
    this.intersectionObserver.observe(this.loadMoreElement.nativeElement);
  }

  private loadNextPage(): void {
    if (this.isLoadingMore || !this.hasMoreResults()) {
      return;
    }

    this.isLoadingMore = true;
    this.pageIndex += 1;
    this.updatePagedRows(true);
    this.isLoadingMore = false;
  }

  private updatePagedRows(append = false): void {
    this.totalCount = this.filteredRows.length;
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    const nextRows = this.filteredRows.slice(start, end);
    this.dataSource.data = append ? [...this.dataSource.data, ...nextRows] : nextRows;
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }
}
