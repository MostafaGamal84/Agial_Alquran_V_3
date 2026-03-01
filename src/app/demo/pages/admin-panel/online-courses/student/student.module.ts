import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSortModule } from '@angular/material/sort';

import { StudentRoutingModule } from './student-routing.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, StudentRoutingModule, MatSortModule]
})
export class StudentModule {}
