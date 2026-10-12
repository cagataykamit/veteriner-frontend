import { FormControl, FormGroup } from '@angular/forms';
import { labResultResultFieldsValidator } from '@/app/features/lab-results/utils/lab-result-form.utils';

const group = (v: { d?: string; t?: string; i?: string }, required = false) =>
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
        expect(group({}).valid).toBeTrue();
        expect(group({ d: '2026-10-12T10:00', t: 'Normal' }).valid).toBeTrue();
    });
    it('yalnız biri dolu geçersiz', () => {
        expect(group({ t: 'Normal' }).hasError('labResultResultIncomplete')).toBeTrue();
        expect(group({ d: '2026-10-12T10:00' }).hasError('labResultResultIncomplete')).toBeTrue();
    });
    it('sonuç yokken yorum geçersiz', () => {
        expect(group({ i: 'yorum' }).hasError('labResultInterpretationWithoutResult')).toBeTrue();
    });
    it('sonuçlanmış kayıtta sonuç zorunlu', () => {
        expect(group({}, true).hasError('labResultResultIncomplete')).toBeTrue();
    });
});
