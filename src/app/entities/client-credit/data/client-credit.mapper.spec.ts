import { clientCreditsQueryToHttpParams, mapClientCreditApplyToApiBody, mapClientCreditRefundToApiBody } from './client-credit.mapper';

describe('client-credit.mapper', () => {
    it('includeClosed yalnız istenince gönderilir', () => {
        expect(clientCreditsQueryToHttpParams(false)).toBeUndefined();
        expect(clientCreditsQueryToHttpParams(true)?.get('includeClosed')).toBe('true');
    });

    it('mahsup gövdesi: aktif klinik varsa yazılır, satırlar korunur', () => {
        expect(mapClientCreditApplyToApiBody(' k1 ', 'r1', [{ chargeId: 'ch1', amount: 250 }])).toEqual({
            clinicId: 'k1',
            requestId: 'r1',
            allocations: [{ chargeId: 'ch1', amount: 250 }]
        });
        expect(mapClientCreditApplyToApiBody(null, 'r1', [])).toEqual({ requestId: 'r1', allocations: [] });
    });

    it('iade gövdesi: form yöntemi sözleşmedeki metin değere çevrilir, gerekçe kırpılır', () => {
        expect(mapClientCreditRefundToApiBody('  Müşteri istedi  ', 'transfer')).toEqual({ reason: 'Müşteri istedi', method: 'Transfer' });
        expect(mapClientCreditRefundToApiBody('Nakit iade', 'cash').method).toBe('Cash');
        expect(mapClientCreditRefundToApiBody('Kart iade', 'card').method).toBe('Card');
        expect(mapClientCreditRefundToApiBody('Nakit iade', 'cash', 'reg-2').cashRegisterId).toBe('reg-2');
        expect('cashRegisterId' in mapClientCreditRefundToApiBody('Kart iade', 'card', 'reg-2')).toBe(false);
    });
});
