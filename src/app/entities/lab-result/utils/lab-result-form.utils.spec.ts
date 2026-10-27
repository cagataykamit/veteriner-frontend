import { FormControl, FormGroup } from '@angular/forms';
import { labResultResultFieldsValidator } from '@/app/entities/lab-result/utils/lab-result-form.utils';

const group = (
    v: {
        d?: string;
        t?: string;
        i?: string;
    },
    required = false
) =>
    new FormGroup(
        {
            resultDateLocal: new FormControl(v.d ?? ''),
            resultText: new FormControl(v.t ?? ''),
            interpretation: new FormControl(v.i ?? '')
        },
        { validators: labResultResultFieldsValidator(() => required) }
    );

describe('labResultResultFieldsValidator', () => {
    it('ikisi de boş (istem) geçerli; ikisi de dolu geçerli', () => {
        expect(group({}).valid).toBe(true);
        expect(group({ d: '2026-10-12T10:00', t: 'Normal' }).valid).toBe(true);
    });
    it('yalnız biri dolu geçersiz', () => {
        expect(group({ t: 'Normal' }).hasError('labResultResultIncomplete')).toBe(true);
        expect(group({ d: '2026-10-12T10:00' }).hasError('labResultResultIncomplete')).toBe(true);
    });
    it('sonuç yokken yorum geçersiz', () => {
        expect(group({ i: 'yorum' }).hasError('labResultInterpretationWithoutResult')).toBe(true);
    });
    it('sonuçlanmış kayıtta sonuç zorunlu', () => {
        expect(group({}, true).hasError('labResultResultIncomplete')).toBe(true);
    });
});
