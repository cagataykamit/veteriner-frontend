import { FormArray, FormControl, FormGroup, Validators, type AbstractControl, type ValidationErrors, type ValidatorFn } from '@angular/forms';
import type { LabResultLineInput } from '@/app/entities/lab-result/models/lab-result-vm.model';
import { parseDecimalFormInput } from '@/app/shared/utils/decimal-form.utils';

/** Sözleşme sınırları (LAB_RESULT_LINES_API_CONTRACT §1); kesin kural backend'de. */
export const LAB_RESULT_LINES_MAX = 60;
export const LAB_RESULT_LINE_PARAMETER_MAX = 100;
export const LAB_RESULT_LINE_UNIT_MAX = 30;

export const LAB_RESULT_LINE_NUMBER_ERROR_KEY = 'labLineNumber';
export const LAB_RESULT_LINE_RANGE_ERROR_KEY = 'labLineRange';

export type LabResultLineFormGroup = FormGroup<{
    parameterName: FormControl<string>;
    value: FormControl<string>;
    unit: FormControl<string>;
    referenceLow: FormControl<string>;
    referenceHigh: FormControl<string>;
}>;

export type LabResultLinesFormArray = FormArray<LabResultLineFormGroup>;

/** Boş geçer; doluysa virgül ya da noktayla yazılmış sayı olmalı, en çok 4 ondalık. */
function labDecimalValidator(): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => {
        const raw = (c.value ?? '').toString().trim();

        if (!raw) {
            return null;
        }

        const n = parseDecimalFormInput(raw);

        return n === null || Math.round(n * 10000) / 10000 !== n ? { [LAB_RESULT_LINE_NUMBER_ERROR_KEY]: true } : null;
    };
}

function labRangeValidator(): ValidatorFn {
    return (g: AbstractControl): ValidationErrors | null => {
        const low = parseDecimalFormInput(g.get('referenceLow')?.value);
        const high = parseDecimalFormInput(g.get('referenceHigh')?.value);

        return low !== null && high !== null && low > high ? { [LAB_RESULT_LINE_RANGE_ERROR_KEY]: true } : null;
    };
}

/** Türkçe girişle tutarlı: ondalık virgülle gösterilir (çözümleme ikisini de kabul eder). */
function numberText(n: number | null): string {
    return n === null ? '' : String(n).replace('.', ',');
}

export function createLabResultLineGroup(line?: LabResultLineInput): LabResultLineFormGroup {
    return new FormGroup(
        {
            parameterName: new FormControl(line?.parameterName ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(LAB_RESULT_LINE_PARAMETER_MAX)] }),
            value: new FormControl(line ? numberText(line.value) : '', { nonNullable: true, validators: [Validators.required, labDecimalValidator()] }),
            unit: new FormControl(line?.unit ?? '', { nonNullable: true, validators: [Validators.maxLength(LAB_RESULT_LINE_UNIT_MAX)] }),
            referenceLow: new FormControl(numberText(line?.referenceLow ?? null), { nonNullable: true, validators: [labDecimalValidator()] }),
            referenceHigh: new FormControl(numberText(line?.referenceHigh ?? null), { nonNullable: true, validators: [labDecimalValidator()] })
        },
        { validators: labRangeValidator() }
    );
}

export function createLabResultLinesArray(lines: LabResultLineInput[] = []): LabResultLinesFormArray {
    return new FormArray(lines.map((l) => createLabResultLineGroup(l)));
}

/** Formdaki satırlar; doğrulanmış formdan çağrılır. */
export function labResultLinesFromForm(array: LabResultLinesFormArray): LabResultLineInput[] {
    return array.getRawValue().map((l) => ({
        parameterName: l.parameterName.trim(),
        value: parseDecimalFormInput(l.value) ?? 0,
        unit: l.unit.trim() || null,
        referenceLow: parseDecimalFormInput(l.referenceLow),
        referenceHigh: parseDecimalFormInput(l.referenceHigh)
    }));
}
