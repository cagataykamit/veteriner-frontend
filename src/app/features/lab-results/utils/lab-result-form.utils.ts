import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const LAB_RESULT_INCOMPLETE_ERROR_KEY = 'labResultResultIncomplete';
export const LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_ERROR_KEY = 'labResultInterpretationWithoutResult';

export const LAB_RESULT_INCOMPLETE_MESSAGE = 'Sonuç tarihi ve sonuç metni birlikte girilmelidir.';
export const LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_MESSAGE = 'Sonuç girilmeden yorum yazılamaz.';

function filled(c: AbstractControl | null): boolean {
    return !!(c?.value ?? '').toString().trim();
}

/**
 * Form grubu kuralı (sözleşme §3): sonuç tarihi ve metni birlikte dolu ya da birlikte boş; sonuç yokken yorum yazılamaz.
 * `resultRequired`: sonuçlanmış kayıtta sonuç geri silinemez.
 */
export function labResultResultFieldsValidator(resultRequired: () => boolean = () => false): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const hasDate = filled(group.get('resultDateLocal'));
        const hasText = filled(group.get('resultText'));
        if (hasDate !== hasText || (resultRequired() && !hasText)) {
            return { [LAB_RESULT_INCOMPLETE_ERROR_KEY]: true };
        }
        if (!hasText && filled(group.get('interpretation'))) {
            return { [LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_ERROR_KEY]: true };
        }
        return null;
    };
}
