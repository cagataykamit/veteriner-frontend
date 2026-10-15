import { AbstractControl, ValidationErrors } from '@angular/forms';

export const REASON_MIN = 5;
export const REASON_MAX = 500;

/** Sözleşme: gerekçe trim sonrası 5–500 karakter (geliş düzeltme/geri alma, gelmedi geri alma). */
export function reasonLength(c: AbstractControl): ValidationErrors | null {
    const len = typeof c.value === 'string' ? c.value.trim().length : 0;

    return len >= REASON_MIN && len <= REASON_MAX ? null : { reasonLength: true };
}
