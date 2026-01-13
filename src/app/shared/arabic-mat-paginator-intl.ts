import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable()
export class ArabicMatPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'عدد العناصر في الصفحة';
  override nextPageLabel = 'الصفحة التالية';
  override previousPageLabel = 'الصفحة السابقة';
 override firstPageLabel = 'الصفحة الأولى';
  override lastPageLabel = 'الصفحة الأخيرة';

  private readonly numberFormatter = new Intl.NumberFormat('ar-EG');

  override getRangeLabel(page: number, pageSize: number, length: number): string {
    const ltrMark = '\u200E';
    if (length === 0 || pageSize === 0) {
      return `${ltrMark}${this.formatNumber(0)}${ltrMark} من ${ltrMark}${this.formatNumber(length)}${ltrMark}`;
    }

    const startIndex = page * pageSize + 1;
    const endIndex = Math.min((page + 1) * pageSize, length);

    return `${ltrMark}${this.formatNumber(startIndex)} – ${this.formatNumber(endIndex)}${ltrMark} من ${ltrMark}${this.formatNumber(length)}${ltrMark}`;
  }

  private formatNumber(value: number): string {
    return this.numberFormatter.format(value);
  }
}