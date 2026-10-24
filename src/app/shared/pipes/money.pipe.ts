import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '@/app/shared/utils/money.utils';

/**
 * Para gösterimi (`tr-TR`, varsayılan TRY): `{{ row.amount | money }}` veya `{{ row.amount | money: row.currency }}`.
 * Saf pipe: aynı girdi için yeniden hesaplanmaz; şablondaki `money(...)` metot çağrısının yerini alır.
 */
@Pipe({ name: 'money', pure: true })
export class MoneyPipe implements PipeTransform {
    transform(amount: number | null | undefined, currency = 'TRY'): string {
        return formatMoney(amount, currency);
    }
}
