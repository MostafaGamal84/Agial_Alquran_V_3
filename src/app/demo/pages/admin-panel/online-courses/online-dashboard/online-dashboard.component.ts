// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { StatisticsChartComponent } from '../../../apex-chart/statistics-chart/statistics-chart.component';
import { InvitesGoalChartComponent } from './invites-goal-chart/invites-goal-chart.component';
import { CourseReportBarChartComponent } from './course-report-bar-chart/course-report-bar-chart.component';
import { TotalRevenueLineChartComponent } from './total-revenue-line-chart/total-revenue-line-chart.component';
import { StudentStatesChartComponent } from './student-states-chart/student-states-chart.component';
import { ActivityLineChartComponent } from './activity-line-chart/activity-line-chart.component';
import { activityData } from 'src/app/fake-data/activity_data';
import { VisitorsBarChartComponent } from './visitors-bar-chart/visitors-bar-chart.component';
import { EarningCoursesLineChartComponent } from './earning-courses-line-chart/earning-courses-line-chart.component';
import { courseStatesData } from 'src/app/fake-data/courseStates_data';
import { CircleService, CircleDayDto, UpcomingCircleDto } from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { formatDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue } from 'src/app/@theme/utils/time';
import { TranslateService } from '@ngx-translate/core';

export interface activity_Data {
  image: string;
  name: string;
  qualification: string;
  rating: string;
}

export interface courseStates_data {
  name: string;
  teacher: string;
  rating: number;
  earning: string;
  sale: string;
}

const activity_Data = activityData;
const courseStates_data = courseStatesData;

@Component({
  selector: 'app-online-dashboard',
  imports: [
    SharedModule,
    CommonModule,
    StatisticsChartComponent,
    InvitesGoalChartComponent,
    CourseReportBarChartComponent,
    TotalRevenueLineChartComponent,
    StudentStatesChartComponent,
    ActivityLineChartComponent,
    VisitorsBarChartComponent,
    EarningCoursesLineChartComponent
  ],
  templateUrl: './online-dashboard.component.html',
  styleUrl: './online-dashboard.component.scss'
})
export class OnlineDashboardComponent implements OnInit {
  // public props
  selected: Date | null;

  private circleService = inject(CircleService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  activity: string[] = ['Name', 'Qualification', 'Rating'];
  activitySource = activity_Data;

  courseStates: string[] = ['Name', 'Teacher', 'Rating', 'Earning', 'Sale', 'Action'];
  courseSource = courseStates_data;

  upcomingCircles: UpcomingCircleDto[] = [];
  upcomingLoading = false;

  // public methods
  dashboard_summary = [
    {
      icon: '#custom-profile-2user-outline',
      background: 'bg-primary-50 text-primary-500',
      title: 'New Students',
      value: '400+',
      percentage: '30.6%',
      color: 'text-success'
    },
    {
      icon: '#book',
      background: 'bg-warning-50 text-warning-500',
      title: 'Total Course',
      value: '520+',
      percentage: '30.6%',
      color: 'text-warning-500'
    },
    {
      icon: '#custom-eye',
      background: 'bg-success-50 text-success-500',
      title: 'New Visitor',
      value: '800+',
      percentage: '30.6%',
      color: 'text-success-500'
    },
    {
      icon: '#custom-card',
      background: 'bg-warn-50 text-warn-500',
      title: 'Total sale',
      value: '1065',
      percentage: '30.6%',
      color: 'text-warn-500'
    }
  ];

  queriesList = [
    {
      image: 'assets/images/user/avatar-2.png',
      title: 'Python $ Data Manage'
    },
    {
      image: 'assets/images/user/avatar-1.png',
      title: 'Website Error'
    },
    {
      image: 'assets/images/user/avatar-3.png',
      title: 'How to Illustrate'
    },
    {
      image: 'assets/images/user/avatar-4.jpg',
      title: 'PHP Learning'
    }
  ];

  notificationList = [
    {
      image: 'assets/images/user/avatar-1.png',
      title: 'Report Successfully',
      time: 'Today | 9:00 AM'
    },
    {
      image: 'assets/images/user/avatar-5.jpg',
      title: 'Reminder: Test time',
      time: 'Yesterday | 6:30 PM'
    },
    {
      image: 'assets/images/user/avatar-3.png',
      title: 'Send course pdf',
      time: '05 Feb | 3:45 PM'
    },
    {
      image: 'assets/images/user/avatar-2.png',
      title: 'Report Successfully',
      time: '05 Feb | 4:00 PM'
    }
  ];
  ngOnInit(): void {
    this.loadUpcomingCircles();
  }

  loadUpcomingCircles(take = 4): void {
    this.upcomingLoading = true;
    this.circleService.getUpcoming(undefined, undefined, take).subscribe({
      next: (res) => {
        this.upcomingLoading = false;
        if (res.isSuccess) {
          this.upcomingCircles = res.data ?? [];
        } else {
          this.upcomingCircles = [];
          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          }
        }
      },
      error: () => {
        this.upcomingLoading = false;
        this.upcomingCircles = [];
        this.toast.error(this.translate.instant('Failed to load upcoming courses'));
      }
    });
  }

  getUpcomingScheduleLabel(circle: UpcomingCircleDto): string {
    const primaryDay = this.resolveUpcomingPrimaryDay(circle);

    const dayLabel =
      circle.nextDayName ??
      (circle.nextDayId !== undefined && circle.nextDayId !== null
        ? formatDayValue(circle.nextDayId)
        : primaryDay
          ? formatDayValue(primaryDay.dayId)
          : '');

    let dateLabel = '';
    if (circle.nextOccurrenceDate) {
      const date = new Date(circle.nextOccurrenceDate);
      if (!Number.isNaN(date.getTime())) {
        dateLabel = date.toLocaleDateString();
      }
    }

    const timeLabel = formatTimeValue(circle.startTime ?? primaryDay?.time);

    const parts = [dayLabel, dateLabel, timeLabel]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter((part) => !!part);

    return parts.join(' • ');
  }

  getUpcomingTeacherName(circle: UpcomingCircleDto): string {
    const teacher = circle.teacher;

    if (teacher && typeof teacher === 'object') {
      const lookUp = teacher as { fullName?: string; name?: string };
      if (lookUp.fullName) {
        return lookUp.fullName;
      }
      if (lookUp.name) {
        return lookUp.name;
      }
    }

    if (circle.teacherName) {
      return circle.teacherName;
    }

    if (circle.teacherId !== undefined && circle.teacherId !== null) {
      return this.translate.instant('Teacher #{{id}}', { id: circle.teacherId });
    }

    return '';
  }

  getCircleInitials(name?: string | null): string {
    if (!name) {
      return 'C';
    }

    const segments = name
      .split(/\s+/)
      .filter((segment) => !!segment)
      .slice(0, 2);

    const initials = segments.map((segment) => segment.charAt(0)).join('').toUpperCase();

    return initials || name.charAt(0).toUpperCase() || 'C';
  }

  getUpcomingManagersLabel(circle: UpcomingCircleDto): string {
    const managers = circle.managers;

    if (!managers || !managers.length) {
      return '';
    }

    const names = managers
      .map((manager) => {
        if (!manager) {
          return '';
        }

        const managerValue = manager.manager;

        if (typeof managerValue === 'string') {
          return managerValue;
        }

        if (managerValue && typeof managerValue === 'object') {
          const lookUp = managerValue as { fullName?: string; name?: string };
          if (lookUp.fullName) {
            return lookUp.fullName;
          }
          if (lookUp.name) {
            return lookUp.name;
          }
        }

        if (manager.managerName) {
          return manager.managerName;
        }

        if (manager.managerId !== undefined && manager.managerId !== null) {
          return `#${manager.managerId}`;
        }

        return '';
      })
      .filter((name) => !!name);

    return names.join(', ');
  }

  private resolveUpcomingPrimaryDay(circle?: UpcomingCircleDto | null): CircleDayDto | undefined {
    if (!circle || !Array.isArray(circle.days)) {
      return undefined;
    }

    return circle.days.find((day): day is CircleDayDto => Boolean(day)) ?? undefined;
  }
}
