// angular import
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, SharedModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  readonly hadithTickerItems: string[] = [
    'قال رسول الله ﷺ: إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى.',
    'قال رسول الله ﷺ: خيركم من تعلم القرآن وعلمه.',
    'قال رسول الله ﷺ: من سلك طريقًا يلتمس فيه علمًا سهل الله له به طريقًا إلى الجنة.',
    'قال رسول الله ﷺ: تبسمك في وجه أخيك صدقة.'
  ];
}
