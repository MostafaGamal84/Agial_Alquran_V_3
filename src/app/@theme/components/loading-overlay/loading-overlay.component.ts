import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, NgZone, OnDestroy, inject } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss'
})
export class LoadingOverlayComponent implements OnDestroy {
  private loadingValue = false;
  private hadithIndex = 0;
  private rotationHandle: ReturnType<typeof setInterval> | null = null;
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly hadithList: HadithCard[] = [
    {
      text: 'خَيْرُكُمْ مَن تعلَّمَ القرآنَ وعلَّمَهُ',
      translation: '“The best among you are those who learn the Qur’an and teach it.”',
      reference: 'صحيح البخاري'
    },
    {
      text: 'اقرؤوا القرآنَ فإنه يأتي يومَ القيامةِ شفيعًا لأصحابِه',
      translation: '“Recite the Qur’an, for it will come as an intercessor for its companions on the Day of Resurrection.”',
      reference: 'صحيح مسلم'
    },
    {
      text: 'إنَّ الذي ليس في جوفِه شيءٌ من القرآنِ كالبيتِ الخربِ',
      translation: '“The one who has nothing of the Qur’an in his heart is like a ruined house.”',
      reference: 'سنن الترمذي'
    },
    {
      text: 'تَعاهدوا القرآنَ فو الذي نفسُ محمدٍ بيدِه لهو أشدُّ تفلُّتًا من الإبلِ في عقلِها',
      translation: '“Keep revising the Qur’an, for by the One in Whose hand is the soul of Muhammad, it slips away faster than camels are released from their tethers.”',
      reference: 'متفق عليه'
    }
  ];

  currentHadith: HadithCard = this.hadithList[0];

  @Input()
  set isLoading(value: boolean) {
    this.loadingValue = value;
    if (value) {
      this.showNextHadith();
      this.startRotation();
    } else {
      this.stopRotation();
    }
  }

  get isLoading(): boolean {
    return this.loadingValue;
  }

  ngOnDestroy(): void {
    this.stopRotation();
  }

  private showNextHadith(): void {
    this.hadithIndex = this.getRandomHadithIndex();
    this.currentHadith = this.hadithList[this.hadithIndex];
    this.cdr.markForCheck();
  }

  private getRandomHadithIndex(): number {
    if (this.hadithList.length <= 1) {
      return 0;
    }

    let nextIndex: number;
    do {
      nextIndex = Math.floor(Math.random() * this.hadithList.length);
    } while (nextIndex === this.hadithIndex);

    return nextIndex;
  }

  private startRotation(): void {
    if (this.rotationHandle) {
      return;
    }

    this.rotationHandle = this.ngZone.runOutsideAngular(() =>
      setInterval(() => {
        this.ngZone.run(() => this.showNextHadith());
      }, 2000)
    );
  }

  private stopRotation(): void {
    if (!this.rotationHandle) {
      return;
    }

    clearInterval(this.rotationHandle);
    this.rotationHandle = null;
  }
}

interface HadithCard {
  text: string;
  translation: string;
  reference: string;
}
