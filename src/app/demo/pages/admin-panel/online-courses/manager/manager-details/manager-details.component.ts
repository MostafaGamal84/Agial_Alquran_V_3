import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LookUpUserDto } from 'src/app/@theme/services/lookup.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

@Component({
  selector: 'app-manager-details',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './manager-details.component.html',
  styleUrl: './manager-details.component.scss'
})
export class ManagerDetailsComponent implements OnInit {
  manager?: LookUpUserDto;

  Branch = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];

  ngOnInit() {
    const user = history.state['user'] as LookUpUserDto | undefined;
    if (user) {
      this.manager = user;
    }
  }

  getBranchLabel(id: number | undefined): string {
    return this.Branch.find((b) => b.id === id)?.label || String(id ?? '');
  }
}

