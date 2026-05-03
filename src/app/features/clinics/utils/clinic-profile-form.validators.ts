import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const CLINIC_PHONE_MAX = 50;
export const CLINIC_EMAIL_MAX = 256;
export const CLINIC_ADDRESS_MAX = 500;
export const CLINIC_DESCRIPTION_MAX = 1000;

/** Doluysa e-posta biçimi; boş/geçiş — geçerli. */
export function clinicOptionalEmailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value;
        const v = typeof raw === 'string' ? raw.trim() : '';
        if (!v) {
            return null;
        }
        return Validators.email(control);
    };
}
