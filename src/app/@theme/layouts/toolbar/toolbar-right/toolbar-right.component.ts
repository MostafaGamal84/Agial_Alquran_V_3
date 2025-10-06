// angular import
import { CommonModule } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NgxScrollbar } from 'src/app/@theme/components/ngx-scrollbar/ngx-scrollbar';

// project import
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { BuyNowLinkService } from 'src/app/@theme/services/buy-now-link.service';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LanguageService } from 'src/app/@theme/services/language.service';

@Component({
  selector: 'app-nav-right',
  imports: [SharedModule, CommonModule, RouterModule, NgxScrollbar],
  templateUrl: './toolbar-right.component.html',
  styleUrls: ['./toolbar-right.component.scss']
})
export class NavRightComponent {
  authenticationService = inject(AuthenticationService);
  buyNowLinkService = inject(BuyNowLinkService);
  private languageService = inject(LanguageService);

  // public props
  readonly HeaderBlur = output();

  // constructor
  constructor() {
    this.languageService.initialize();
  }

  // public method
  // user according language change of sidebar menu item
  useLanguage(language: string) {
    this.languageService.changeLanguage(language);
  }

  headerBlur() {
    this.HeaderBlur.emit();
  }

  // user Logout
  logout() {
    this.authenticationService.logout();
  }

  cards = [
    {
      icon: 'custom-layer',
      time: '2 min ago',
      position: 'UI/UX Design',
      description:
        "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley oftype and scrambled it to make a type"
    },
    {
      icon: 'custom-sms',
      time: '1 hour ago',
      position: 'Message',
      description: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500."
    }
  ];

  cards2 = [
    {
      icon: 'custom-document-text',
      time: '12 hour ago',
      position: 'Forms',
      description:
        "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley oftype and scrambled it to make a type"
    },
    {
      icon: 'custom-security-safe',
      time: '18 hour ago',
      position: 'Security',
      description: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500."
    }
  ];

  notification = [
    {
      sub_title: 'Improvement',
      time: '12 hour ago',
      title: 'Widgets update',
      img: 'assets/images/layout/img-announcement-3.png'
    },
    {
      sub_title: 'New Feature',
      time: '18 hour ago',
      title: 'Coming soon dark mode',
      img: 'assets/images/layout/img-announcement-4.png'
    }
  ];
}
