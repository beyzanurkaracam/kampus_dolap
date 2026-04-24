import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'trDate', standalone: true })
export class TrDatePipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}

@Pipe({ name: 'trCurrency', standalone: true })
export class TrCurrencyPipe implements PipeTransform {
  transform(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '₺0';
    return '₺' + num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}
