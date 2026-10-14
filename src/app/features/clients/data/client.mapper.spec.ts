import { mapClientDetailDtoToVm, mapClientUpsertFormValueToCreateRequest, mapCreateClientToApiBody } from './client.mapper';
import { parseClientContactChannel } from '@/app/features/clients/utils/client-contact-preference.utils';

describe('client.mapper iletişim tercihi (ADR-020 S5)', () => {
    it('detay: kanal ve hatırlatma bayrağı okunur; eski yanıtta alan yoksa tercih yok / hatırlatma açık', () => {
        const vm = mapClientDetailDtoToVm({ id: 'c1', tenantId: 't1', preferredContactChannel: 'WhatsApp', remindersOptedOut: true });
        expect([vm.preferredContactChannel, vm.remindersOptedOut]).toEqual(['WhatsApp', true]);
        const old = mapClientDetailDtoToVm({ id: 'c2', tenantId: 't1' });
        expect([old.preferredContactChannel, old.remindersOptedOut]).toEqual(['None', false]);
    });

    it('kanal büyük/küçük harf duyarsız; bilinmeyen değer tercih yok sayılır', () => {
        expect(parseClientContactChannel('sms')).toBe('Sms');
        expect(parseClientContactChannel('Fax')).toBe('None');
        expect(parseClientContactChannel(null)).toBe('None');
    });

    it('gövde: form değeri her zaman gönderilir (temizleme None / false); istekte alan yoksa gövdeye girmez (PUT değeri korur)', () => {
        const fromForm = mapClientUpsertFormValueToCreateRequest({
            fullName: ' Ali Veli ',
            phone: '',
            email: '',
            address: '',
            preferredContactChannel: 'None',
            remindersOptedOut: false
        });
        expect(mapCreateClientToApiBody(fromForm)).toEqual(
            jasmine.objectContaining({ fullName: 'Ali Veli', preferredContactChannel: 'None', remindersOptedOut: false })
        );

        const body = mapCreateClientToApiBody({ fullName: 'Ali Veli' });
        expect('preferredContactChannel' in body).toBeFalse();
        expect('remindersOptedOut' in body).toBeFalse();
    });
});
