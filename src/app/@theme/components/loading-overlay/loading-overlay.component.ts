import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
} from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';

interface HadithCard {
  text: string;
  translation?: string;
  reference: string;
}

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent implements OnDestroy {
  private loadingValue = false;
  private hadithIndex = 0;
  private rotationSub: Subscription | null = null;

  readonly hadithList: HadithCard[] = [
  {
    text: 'خَيْرُكُمْ مَن تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    translation: '“The best among you are those who learn the Qur’an and teach it.”',
    reference: 'صحيح البخاري',
  },
  {
    text: 'اقْرَؤوا القُرْآنَ، فَإِنَّهُ يَأْتِي يَوْمَ القِيَامَةِ شَفِيعًا لأَصْحَابِهِ',
    translation: '“Recite the Qur’an, for it will come as an intercessor for its companions on the Day of Resurrection.”',
    reference: 'صحيح مسلم',
  },
  {
    text: 'إِنَّ الَّذِي لَيْسَ فِي جَوْفِهِ شَيْءٌ مِنَ القُرْآنِ كَالْبَيْتِ الْخَرِبِ',
    translation: '“The one who has nothing of the Qur’an in his heart is like a ruined house.”',
    reference: 'سنن الترمذي',
  },
  {
    text: 'تَعَاهَدُوا القُرْآنَ، فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الإِبِلِ فِي عُقُلِهَا',
    translation: '“Keep revising the Qur’an, for it slips away faster than camels from their tethers.”',
    reference: 'متفق عليه',
  },
  {
    text: 'مَثَلُ المُؤْمِنِ الَّذِي يَقْرَأُ القُرْآنَ كَمَثَلِ الأُتْرُجَّةِ؛ رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ',
    translation: '“The believer who recites the Qur’an is like a citrus fruit: its scent is pleasant and its taste is pleasant.”',
    reference: 'متفق عليه',
  },
  {
    text: 'اقْرَؤوا سُورَةَ البَقَرَةِ؛ فَإِنَّ أَخْذَهَا بَرَكَةٌ، وَتَرْكَهَا حَسْرَةٌ',
    translation: '“Recite Surah al-Baqarah, for taking it brings blessing and abandoning it brings regret.”',
    reference: 'صحيح مسلم',
  },
  {
    text: 'إِذَا قَامَ أَحَدُكُمْ بِاللَّيْلِ فَعَجَزَ عَنْ القِرَاءَةِ، فَلْيَنَمْ، ثُمَّ لِيَقُمْ',
    translation: '“If one of you stands to pray at night and finds difficulty in reciting, let him sleep, then stand again.”',
    reference: 'صحيح مسلم',
  },
  {
    text: 'يُقَالُ لِصَاحِبِ القُرْآنِ اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا',
    translation: '“It will be said to the companion of the Qur’an: Recite, ascend, and recite as you used to in the world.”',
    reference: 'سنن أبي داود',
  },
  {
    text: 'الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ',
    translation: '“The skilled reciter of the Qur’an will be with the noble and righteous scribes (the angels).”',
    reference: 'متفق عليه',
  },
  {
    text: 'مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللهِ فَلَهُ بِهِ حَسَنَةٌ، وَالحَسَنَةُ بِعَشْرِ أَمْثَالِهَا',
    translation: '“Whoever recites a letter from the Book of Allah will have one good deed, and it will be multiplied tenfold.”',
    reference: 'سنن الترمذي',
  },
  {
    text: 'إِنَّ القُرْآنَ يَرْفَعُ أَقْوَامًا وَيَضَعُ آخَرِينَ',
    translation: '“Indeed, the Qur’an elevates some people and lowers others.”',
    reference: 'صحيح مسلم',
  },
  {
    text: 'نَوِّرُوا بُيُوتَكُمْ بِالصَّلَاةِ وَتِلَاوَةِ القُرْآنِ',
    translation: '“Illuminate your homes with prayer and recitation of the Qur’an.”',
    reference: 'المعجم الكبير للطبراني',
  }
];

  // بدل currentHadith العادية → stream
  readonly currentHadith$ = new BehaviorSubject<HadithCard>(this.hadithList[0]);

  @Input()
  set isLoading(value: boolean) {
    if (value === this.loadingValue) return;

    this.loadingValue = value;

    if (value) {
      this.showNextHadith();   // أول حديث عشوائي
      this.startRotation();    // وبعدين نبدأ التدوير
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

  // ================= helpers =================

  private emitRandomHadith(): void {
    this.hadithIndex = this.getRandomHadithIndex();
    const hadith = this.hadithList[this.hadithIndex];

    this.currentHadith$.next(hadith);
  }

  private getRandomHadithIndex(): number {
    if (this.hadithList.length <= 1) return 0;

    let nextIndex: number;
    do {
      nextIndex = Math.floor(Math.random() * this.hadithList.length);
    } while (nextIndex === this.hadithIndex);

    return nextIndex;
  }

  private startRotation(): void {
    if (this.rotationSub) return;

    // غيّر الحديث كل 2 ثانية (أو نص ثانية لو حابب)
    this.rotationSub = interval(2000).subscribe(() => {
      if (!this.loadingValue) return;
      this.emitRandomHadith();
    });
  }

  private stopRotation(): void {
    if (!this.rotationSub) return;

    this.rotationSub.unsubscribe();
    this.rotationSub = null;
  }

  private showNextHadith(): void {
    this.emitRandomHadith();
  }
}
