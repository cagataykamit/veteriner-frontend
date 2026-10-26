import { mapClientDetailDtoToVm, mapClientKvkkConsentDtoToVm, mapClientKvkkConsentUpdateToApiBody, mapClientUpsertFormValueToCreateRequest, mapCreateClientToApiBody } from './client.mapper';
import { parseClientContactChannel } from '@/app/features/clients/utils/client-contact-preference.utils';
import { kvkkConsentStatusLabel, parseKvkkConsentStatus } from '@/app/features/clients/utils/client-kvkk-consent.utils';

describe('client.mapper KVKK rıza (ADR-021)', () => {
    it('detay: durum, tarih, işaretleyen ve rowVersion okunur; eski yanıtta alan yoksa Yok', () => {
        const vm = mapClientDetailDtoToVm({
            id: 'c1',
            tenantId: 't1',
            kvkkConsentStatus: 'Accepted',
            kvkkConsentRecordedOn: '2026-10-15',
            kvkkConsentRecordedByName: ' Ayşe Yılmaz ',
            rowVersion: 'AAAAAAAAB9E='
        });

        expect(vm.kvkkConsent).toEqual({ status: 'Accepted', recordedOn: '2026-10-15', recordedByName: 'Ayşe Yılmaz', templateVersion: null, templateHash: null });
        expect(vm.rowVersion).toBe('AAAAAAAAB9E=');

        const old = mapClientDetailDtoToVm({ id: 'c2', tenantId: 't1' });

        expect(old.kvkkConsent).toEqual({ status: 'None', recordedOn: null, recordedByName: null, templateVersion: null, templateHash: null });
        expect(old.rowVersion).toBeNull();
    });

    it('Yok iken tarih ve işaretleyen yok sayılır; durum metin (harf duyarsız) veya sayı olabilir', () => {
        expect(mapClientKvkkConsentDtoToVm({ kvkkConsentStatus: 'None', kvkkConsentRecordedOn: '2026-10-15', kvkkConsentRecordedByName: 'X' }).kvkkConsent).toEqual({
            status: 'None',
            recordedOn: null,
            recordedByName: null,
            templateVersion: null,
            templateHash: null
        });
        expect(mapClientKvkkConsentDtoToVm({ kvkkConsentStatus: 'Declined', kvkkConsentRecordedOn: '2026-10-15', remindersOptedOut: true, rowVersion: 'rv2' }), 'PUT yanıtı Ret sonrası bayrağı taşır (ADR-025)').toEqual({
            kvkkConsent: { status: 'Declined', recordedOn: '2026-10-15', recordedByName: null, templateVersion: null, templateHash: null },
            remindersOptedOut: true,
            rowVersion: 'rv2'
        });
        expect(parseKvkkConsentStatus('declined')).toBe('Declined');
        expect(parseKvkkConsentStatus(1)).toBe('Accepted');
        expect(parseKvkkConsentStatus('Maybe')).toBe('None');
        expect([kvkkConsentStatusLabel('None'), kvkkConsentStatusLabel('Accepted'), kvkkConsentStatusLabel('Declined')]).toEqual(['Yok', 'Kabul', 'Ret']);
    });

    it('metin sürümü (ADR-032): Kabul/Ret iken sürüm ve tam özet okunur; Yok iken ve geçersiz sürümde boş', () => {
        const hash = 'a'.repeat(64);

        expect(mapClientKvkkConsentDtoToVm({ kvkkConsentStatus: 'Accepted', kvkkConsentTemplateVersion: 3, kvkkConsentTemplateHash: hash }).kvkkConsent).toEqual(expect.objectContaining({ templateVersion: 3, templateHash: hash }));
        expect(mapClientKvkkConsentDtoToVm({ kvkkConsentStatus: 'Declined', kvkkConsentTemplateVersion: 0, kvkkConsentTemplateHash: hash }).kvkkConsent.templateVersion, 'varsayılan metin 0 korunur').toBe(0);
        expect(mapClientKvkkConsentDtoToVm({ kvkkConsentStatus: 'None', kvkkConsentTemplateVersion: 3, kvkkConsentTemplateHash: hash }).kvkkConsent).toEqual(expect.objectContaining({ templateVersion: null, templateHash: null }));
        expect(mapClientKvkkConsentDtoToVm({ kvkkConsentStatus: 'Accepted', kvkkConsentTemplateVersion: -1 }).kvkkConsent.templateVersion).toBeNull();
    });

    it('gövde: tarih varsa gönderilir, boşsa sunucu bugünü kullanır; Yok iken tarih gönderilmez', () => {
        expect(mapClientKvkkConsentUpdateToApiBody({ status: 'Declined', recordedOn: '2026-10-01', rowVersion: 'rv' })).toEqual({
            status: 'Declined',
            recordedOn: '2026-10-01',
            rowVersion: 'rv'
        });
        expect(mapClientKvkkConsentUpdateToApiBody({ status: 'Accepted', recordedOn: '', rowVersion: 'rv' })).toEqual({ status: 'Accepted', rowVersion: 'rv' });
        expect(mapClientKvkkConsentUpdateToApiBody({ status: 'None', recordedOn: '2026-10-01', rowVersion: 'rv' })).toEqual({ status: 'None', rowVersion: 'rv' });
    });
});

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

        expect(mapCreateClientToApiBody(fromForm)).toEqual(expect.objectContaining({ fullName: 'Ali Veli', preferredContactChannel: 'None', remindersOptedOut: false }));

        const body = mapCreateClientToApiBody({ fullName: 'Ali Veli' });

        expect('preferredContactChannel' in body).toBe(false);
        expect('remindersOptedOut' in body).toBe(false);
    });
});
