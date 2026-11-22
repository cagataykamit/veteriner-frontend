import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const LAB_RESULT_INCOMPLETE_ERROR_KEY = 'labResultResultIncomplete';
export const LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_ERROR_KEY = 'labResultInterpretationWithoutResult';

export const LAB_RESULT_INCOMPLETE_MESSAGE = 'Sonuç tarihi ile sonuç metni ya da değer satırı birlikte girilmelidir.';
export const LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_MESSAGE = 'Sonuç girilmeden yorum yazılamaz.';

function filled(c: AbstractControl | null): boolean {
    return !!(c?.value ?? '').toString().trim();
}

/** Değer satırı dizisi (`lines`) boş değilse sonuç sayılır (LAB_RESULT_LINES_API_CONTRACT §1). */
function hasLines(group: AbstractControl): boolean {
    const lines = group.get('lines')?.value;

    return Array.isArray(lines) && lines.length > 0;
}

/**
 * Form grubu kuralı (sözleşme §3): sonuç (metin ya da değer satırı) ve tarihi birlikte dolu ya da birlikte boş; sonuç
 * yokken yorum yazılamaz. `resultRequired`: sonuçlanmış kayıtta sonuç geri silinemez.
 */
export function labResultResultFieldsValidator(resultRequired: () => boolean = () => false): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const hasDate = filled(group.get('resultDateLocal'));
        const hasResult = filled(group.get('resultText')) || hasLines(group);

        if (hasDate !== hasResult || (resultRequired() && !hasResult)) {
            return { [LAB_RESULT_INCOMPLETE_ERROR_KEY]: true };
        }

        if (!hasResult && filled(group.get('interpretation'))) {
            return { [LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_ERROR_KEY]: true };
        }

        return null;
    };
}
