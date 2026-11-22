import { FormControl, FormGroup } from '@angular/forms';
import { createLabResultLineGroup, createLabResultLinesArray, labResultLinesFromForm } from '@/app/entities/lab-result/utils/lab-result-lines-form.utils';
import { labResultResultFieldsValidator } from '@/app/entities/lab-result/utils/lab-result-form.utils';
import { formatLabReferenceRange } from '@/app/entities/lab-result/utils/lab-result-lines.utils';

describe('lab değer satırı formu', () => {
    it('virgüllü ondalık kabul edilir ve sayıya çözülür', () => {
        const arr = createLabResultLinesArray();
        const g = createLabResultLineGroup();

        g.setValue({ parameterName: ' Glikoz ', value: '98,5', unit: 'mg/dL', referenceLow: '70', referenceHigh: '120,25' });
        arr.push(g);

        expect(g.valid).toBe(true);
        expect(labResultLinesFromForm(arr)).toEqual([{ parameterName: 'Glikoz', value: 98.5, unit: 'mg/dL', referenceLow: 70, referenceHigh: 120.25 }]);
    });

    it('ad ve değer zorunlu; sayı olmayan ya da 4 ondalıktan uzun değer geçersiz', () => {
        const g = createLabResultLineGroup();

        expect(g.controls.parameterName.hasError('required')).toBe(true);
        expect(g.controls.value.hasError('required')).toBe(true);

        g.controls.value.setValue('abc');
        expect(g.controls.value.hasError('labLineNumber')).toBe(true);
        g.controls.value.setValue('1,00001');
        expect(g.controls.value.hasError('labLineNumber')).toBe(true);
    });

    it('alt sınır üst sınırdan büyükse satır geçersiz', () => {
        const g = createLabResultLineGroup({ parameterName: 'ALT', value: 5, unit: null, referenceLow: 100, referenceHigh: 10 });

        expect(g.hasError('labLineRange')).toBe(true);
    });

    it('sonuç metni olmadan satır + tarih geçerli; satır var tarih yoksa eksik sonuç', () => {
        const form = (date: string) =>
            new FormGroup(
                {
                    resultDateLocal: new FormControl(date),
                    resultText: new FormControl(''),
                    interpretation: new FormControl(''),
                    lines: createLabResultLinesArray([{ parameterName: 'ALT', value: 45, unit: 'U/L', referenceLow: null, referenceHigh: null }])
                },
                { validators: labResultResultFieldsValidator() }
            );

        expect(form('2026-11-20T10:00').hasError('labResultResultIncomplete')).toBe(false);
        expect(form('').hasError('labResultResultIncomplete')).toBe(true);
    });

    it('referans aralığı metni', () => {
        expect(formatLabReferenceRange(10, 100.5)).toBe('10–100,5');
        expect(formatLabReferenceRange(10, null)).toBe('≥ 10');
        expect(formatLabReferenceRange(null, 5)).toBe('≤ 5');
        expect(formatLabReferenceRange(null, null)).toBe('');
    });
});
