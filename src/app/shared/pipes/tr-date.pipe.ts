import { Pipe, PipeTransform } from '@angular/core';
import { formatDateDisplay, formatDateTimeDisplay, formatTimeDisplay } from '@/app/shared/utils/date.utils';

/** UTC anı → Europe/Istanbul tarih (`dd.MM.yyyy`); boş değer `—`. Şablondaki `formatDate(...)` çağrısının yerini alır. */
@Pipe({ name: 'trDate', pure: true })
export class TrDatePipe implements PipeTransform {
    transform(value: string | Date | null | undefined): string {
        return formatDateDisplay(value);
    }
}

/** UTC anı → Europe/Istanbul tarih ve saat (`dd.MM.yyyy HH:mm`); boş değer `—`. `formatDateTime(...)` / `formatDt(...)` yerine. */
@Pipe({ name: 'trDateTime', pure: true })
export class TrDateTimePipe implements PipeTransform {
    transform(value: string | Date | null | undefined): string {
        return formatDateTimeDisplay(value);
    }
}

/** UTC anı → Europe/Istanbul saat (`HH:mm`); boş değer `—`. */
@Pipe({ name: 'trTime', pure: true })
export class TrTimePipe implements PipeTransform {
    transform(value: string | Date | null | undefined): string {
        return formatTimeDisplay(value);
    }
}
