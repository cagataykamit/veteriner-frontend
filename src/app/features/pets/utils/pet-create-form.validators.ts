import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { validateDateInputYearRange } from '@/app/shared/utils/date-input-validation.utils';

/** Boş değilse kilo sayısal ve makul aralıkta olmalı (backend kesin doğrular). */
export function petWeightStrValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = (control.value ?? '').toString().trim();

        if (v === '') {
            return null;
        }

        const normalized = v.replace(',', '.');
        const num = Number(normalized);

        if (Number.isNaN(num)) {
            return { weightInvalid: true };
        }

        if (num < 0 || num > 9999) {
            return { weightInvalid: true };
        }

        return null;
    };
}

/** Boş değilse `yyyy-MM-dd` ve takvim olarak geçerli olmalı. */
export function petBirthDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = (control.value ?? '').toString().trim();

        if (v === '') {
            return null;
        }

        if (validateDateInputYearRange(v)) {
            return { birthDateInvalid: true };
        }

        return null;
    };
}
