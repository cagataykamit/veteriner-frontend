import { Directive, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatTurkishMobileForInput } from '@/app/shared/utils/phone-display.utils';

/**
 * Müşteri telefon alanı (H17): alandan çıkınca tanınan cep numarası "0532 111 22 33" biçimine çevrilir.
 * Değer değişmezse forma dokunmaz (kirli işareti ve doğrulama boşuna tetiklenmez).
 */
@Directive({
    selector: 'input[appPhoneFormat]',
    standalone: true,
    host: { '(blur)': 'format()' }
})
export class PhoneFormatDirective {
    private readonly control = inject(NgControl, { self: true });

    format(): void {
        const control = this.control.control;
        const value = typeof control?.value === 'string' ? control.value : '';
        const formatted = formatTurkishMobileForInput(value);

        if (control && formatted !== value) {
            control.setValue(formatted);
        }
    }
}
