import {
  Component,
  HostListener,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ElementRef,
  QueryList,
  ViewChildren,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

import { ContactService, ContactFormData } from '../../contact.service';
import { CounterService, CounterItem } from '../../counter.service';
import { AppInViewportDirective } from '../../../demo/directives/app-in-viewport.directive';
import { SharedModule } from '../../shared/shared.module';
import { RouterModule } from '@angular/router';
import { CarouselModule } from 'ngx-owl-carousel-o';

Swiper.use([Navigation, Pagination, Autoplay]);

interface FeatureIcon {
  type: 'svg' | 'img';
  content: string;
  style?: { [key: string]: string };
}

interface FeatureItem {
  id: number;
  titleAr?: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon: FeatureIcon;
}

interface CourseItem {
  courseNameAr: string;
  courseNameEn: string;
}

interface PackageItem {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

interface TestimonialSlide {
  image: string;
  title: { ar: string; en: string };
  gender: { ar: string; en: string };
  subtitle: { ar: string; en: string };
}

@Component({
  selector: 'app-landing',
  imports: [CommonModule, SharedModule, RouterModule, CarouselModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  title = 'أجيال القرآن';

  currentLang: 'ar' | 'en' = 'ar';
  isScrolled = false;
  showBackToTop = false;
  isPlaying = false;

  audio = new Audio('https://ajyalalquran.somee.com/assets/voice.mp3');

  // About us slider
  slides: string[] = [
    'https://ajyalquran.somee.com/media/slider1.jpg',
    'https://ajyalquran.somee.com/media/slider2.jpg',
    'https://ajyalquran.somee.com/media/slider3.jpg'
  ];
  currentSlide = 0;
  private slideSubscription?: Subscription;
  private readonly SLIDE_INTERVAL = 2500;

  @ViewChildren('slideRef') slideElements!: QueryList<ElementRef>;
  @ViewChildren('dotRef') dotElements!: QueryList<ElementRef>;

  sectionTitle = {
    ar: 'مدرسة أجيال القرآن 🌟',
    en: 'Ajyal Al-Quran School 🌟'
  };

  description = {
    ar: `نصنع أجيالًا بالقرآن... علمًا وخلقًا وقيادة

مدرسة أجيال القرآن هي مؤسسة تعليمية تربوية تُعنى بصناعة جيل قرآني واعٍ، يتربّى على هدي الكتاب والسنة، ويتسلّح بالعلم والمعرفة والمهارات الحياتية التي تؤهله لصناعة المستقبل.

نعمل على تقديم تعليم متميز يدمج بين العلوم الشرعية والمعارف المعاصرة، في إطار بيئة تعليمية محفّزة يقودها نخبة من المعلمين المتخصصين في تدريس القرآن الكريم والعلوم الإسلامية.

نحرص على بناء شخصية الطالب بناءً متكاملًا، يجمع بين الثبات الديني، والرقي الأخلاقي، والكفاءة العلمية، كما نولي اهتمامًا خاصًا بتنمية مهارات التفكير النقدي والإبداعي، وتعزيز روح المبادرة والقيادة.

نطمح في مدرسة أجيال القرآن إلى أن نكون روّادًا في تقديم نموذج تعليمي يُحتذى، يجمع بين الأصالة والمعاصرة، ويُخرّج طلابًا مؤمنين، مبدعين، وفاعلين في مجتمعاتهم.`,
    en: `Raising generations through the Quran... in knowledge, values, and leadership.

Ajyal Al-Quran School is an educational institution dedicated to nurturing a conscious Quranic generation. Our students are raised on the guidance of the Quran and Sunnah, empowered with knowledge, ethics, and life skills for shaping the future.

We offer distinguished education that integrates Islamic sciences with modern knowledge, all within a stimulating learning environment led by expert Quran and Islamic studies teachers.

Our goal is to develop students holistically – religiously steadfast, morally refined, and academically competent. We place great emphasis on critical and creative thinking, as well as initiative and leadership.

At Ajyal Al-Quran School, we aspire to set a pioneering model that blends authenticity with modernity, producing faithful, creative, and impactful students in their communities.`
  };

  toolbarCta = {
    target: 'contact',
    label: {
      ar: 'إنشاء إعلان',
      en: 'Create Ad'
    }
  };

  toolbarUser = {
    initials: {
      ar: 'م',
      en: 'M'
    }
  };

  toolbarLinks = [
    {
      target: 'features',
      label: {
        ar: 'البث المباشر',
        en: 'Live Stream'
      }
    },
    {
      target: 'our-services',
      label: {
        ar: 'المعاملات',
        en: 'Transactions'
      }
    },
    {
      target: 'packages',
      label: {
        ar: 'العروض',
        en: 'Proposals'
      }
    },
    {
      target: 'contact',
      label: {
        ar: 'لوحة التحكم',
        en: 'Dashboard'
      }
    }
  ];

  // Feature section
  features: FeatureItem[] = [
    {
      id: 1,
      titleAr: 'تقارير الطلاب ومتابعتهم 📄',
      titleEn: '📄 Student Reports & Follow-Up',
      descriptionAr: 'يوفر نظام أجيال القرآن تقارير دقيقة وشاملة عن أداء الطلاب، تشمل التحصيل العلمي، الحضور، والمشاركة في الأنشطة، مما يساعد المعلمين والإدارة على تقديم الدعم المناسب لكل طالب وفق احتياجاته.',
      descriptionEn: 'Ajyal Al-Quran provides detailed student performance reports including academic progress, attendance, and activity participation—helping teachers and administrators support each student according to their needs.',
      icon: {
        type: 'img',
        content: 'https://ajyalquran.somee.com/media/1.jpg'
      }
    },
    {
      id: 2,
      titleAr: 'المشرفون على التحفيظ والتدريس 👨\u200d🏫',
      titleEn: '👨\u200d🏫 Supervisors of Teaching & Memorization',
      descriptionAr: 'يشرف على تدريس القرآن الكريم نخبة من المشرفين المتخصصين، يتابعون الطلاب بدقة ويقيّمون الأداء، ويهتمون بغرس القيم القرآنية، وحل المشكلات التربوية.',
      descriptionEn: 'A team of qualified supervisors monitors student progress, ensures teaching quality, reinforces Quranic values, and addresses educational challenges to maintain a productive learning environment.',
      icon: {
        type: 'img',
        content: 'https://ajyalquran.somee.com/media/c31ec00f14f34b803f6d0fc15fcc6fd9.jpg '
      }
    },
    {
      id: 3,
      titleAr: '🔹 الحلقات في مدرسة أجيال القرآن',
      titleEn: '🔹 Classes at Ajyal Al-Quran',
      descriptionAr: 'نظام الحلقات الفردية يتيح لكل طالب متابعة خاصة وفق مستواه. الحلقات مقسمة لأقسام: الرجال، النساء، الأطفال، لتناسب الخصوصية والفئات العمرية المختلفة.',
      descriptionEn: 'Individualized class system ensures personalized follow-up. Classes are divided by group: Men, Women, and Children—with age-appropriate teaching environments.',
      icon: {
        type: 'img',
        content: 'https://ajyalquran.somee.com/media/2.jpg'
      }
    },
    {
      id: 4,
      titleAr: 'المعلمون في أجيال القرآن 👩\u200d🏫',
      titleEn: '👩\u200d🏫 Teachers at Ajyal Al-Quran',
      descriptionAr: 'نخبة من المعلمين والمعلمات المتخصصين، يجمعون بين الكفاءة العلمية والخبرة التربوية، ويركزون على غرس القيم القرآنية وتشجيع الطالب على الاستمرار.',
      descriptionEn: 'A team of highly qualified male and female teachers combines academic skill with educational experience, instilling Quranic values and supporting students\' continued growth.',
      icon: {
        type: 'img',
        content: 'https://ajyalquran.somee.com/media/3.jpg',
        style: {
          borderRadius: '10px',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)'
        }
      }
    }
  ];

  featureSectionTitle = {
    ar: 'مميزات مدرسة أجيال القرآن',
    en: 'Features of Ajyal Al-Quran School'
  };

  // Counter section
  counters: CounterItem[] = [];
  @ViewChildren('counterElement') counterElements!: QueryList<ElementRef>;
  private counterObserver: IntersectionObserver | null = null;
  private countersTriggered = false;

  // Services carousel
  services: CourseItem[] = [
    { courseNameAr: 'دورة في التدبر', courseNameEn: 'Reflection Course' },
    { courseNameAr: 'دورة في المخارج والصفات', courseNameEn: 'Articulation & Characteristics Course' },
    { courseNameAr: 'دورة (مهارات) لتطوير المعلم والمشرف', courseNameEn: '(Skills) Development Course for Teachers and Supervisors' },
    { courseNameAr: 'دورة تيسير الحفظ', courseNameEn: 'Facilitated Memorization Course' }
  ];
  currentCourseIndex = 0;
  currentCourse: CourseItem | null = null;
  private servicesIntervalId: any;

  // Packages slider
  packages: PackageItem[] = [
    {
      titleAr: '✨ قسم الحفظ المُيسَّر في أجيال القرآن ✨',
      titleEn: '✨ Easy Memorization Section at Ajyal Al-Quran ✨',
      contentAr: `🔸 التعريف:
قسم الحفظ المُيسَّر هو أحد أكثر الأقسام انتشارًا في أجيال القرآن، لكونه الأنسب لأغلب الطلاب، ويُعنى بحفظ القرآن الكريم بطريقة مريحة ومتدرجة.

🔹 الفئة المستهدفة:
- الطالب متوسط المستوى المجيد للقراءة
- الطالب المنشغل الذي لا يستطيع الالتحاق ببرامج الحفظ المكثفة.

🎯 أهداف قسم الحفظ المُيسَّر:
- حفظ القرآن الكريم دون مشقة مع بناء علاقة حب لكلام الله تعالى.
- تأسيس قاعدة متينة في الحفظ المستمر وتثبيت المحفوظ عبر مراجعات منتظمة ومدروسة.
- تحسين النطق والتجويد ومخارج الحروف.
- فهم غريب القرآن والمعاني العامة للآيات.

🧩 تقسيم الحلقة في قسم الحفظ المُيسَّر:

⏱ مدة الحلقة:
من 20 إلى 60 دقيقة، بحسب الباقة التعليمية التي يختارها الطالب:
- الماسية
- الذهبية
- الفضية
- البرونزية

📌 الأوراد القرآنية داخل الحلقة:
- تنقسم الحصة إلى أربعة أوراد رئيسية:
1. الجديد
2. الماضي القريب
3. الماضي البعيد
4. الماضي الأبعد

🧪 كما تُجرى اختبارات تقويمية دورية للاطمئنان على جودة الحفظ.`,
      contentEn: `🔸 Definition:
The Easy Memorization Section is one of the most popular sections at Ajyal Al-Quran. It suits most students and focuses on relaxed, gradual Quran memorization.

🔹 Target Audience:
- Intermediate-level students who are proficient in reading.
- Busy students who cannot commit to intensive memorization programs.

🎯 Objectives:
- Help students memorize the Quran with ease, fostering love for the words of Allah.
- Build a solid foundation for consistent memorization and strengthen retention through regular and structured reviews.
- Improve pronunciation, Tajweed, and articulation.
- Understand uncommon Quranic vocabulary and general meanings of the verses.

🧩 Class Structure in the Easy Memorization Section:

⏱ Duration:
20–60 minutes depending on the educational package selected by the student:
- Diamond
- Gold
- Silver
- Bronze

📌 Quranic Components within the Session:
The session is divided into four main components:
1. New memorization
2. Recent review
3. Older review
4. Long-term review

🧪 Regular assessment tests are conducted to ensure memorization quality.`
    },
    {
      titleAr: '🎙 قسم الترديد 🎙',
      titleEn: '🎙 Repetition Section 🎙',
      contentAr: `🔸 التعريف:
قسم الترديد يعتمد على أسلوب التلقين والتكرار، حيث يُردّد الطالب الآيات خلف المعلم عدة مرات، لترسيخ الحفظ عبر الذاكرة السمعية، مع تصحيح مخارج الحروف.

🔹 الفئة المستهدفة:
- الأطفال.
- كبار السن.
- المبتدئون.
- من يعانون من صعوبة في القراءة.

🎯 أهداف قسم الترديد:
- تسهيل الحفظ من خلال السماع والتكرار.
- تصحيح النطق وتحسين الأداء الصوتي.
- غرس الثقة في تلاوة القرآن الكريم.

🧩 تقسيم الحلقة في قسم الترديد:

⏱ مدة الحلقة:
من 20 إلى 60 دقيقة.

📌 الأنشطة داخل الحلقة:
1. تكرار الآيات خلف المعلم.
2. ربط الجديد بالقديم.
3. أداء واجب صوتي منزلي.

🎧 الوسائل المساعدة:
- تسجيلات صوتية
- بطاقات تلوين
- سبورة ذكية`,
      contentEn: `🔸 Definition:
The Repetition Section relies on the method of vocal prompting and repetition. The student repeats the verses after the teacher several times to reinforce memorization through auditory memory, along with articulation correction.

🔹 Target Audience:
- Children
- Seniors
- Beginners
- Individuals with reading difficulties

🎯 Objectives of the Repetition Section:
- Facilitate memorization through listening and repetition
- Correct pronunciation and improve vocal performance
- Instill confidence in reciting the Quran

🧩 Class Structure in the Repetition Section:

⏱ Duration:
20–60 minutes

📌 Activities within the session:
1. Repeating verses after the teacher
2. Linking new verses with previous ones
3. Performing a home audio assignment

🎧 Support Tools:
- Audio recordings
- Coloring cards
- Smart board`
    },
    {
      titleAr: '🧱 قسم التأسيس في أجيال القرآن 🧱',
      titleEn: '🧱 Foundation Section at Ajyal Al-Quran 🧱',
      contentAr: `🔸 التعريف:
قسم تأسيسي يهدف إلى تعليم الحروف ، ومخارجها ، وقواعد التهجي، ليتمكن الطالب من القراءة الصحيحة من المصحف.

🔹 الفئة المستهدفة:
- الأطفال من عمر 4 سنوات فأكثر.
- المبتدئون.
- من لديهم ضعف في القراءة أو صعوبات في النطق.

🎯 أهداف قسم التأسيس:
- تمكين الطالب من قراءة القرآن قراءة صحيحة.
- تعليم مخارج الحروف وصفاتها.
- تهيئة الطالب للالتحاق ببرامج الحفظ أو التلاوة.

🧩 تقسيم الحلقة في قسم التأسيس:

⏱ مدة الحلقة:
من 30 إلى 60 دقيقة.

📌 المحتوى التعليمي:
1. تعليم الحروف.
2. التدريب على التهجي.
3. التدرج في القراءة.
4. تصحيح التلاوة بشكل فردي وتفاعلي.

🎒 الوسائل المساعدة:
- بطاقات تعليمية.
- كتب تأسيسية متخصصة.
- تطبيقات تفاعلية.
- فيديوهات مبسطة.`,
      contentEn: `🔸 Definition:
A foundational section that focuses on teaching Arabic letters, articulation points, and decoding rules to enable students to read the Quran correctly from the Mushaf.

🔹 Target Audience:
- Children aged 4 and above
- Beginners
- Individuals with reading weaknesses or speech difficulties

🎯 Objectives of the Foundation Section:
- Enable students to read the Quran accurately
- Teach articulation points and characteristics of letters
- Prepare students to join memorization or recitation programs

🧩 Class Structure in the Foundation Section:

⏱ Duration:
30–60 minutes

📌 Educational Content:
1. Learning Arabic letters
2. Practicing decoding (Tajweed spelling)
3. Gradual reading practice
4. Individual and interactive recitation correction

🎒 Support Tools:
- Educational flashcards
- Specialized foundational books
- Interactive applications
- Simplified educational videos`
    },
    {
      titleAr: '🛡 قسم الحُصون في أجيال القرآن 🛡',
      titleEn: '🛡 Fortresses Section at Ajyal Al-Quran 🛡',
      contentAr: `🔸 التعريف:
قسم مخصص لبناء الحفظ المنظّم والمتقن من خلال منهجية "الحصون الخمسة".

🔹 الفئة المستهدفة:
- الطلاب الجادّون.
- المقبلون على اختبار أو ختمة.
- المعلّمون.

🎯 أهداف قسم الحُصون:
- ترسيخ الحفظ.
- منع النسيان.
- خطة شاملة للمراجعة.

🧱 منهجية الحصون الخمسة:
1. حصن الجديد.
2. حصن الماضي القريب.
3. حصن الماضي البعيد.
4. حصن التحضير.
5. حصن القراءة والسماع.

⏱ مدة الحلقة:
من 30 إلى 100 دقيقة، بحسب مستوى الطالب واحتياجه.

📌 المحتوى داخل الحلقة:
- تسميع.
- مراجعة منتظمة.
- تحضير.
- تلاوة.

🎖 الوسائل والأدوات المساعدة:
- جدول متابعة دقيق.
- اختبار شهري لتقويم الأداء.`,
      contentEn: `🔸 Definition:
A dedicated section for structured and refined memorization using the "Five Fortresses" methodology.

🔹 Target Audience:
- Committed students
- Those preparing for exams or khatma
- Teachers

🎯 Objectives of the Fortresses Section:
- Strengthen and anchor memorization
- Prevent forgetfulness
- Implement a comprehensive review plan

🧱 The Five Fortresses Method:
1. New memorization fortress
2. Recent review fortress
3. Distant review fortress
4. Preparation fortress
5. Reading & listening fortress

⏱ Session Duration:
30–100 minutes based on student level and need

📌 In-Session Content:
- Recitation
- Regular review
- Preparation
- Reading

🎖 Tools & Aids:
- Detailed follow-up schedule
- Monthly performance assessment test`
    },
    {
      titleAr: '🌿 نظام الحفظ والتدبر في أجيال القرآن 🌿',
      titleEn: '🌿 Memorization & Reflection System at Ajyal Al-Quran 🌿',
      contentAr: `🔸 التعريف:
نظام يجمع بين الحفظ والتدبر، من خلال فهم المعاني ومفردات القرآن قبل حفظه مما يعزز الوعي القرآني.

🔹 الفئة المستهدفة:
- من أتم التأسيس ويرغب بالجمع بين الحفظ والعمل بالقرآن.

🎯 أهداف قسم الحفظ والتدبر:
- دمج الحفظ بالفهم العميق للمعاني.
- غرس القيم القرآنية في السلوك العملي.

🧩 تقسيم الحلقة:

⏱ مدة الحلقة:
من 45 إلى 60 دقيقة

📌 محتوى الحلقة:
1. تهيئة ذهنية.
2. قراءة وتدبر الآيات.
3. حفظ الآيات.
4. تسميع.
5. واجب تطبيقي.

🧰 الوسائل المساعدة:
- دفتر تدبر لتسجيل الفوائد.
- خرائط ذهنية.
- أنشطة تفاعلية لتعزيز الفهم.`,
      contentEn: `🔸 Definition:
A system that integrates memorization with reflection by understanding Quranic meanings and vocabulary before memorizing, enhancing Quranic awareness.

🔹 Target Audience:
- Those who have completed the foundational level and wish to combine memorization with living the Quran.

🎯 Objectives of the Memorization & Reflection Section:
- Combine memorization with deep understanding of meanings.
- Instill Quranic values into practical behavior.

🧩 Session Structure:

⏱ Duration:
45–60 minutes

📌 Session Content:
1. Mental preparation
2. Reading and reflecting on verses
3. Memorizing verses
4. Recitation
5. Applied homework

🧰 Support Tools:
- Reflection journal for key takeaways
- Mind maps
- Interactive activities to reinforce understanding`
    },
    {
      titleAr: '📜 قسم الإجازات والقراءات في أجيال القرآن 📜',
      titleEn: '📜 Ijazah & Qira’\u0101t Section at Ajyal Al-Quran 📜',
      contentAr: `🔸 التعريف:
قسم متخصص يُعنى بتأهيل الطلاب لنيل الإجازة بالسند المتصل إلى النبي ﷺ في حفظ أو تلاوة القرآن الكريم، بإشراف نخبة من المجيزين والمقرئين.

🔹 الفئة المستهدفة:
- الحفاظ.
- طلاب العلم.
- المعلّمون.

🎯 أهداف قسم الإجازات والقراءات:
- تخريج مجازين متقنين.
- نشر علم الإقراء.
- رفع كفاءة المعلّمين.

🧩 مراحل الإجازة:
1. 📝 التقديم
2. 📚 التحضير
3. 🎙 العرض الكامل
4. 📜 الإجازة

📌 ملاحظات:
- الإجازات تُمنح وفق ضوابط دقيقة ومعايير أداء محددة.
- تُوثق الإجازات إلكترونيًا.`,
      contentEn: `🔸 Definition:
A specialized section focused on qualifying students to earn a certified Quranic Ijazah (license) with a connected chain to the Prophet Muhammad ﷺ, supervised by expert certified scholars.

🔹 Target Audience:
- Hafiz (memorizers)
- Knowledge seekers
- Quran teachers

🎯 Objectives of the Ijazah & Qira’at Section:
- Graduate well-qualified, certified reciters
- Spread the science of Quranic recitation (Iqra’a)
- Elevate the skill level of teachers

🧩 Ijazah Stages:
1. 📝 Application
2. 📚 Preparation
3. 🎙 Full Recital
4. 📜 Certification

📌 Notes:
- Ijazahs are granted according to strict criteria and performance standards
- All certifications are digitally archived`
    }
  ];

  private packagesSwiper: Swiper | null = null;
  private testimonialsSwiper: Swiper | null = null;

  // Testimonials slider
  testimonialSlides: TestimonialSlide[] = [
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ.فاطمة عثمان (حفص - قالون)', en: 'Ms. Fatima Othman (Hafs - Qalun)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'حفص مع أ. أمل أبو الفتوح - قالون مع أ. سماح حسين', en: 'Hafs with Ms. Amal Abu Al-Fotouh - Qalun with Ms. Samah Hussein' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. أسماء سعيد( عاصم وقالون)', en: 'Ms. Asmaa Saeed (Asim and Qalun)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'عاصم مع أ. هبة محمد - قالون مع أ. عزة عطا', en: 'Asim with Ms. Heba Mohamed - Qalun with Ms. Azza Atta' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. أمل كامل (حفص)', en: 'Ms. Amal Kamel (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. فاطمة عثمان', en: 'With Ms. Fatima Othman' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. ايمان كامل (حفص)', en: 'Ms. Iman Kamel (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. فاطمة عثمان', en: 'With Ms. Fatima Othman' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. آيات عاطف(حفص)', en: 'Ms. Ayat Atef (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. فاطمة عثمان', en: 'With Ms. Fatima Othman' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. إيمان صلاح (حفص)', en: 'Ms. Iman Salah (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. فاطمة عثمان', en: 'With Ms. Fatima Othman' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. شيماء محمد (حفص)', en: 'Ms. Shaimaa Mohamed (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. فاطمة أحمد', en: 'With Ms. Fatima Ahmed' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. آلاء عبد الباسط (حفص)', en: 'Ms. Alaa Abdelbaset (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. عبير النيل', en: 'With Ms. Abeer El-Neil' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'أ. أسماء عبد الفتاح (حفص)', en: 'Ms. Asmaa Abdelfattah (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. إيمان زكريا', en: 'With Ms. Iman Zakaria' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/girl.png',
      title: { ar: 'صفاء كامل (حفص)', en: 'Safa Kamel (Hafs)' },
      gender: { ar: 'طالبة', en: 'Student' },
      subtitle: { ar: 'مع أ. إلهام رشاد', en: 'With Ms. Elham Rashad' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'د.أحمد هنداوي', en: 'Dr. Ahmed Hendawy' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم الشيخ رمضان ربيع', en: 'With Sheikh Ramadan Rabie' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'أ.ٲنس محمد حسني (اجازة عاصم)', en: 'Mr. Anas Mohamed Hosny (Ijazah in Asim)' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم إيهاب صلاح', en: 'With Ustadh Ihab Salah' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'أ.معتز عادل', en: 'Mr. Moataz Adel' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم الشيخ معتز نايل', en: 'With Sheikh Moataz Nail' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'أ.محمد رضوان', en: 'Mr. Mohamed Redwan' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم الشيخ مصطفى النص', en: 'With Sheikh Mostafa Al-Nass' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'أ.يحيى السميني (اجازة عاصم)', en: 'Mr. Yahya Al-Samaini (Ijazah in Asim)' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم الشيخ أحمد فكري', en: 'With Sheikh Ahmed Fekry' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'أ.أسامة يوسف', en: 'Mr. Osama Youssef' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم الشيخ أحمد أبوبكر', en: 'With Sheikh Ahmed Abu Bakr' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'د.محمود الديب', en: 'Dr. Mahmoud El-Deeb' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم الشيخ أحمد أبوبكر', en: 'With Sheikh Ahmed Abu Bakr' }
    },
    {
      image: 'https://ajyalquran.somee.com/media/boy.png',
      title: { ar: 'أ.أحمد يحيى', en: 'Mr. Ahmed Yahya' },
      gender: { ar: 'طالب', en: 'Student' },
      subtitle: { ar: 'مع المعلم الشيخ أحمد سعد', en: 'With Sheikh Ahmed Saad' }
    }
  ];

  // Contact form
  contactForm!: FormGroup;
  isSubmitting = false;
  submitResult: { success: boolean; message: string } | null = null;

  // Footer
  readonly currentYear = new Date().getFullYear();
  readonly companyName = { ar: 'أجيال القرآن', en: 'Ajyal Al-Quran' };
  readonly quickLinks = [
    { id: 'about', textAr: 'من نحن', textEn: 'About Us' },
    { id: 'features', textAr: 'الميزات', textEn: 'Features' },
    { id: 'our-services', textAr: 'خدماتنا', textEn: 'Our Services' },
    { id: 'packages', textAr: 'أقسام المدرسة', textEn: 'School Sections' },
    { id: 'contact', textAr: 'اتصل بنا', textEn: 'Contact Us' }
  ];
  readonly contactInfo = { email: 'allhghayte8@gmail.com', phone: '+201099381081' };
  readonly socialLinks = [
    {
      icon: 'youtube',
      url: 'https://youtube.com/@ajyal_elpraan?si=DtyVJ8hdBoWbC_1V',
      ariaLabel: 'شاهد قناتنا الأولى على يوتيوب'
    },
    {
      icon: 'youtube',
      url: 'https://youtube.com/@agyal-alqoran?si=CLZECCURk8jHZvm_',
      ariaLabel: 'شاهد قناتنا الثانية على يوتيوب'
    },
    {
      icon: 'telegram',
      url: 'https://youtube.com/@agyal-alqoran?si=CLZECCURk8jHZvm_',
      ariaLabel: 'انضم إلى قناتنا على تيليجرام'
    }
  ];

  constructor(
    private contactService: ContactService,
    private counterService: CounterService,
    private fb: FormBuilder,
    private cdRef: ChangeDetectorRef
  ) {
    this.counters = this.counterService.getCounters();
  }

  ngOnInit(): void {
    const savedLang = localStorage.getItem('lang');
    this.currentLang = savedLang === 'en' ? 'en' : 'ar';
    this.contactService.currentLang = this.currentLang;
    document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';

    this.initContactForm();
    this.startSlideshow();
    this.setupCounterObserver();
    this.startServicesRotation();
  }

  ngAfterViewInit(): void {
    this.observeCounters();
    this.updateSlideClasses();

    this.slideElements?.changes.subscribe(() => this.updateSlideClasses());
    this.dotElements?.changes.subscribe(() => this.updateSlideClasses());

    // Fallback for small screens
    if (window.innerWidth <= 768 || !('IntersectionObserver' in window)) {
      setTimeout(() => this.startAllCounters(), 400);
    }

    this.initializePackagesSwiper();
    this.initializeTestimonialsSwiper();
  }

  ngOnDestroy(): void {
    this.stopSlideshow();
    this.cleanupCounters();
    this.counterObserver?.disconnect();
    this.packagesSwiper?.destroy(true, true);
    this.testimonialsSwiper?.destroy(true, true);
    clearInterval(this.servicesIntervalId);
  }

  // Navbar & layout helpers
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    this.isScrolled = scrollY > 100;
    this.showBackToTop = scrollY > window.innerHeight;
  }

  toggleLanguage(): void {
    this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.contactService.currentLang = this.currentLang;
    localStorage.setItem('lang', this.currentLang);
    document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  scrollTo(sectionId: string, event?: Event): void {
    event?.preventDefault();
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  playAudio(): void {
    if (this.audio.paused) {
      this.audio.loop = true;
      this.audio.volume = 0.5;
      this.audio.play().then(() => (this.isPlaying = true)).catch(() => {});
    } else {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // About us slider helpers
  private startSlideshow(): void {
    this.stopSlideshow();
    this.slideSubscription = interval(this.SLIDE_INTERVAL).subscribe(() => {
      this.moveToNextSlide();
    });
  }

  private stopSlideshow(): void {
    this.slideSubscription?.unsubscribe();
  }

  private moveToNextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.updateSlideClasses();
  }

  setCurrentSlide(index: number): void {
    this.currentSlide = index;
    this.updateSlideClasses();
    this.startSlideshow();
  }

  private updateSlideClasses(): void {
    this.slideElements?.forEach((slide, i) => {
      slide.nativeElement.classList.toggle('active', i === this.currentSlide);
    });

    this.dotElements?.forEach((dot, i) => {
      dot.nativeElement.classList.toggle('active', i === this.currentSlide);
    });
  }

  // Feature helpers
  isValidSvg(content: string): boolean {
    return content.includes('<svg') && content.includes('</svg>');
  }

  // Counter helpers
  private setupCounterObserver(): void {
    if ('IntersectionObserver' in window) {
      this.counterObserver = this.counterService.createIntersectionObserver(entries => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            this.startSingleCounter(index);
            this.counterObserver?.unobserve(entry.target);
          }
        });
      });
    }
  }

  private observeCounters(): void {
    if (!this.counterObserver) {
      return;
    }

    this.counterElements.forEach(element => {
      this.counterObserver?.observe(element.nativeElement);
    });
  }

  private startSingleCounter(index: number): void {
    const counter = this.counters[index];
    if (!counter) {
      return;
    }

    const startTime = performance.now();
    const startValue = 0;

    if (counter.interval) {
      clearInterval(counter.interval);
    }

    counter.interval = setInterval(() => {
      const { progress, easeProgress } = this.counterService.calculateProgress(startTime, counter.duration);
      counter.count = Math.round(startValue + (counter.target - startValue) * easeProgress);
      this.cdRef.markForCheck();

      if (progress >= 1) {
        clearInterval(counter.interval);
        counter.count = counter.target;
        this.cdRef.markForCheck();
      }
    }, 16);
  }

  private startAllCounters(): void {
    if (this.countersTriggered) {
      return;
    }

    this.countersTriggered = true;
    this.counters.forEach((_, idx) => this.startSingleCounter(idx));
  }

  private cleanupCounters(): void {
    this.counters.forEach(counter => {
      if (counter.interval) {
        clearInterval(counter.interval);
      }
    });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.currentLang === 'ar' ? 'en' : 'en').format(value);
  }

  // Services rotation
  private startServicesRotation(): void {
    if (this.services.length > 0) {
      this.currentCourse = this.services[0];
      this.servicesIntervalId = setInterval(() => {
        this.currentCourseIndex = (this.currentCourseIndex + 1) % this.services.length;
        this.currentCourse = this.services[this.currentCourseIndex];
      }, 3000);
    }
  }

  // Packages swiper helpers
  private initializePackagesSwiper(): void {
    setTimeout(() => {
      this.packagesSwiper?.destroy(true, true);
      this.packagesSwiper = new Swiper('.packages-swiper', {
        slidesPerView: 1,
        spaceBetween: 20,
        centeredSlides: false,
        loop: false,
        pagination: { el: '.packages-pagination', clickable: true },
        navigation: {
          nextEl: '.packages-button-next',
          prevEl: '.packages-button-prev'
        },
        breakpoints: {
          640: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 }
        }
      });
    }, 200);
  }

  // Testimonials swiper helpers
  private initializeTestimonialsSwiper(): void {
    setTimeout(() => {
      this.testimonialsSwiper?.destroy(true, true);
      this.testimonialsSwiper = new Swiper('.testimonials-swiper', {
        modules: [Navigation],
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        navigation: {
          nextEl: '.next-button',
          prevEl: '.prev-button'
        }
      });
    }, 200);
  }

  // Packages content formatter
  formatContent(raw: string, lang: 'ar' | 'en'): string {
    const headingMap: Record<string, { ar: string; en: string }> = {
      '🔸': { ar: 'التعريف', en: 'Definition' },
      '🔹': { ar: 'الفئة المستهدفة', en: 'Target Audience' },
      '🎯': { ar: 'الأهداف', en: 'Objectives' },
      '🧩': { ar: 'تقسيم الحلقة', en: 'Class Structure' },
      '📌': { ar: 'المحتوى', en: 'Content' },
      '⏱': { ar: 'المدة', en: 'Duration' },
      '🎧': { ar: 'الوسائل المساعدة', en: 'Support Tools' },
      '🎒': { ar: 'الوسائل التعليمية', en: 'Educational Tools' },
      '🧰': { ar: 'أدوات مساعدة', en: 'Aids' },
      '📓': { ar: 'واجب تطبيقي', en: 'Applied Homework' },
      '🗣': { ar: 'التسميع والمراجعة', en: 'Recitation & Review' },
      '🔊': { ar: 'الحفظ', en: 'Memorization' },
      '🧠': { ar: 'التدبر', en: 'Reflection' },
      '📖': { ar: 'التهيئة', en: 'Preparation' },
      '🎖': { ar: 'أدوات التقييم', en: 'Evaluation Tools' },
      '🧱': { ar: 'الحصون', en: 'Fortresses' }
    };

    const lines = raw.split('\n').map(line => line.trim());
    const html: string[] = [];
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
    };

    for (const line of lines) {
      if (!line) {
        closeLists();
        continue;
      }

      const key = line.slice(0, 2);
      if (headingMap[key]) {
        closeLists();
        if (key === '⏱') {
          const text = line.replace('⏱', '').trim();
          html.push(`<div class="section-sub"><strong>⏱ ${headingMap[key][lang]}:</strong> ${text}</div>`);
        } else {
          html.push(`<h4 class="section-heading">${headingMap[key][lang]}:</h4>`);
        }
        continue;
      }

      if (/^[-•]\s+/.test(line)) {
        if (!inUl) {
          closeLists();
          html.push('<ul>');
          inUl = true;
        }
        html.push(`<li>${line.replace(/^[-•]\s+/, '')}</li>`);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        if (!inOl) {
          closeLists();
          html.push('<ol>');
          inOl = true;
        }
        html.push(`<li>${line.replace(/^\d+\.\s+/, '')}</li>`);
        continue;
      }

      html.push(`<p>${line}</p>`);
    }

    closeLists();
    return html.join('');
  }

  // Contact form helpers
  private initContactForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$/)]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  hasError(field: string): boolean {
    const control = this.contactForm.get(field);
    return !!(control && control.errors && control.touched);
  }

  getErrorMessage(field: string): string {
    const control = this.contactForm.get(field);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    const messages: Record<string, string> = {
      required: 'هذا الحقل مطلوب',
      email: 'يرجى إدخال بريد إلكتروني صحيح',
      minlength: `يجب أن يكون الحد الأدنى ${control.errors['minlength']?.requiredLength} حروف`,
      pattern: 'يرجى إدخال رقم هاتف صحيح'
    };

    const firstError = Object.keys(errors)[0];
    return messages[firstError] || 'خطأ في الإدخال';
  }

  onSubmit(): void {
    if (this.contactForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.submitResult = null;

      const formData: ContactFormData = this.contactForm.value;
      this.contactService.submitContactForm(formData).subscribe({
        next: result => {
          this.submitResult = result;
          if (result.success) {
            this.contactForm.reset();
            Object.keys(this.contactForm.controls).forEach(key => {
              this.contactForm.get(key)?.setErrors(null);
            });
          }
        },
        error: () => {
          this.submitResult = {
            success: false,
            message: 'عذراً، حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.'
          };
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
    }
  }
}
