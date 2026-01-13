import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable()
export class ArabicMatPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'عدد العناصر في الصفحة';
  override nextPageLabel = 'الصفحة التالية';
  override previousPageLabel = 'الصفحة السابقة';
  override firstPageLabel = 'الصفحة الأولى';
  override lastPageLabel = 'الصفحة الأخيرة';

  override getRangeLabel(page: number, pageSize: number, length: number): string {
    if (length === 0 || pageSize === 0) {
      return `0 من ${length}`;
    }

    const startIndex = page * pageSize + 1;
    const endIndex = Math.min((page + 1) * pageSize, length);

    return `${startIndex} – ${endIndex} من ${length}`;
  }
}
