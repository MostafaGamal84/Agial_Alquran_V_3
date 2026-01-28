import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface HadithCard {
  text: string;
  translation?: string;
  reference: string;
  eyebrow?: string;
}

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  private loadingValue = false;
  private hadithIndex = 0;
  private showHadithValue = false;

  private readonly defaultHadithList: HadithCard[] = [
    {
      text: 'خَيْرُكُمْ مَن تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
      translation: '“The best among you are those who learn the Qur’an and teach it.”',
      reference: 'صحيح البخاري',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'اقْرَؤوا القُرْآنَ، فَإِنَّهُ يَأْتِي يَوْمَ القِيَامَةِ شَفِيعًا لأَصْحَابِهِ',
      translation: '“Recite the Qur’an, for it will come as an intercessor for its companions on the Day of Resurrection.”',
      reference: 'صحيح مسلم',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'إِنَّ الَّذِي لَيْسَ فِي جَوْفِهِ شَيْءٌ مِنَ القُرْآنِ كَالْبَيْتِ الْخَرِبِ',
      translation: '“The one who has nothing of the Qur’an in his heart is like a ruined house.”',
      reference: 'سنن الترمذي',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'تَعَاهَدُوا القُرْآنَ، فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الإِبِلِ فِي عُقُلِهَا',
      translation: '“Keep revising the Qur’an, for it slips away faster than camels from their tethers.”',
      reference: 'متفق عليه',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'مَثَلُ المُؤْمِنِ الَّذِي يَقْرَأُ القُرْآنَ كَمَثَلِ الأُتْرُجَّةِ؛ رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ',
      translation: '“The believer who recites the Qur’an is like a citrus fruit: its scent is pleasant and its taste is pleasant.”',
      reference: 'متفق عليه',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'اقْرَؤوا سُورَةَ البَقَرَةِ؛ فَإِنَّ أَخْذَهَا بَرَكَةٌ، وَتَرْكَهَا حَسْرَةٌ',
      translation: '“Recite Surah al-Baqarah, for taking it brings blessing and abandoning it brings regret.”',
      reference: 'صحيح مسلم',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'إِذَا قَامَ أَحَدُكُمْ بِاللَّيْلِ فَعَجَزَ عَنْ القِرَاءَةِ، فَلْيَنَمْ، ثُمَّ لِيَقُمْ',
      translation: '“If one of you stands to pray at night and finds difficulty in reciting, let him sleep, then stand again.”',
      reference: 'صحيح مسلم',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'يُقَالُ لِصَاحِبِ القُرْآنِ اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا',
      translation: '“It will be said to the companion of the Qur’an: Recite, ascend, and recite as you used to in the world.”',
      reference: 'سنن أبي داود',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ',
      translation: '“The skilled reciter of the Qur’an will be with the noble and righteous scribes (the angels).”',
      reference: 'متفق عليه',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللهِ فَلَهُ بِهِ حَسَنَةٌ، وَالحَسَنَةُ بِعَشْرِ أَمْثَالِهَا',
      translation: '“Whoever recites a letter from the Book of Allah will have one good deed, and it will be multiplied tenfold.”',
      reference: 'سنن الترمذي',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'إِنَّ القُرْآنَ يَرْفَعُ أَقْوَامًا وَيَضَعُ آخَرِينَ',
      translation: '“Indeed, the Qur’an elevates some people and lowers others.”',
      reference: 'صحيح مسلم',
      eyebrow: 'فضل القرآن الكريم',
    },
    {
      text: 'نَوِّرُوا بُيُوتَكُمْ بِالصَّلَاةِ وَتِلَاوَةِ القُرْآنِ',
      translation: '“Illuminate your homes with prayer and recitation of the Qur’an.”',
      reference: 'المعجم الكبير للطبراني',
      eyebrow: 'فضل القرآن الكريم',
    },
  ];

  readonly hadithList: HadithCard[];
  readonly currentHadith$: BehaviorSubject<HadithCard>;

  private readonly eventHadithLists: Array<{
    name: string;
    match: (date: { day: number; month: number }) => boolean;
    hadiths: HadithCard[];
  }> = [
    {
      name: 'يوم عرفة',
      match: ({ day, month }) => month === 12 && day === 9,
      hadiths: [
        {
          text: 'صِيَامُ يَوْمِ عَرَفَةَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ وَالسَّنَةَ الَّتِي بَعْدَهُ',
          translation: '“Fasting the Day of Arafah expiates the previous year and the coming year.”',
          reference: 'صحيح مسلم',
          eyebrow: 'فضائل يوم عرفة',
        },
        {
          text: 'الحَجُّ عَرَفَةُ',
          translation: '“Hajj is Arafah.”',
          reference: 'سنن الترمذي',
          eyebrow: 'فضائل يوم عرفة',
        },
      ],
    },
    {
      name: 'يوم النحر',
      match: ({ day, month }) => month === 12 && day === 10,
      hadiths: [
        {
          text: 'أَعْظَمُ الأَيَّامِ عِندَ اللَّهِ يَوْمُ النَّحْرِ ثُمَّ يَوْمُ القَرِّ',
          translation: '“The greatest day with Allah is the Day of Sacrifice, then the Day of Rest.”',
          reference: 'سنن أبي داود',
          eyebrow: 'فضائل يوم النحر',
        },
        {
          text: 'مَا عَمِلَ ابْنُ آدَمَ يَوْمَ النَّحْرِ عَمَلًا أَحَبَّ إِلَى اللَّهِ مِنْ إِهْرَاقِ الدَّمِ',
          translation: '“No deed is more beloved to Allah on the Day of Sacrifice than shedding blood (of the sacrifice).”',
          reference: 'سنن الترمذي',
          eyebrow: 'فضائل يوم النحر',
        },
      ],
    },
    {
      name: 'عيد الفطر',
      match: ({ day, month }) => month === 10 && day === 1,
      hadiths: [
        {
          text: 'نَهَى رَسُولُ اللَّهِ ﷺ عَنْ صَوْمِ يَوْمِ الفِطْرِ وَيَوْمِ الأَضْحَى',
          translation: '“The Messenger of Allah forbade fasting on the Day of Fitr and the Day of Adha.”',
          reference: 'متفق عليه',
          eyebrow: 'يوم العيد',
        },
        {
          text: 'زَكَاةُ الفِطْرِ طُهْرَةٌ لِلصَّائِمِ مِنَ اللَّغْوِ وَالرَّفَثِ',
          translation: '“Zakat al-Fitr is a purification for the fasting person from idle talk and obscenity.”',
          reference: 'سنن أبي داود',
          eyebrow: 'يوم العيد',
        },
      ],
    },
    {
      name: 'عاشوراء',
      match: ({ day, month }) => month === 1 && day === 10,
      hadiths: [
        {
          text: 'صِيَامُ يَوْمِ عَاشُورَاءَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ',
          translation: '“Fasting the Day of Ashura expiates the previous year.”',
          reference: 'صحيح مسلم',
          eyebrow: 'فضائل عاشوراء',
        },
        {
          text: 'كَانَ النَّبِيُّ ﷺ يَتَحَرَّى صِيَامَ يَوْمِ عَاشُورَاءَ',
          translation: '“The Prophet used to be keen on fasting the Day of Ashura.”',
          reference: 'صحيح البخاري',
          eyebrow: 'فضائل عاشوراء',
        },
      ],
    },
    {
      name: 'ليلة القدر',
      match: ({ day, month }) => month === 9 && day === 27,
      hadiths: [
        {
          text: 'مَنْ قَامَ لَيْلَةَ القَدْرِ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ',
          translation: '“Whoever stands in prayer on Laylat al-Qadr with faith and seeking reward will be forgiven.”',
          reference: 'متفق عليه',
          eyebrow: 'فضائل ليلة القدر',
        },
      ],
    },
    {
      name: 'رمضان',
      match: ({ month }) => month === 9,
      hadiths: [
        {
          text: 'إِذَا جَاءَ رَمَضَانُ فُتِّحَتْ أَبْوَابُ الجَنَّةِ وَغُلِّقَتْ أَبْوَابُ النَّارِ',
          translation: '“When Ramadan begins, the gates of Paradise are opened and the gates of Hell are closed.”',
          reference: 'متفق عليه',
          eyebrow: 'فضائل رمضان',
        },
        {
          text: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ',
          translation: '“Whoever fasts Ramadan with faith and seeking reward will be forgiven.”',
          reference: 'متفق عليه',
          eyebrow: 'فضائل رمضان',
        },
      ],
    },
  ];

  constructor() {
    this.hadithList = this.resolveHadithList();
    this.currentHadith$ = new BehaviorSubject<HadithCard>(this.hadithList[0]);
  }

  @Input()
  set isLoading(value: boolean) {
    if (value === this.loadingValue) return;

    this.loadingValue = value;

    if (value && this.showHadithValue) {
      this.showNextHadith();   // أول حديث عشوائي
    }
  }

  get isLoading(): boolean {
    return this.loadingValue;
  }

  @Input()
  set showHadith(value: boolean) {
    this.showHadithValue = value;

    if (value && this.loadingValue) {
      this.showNextHadith();
    }
  }

  get showHadith(): boolean {
    return this.showHadithValue;
  }

  // ================= helpers =================

  private getRandomHadithIndex(): number {
    if (this.hadithList.length <= 1) return 0;

    let nextIndex: number;
    do {
      nextIndex = Math.floor(Math.random() * this.hadithList.length);
    } while (nextIndex === this.hadithIndex);

    return nextIndex;
  }

  private showNextHadith(): void {
    this.hadithIndex = this.getRandomHadithIndex();
    const hadith = this.hadithList[this.hadithIndex];

    this.currentHadith$.next(hadith);
  }

  private resolveHadithList(): HadithCard[] {
    const hijriDate = this.getHijriDateParts();

    if (hijriDate) {
      const matchedEvent = this.eventHadithLists.find((event) => event.match(hijriDate));
      if (matchedEvent?.hadiths.length) {
        return matchedEvent.hadiths;
      }
    }

    return this.defaultHadithList;
  }

  private getHijriDateParts(): { day: number; month: number } | null {
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
        day: 'numeric',
        month: 'numeric',
      });
      const parts = formatter.formatToParts(new Date());
      const dayPart = parts.find((part) => part.type === 'day')?.value;
      const monthPart = parts.find((part) => part.type === 'month')?.value;

      const day = dayPart ? Number(dayPart) : NaN;
      const month = monthPart ? Number(monthPart) : NaN;

      if (Number.isNaN(day) || Number.isNaN(month)) {
        return null;
      }

      return { day, month };
    } catch {
      return null;
    }
  }
}
