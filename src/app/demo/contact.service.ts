import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, map, catchError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = 'https://ajyalalquran.somee.com/api/Subscribe/SendEmailForNewRequests';

  constructor(private http: HttpClient) { }
  submitContactForm(formData: ContactFormData): Observable<{ success: boolean; message: string }> {
    const params = new HttpParams()
      .set('email', formData.email)
      .set('name', formData.name)
      .set('message', formData.message)
      .set('phone', formData.phone || '');

    return this.http.post(this.apiUrl, null, { params }).pipe(
      map(() => ({
        success: true,
        message: 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.'
      })),
      catchError(() =>
        of({
          success: false,
          message: 'عذراً، حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.'
        })
      )
    );
  }
SetLanguage(): void {
  // افتراض اللغة العربية إذا لم تُحدد

  const savedLang = localStorage.getItem('lang');
  const lang = (savedLang === 'en' || savedLang === 'ar') ? savedLang : 'ar';
  this.setCurrentUser(lang);
}
  setCurrentUser(lang: any) {
    localStorage.setItem('lang', lang);
  }
   currentLang: 'ar' | 'en' = 'ar';
toggleLanguage(): void {
  
  this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('lang', this.currentLang);

  // تحديث الاتجاه
  document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';

  // لإجبار Angular على إعادة تحميل المحتوى (اختياري)
  location.reload();
}
}