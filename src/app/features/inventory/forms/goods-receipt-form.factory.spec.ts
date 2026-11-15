import { FormBuilder } from '@angular/forms';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { createGoodsReceiptFormGroup } from './goods-receipt-form.factory';

describe('createGoodsReceiptFormGroup', () => {
    it('geliş tarihi bugün gelir (H1)', () => {
        expect(createGoodsReceiptFormGroup(new FormBuilder()).controls.receivedDate.value).toBe(localDateYyyyMmDd());
    });
});
