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

  // وظائف واجهة المستخدم
  // تغيير اللغة إلى العربية فقط
  useLanguage(language: string) {
    this.languageService.changeLanguage(language);
  }

  headerBlur() {
    this.HeaderBlur.emit();
  }

  // تسجيل الخروج للمستخدم
  logout() {
    this.authenticationService.logout();
  }

  cards = [
    {
      icon: 'custom-layer',
      time: 'منذ دقيقتين',
      position: 'تصميم واجهات المستخدم',
      description: 'نص افتراضي يُستخدم في التصميم منذ القرن السادس عشر لتوضيح شكل المحتوى.'
    },
    {
      icon: 'custom-sms',
      time: 'منذ ساعة',
      position: 'رسالة',
      description: 'نص افتراضي يُستخدم في التصميم منذ القرن السادس عشر لتوضيح شكل المحتوى.'
    }
  ];

  cards2 = [
    {
      icon: 'custom-document-text',
      time: 'منذ 12 ساعة',
      position: 'نماذج',
      description: 'نص افتراضي يُستخدم في التصميم منذ القرن السادس عشر لتوضيح شكل المحتوى.'
    },
    {
      icon: 'custom-security-safe',
      time: 'منذ 18 ساعة',
      position: 'حماية',
      description: 'نص افتراضي يُستخدم في التصميم منذ القرن السادس عشر لتوضيح شكل المحتوى.'
    }
  ];

  notification = [
    {
      sub_title: 'تحسين',
      time: 'منذ 12 ساعة',
      title: 'تحديث الأدوات',
      img: 'assets/images/layout/img-announcement-3.png'
    },
    {
      sub_title: 'ميزة جديدة',
      time: 'منذ 18 ساعة',
      title: 'الوضع الليلي قريباً',
      img: 'assets/images/layout/img-announcement-4.png'
    }
  ];
}
