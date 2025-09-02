import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

interface RestCountry {
  name: { common: string };
  cca2: string;
  idd: { root: string; suffixes?: string[] };
}

export interface Country {
  name: string;
  dialCode: string;
  code: string;
}

@Injectable({ providedIn: 'root' })
export class CountryService {
  private http = inject(HttpClient);

  getCountries(): Observable<Country[]> {
    return this.http
      .get<RestCountry[]>(
        'https://restcountries.com/v3.1/all?fields=name,cca2,idd'
      )
      .pipe(
        map((countries) =>
          countries
            .filter((c) => c?.idd?.root)
            .map((c) => ({
              name: c.name.common,
              code: c.cca2,
              dialCode: `${c.idd.root}${c.idd.suffixes?.[0] ?? ''}`
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      );
  }
}

