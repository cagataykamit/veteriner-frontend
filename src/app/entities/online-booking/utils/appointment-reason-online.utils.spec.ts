import { isUrgentOnlineReason } from './appointment-reason-online.utils';

describe('isUrgentOnlineReason', () => {
    it('yalnız online görünür ve adında "acil" geçen nedeni işaretler (Türkçe büyük İ dahil)', () => {
        expect(isUrgentOnlineReason('Acil', true)).toBe(true);
        expect(isUrgentOnlineReason('ACİL MUAYENE', true)).toBe(true);
        expect(isUrgentOnlineReason('Acil', false)).toBe(false);
        expect(isUrgentOnlineReason('Aşı', true)).toBe(false);
        expect(isUrgentOnlineReason(null, true)).toBe(false);
    });
});
