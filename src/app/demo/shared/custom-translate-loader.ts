import ar from './../../../assets/i18n/ar.json';

import { TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';

export class CustomTranslateLoader implements TranslateLoader {
  public getTranslation(lang: string) {
    return of(ar);
  }
}
