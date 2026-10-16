import {
    fillKvkkFormTemplate,
    kvkkFormDate,
    kvkkFormPlaceholderHint,
    kvkkTextVersionLabel,
    KVKK_FORM_PLACEHOLDERS,
    KVKK_TEMPLATE_KINDS,
    parseKvkkTemplateKind,
    parseKvkkTextVersion
} from './kvkk-form.utils';

const values = { clinicName: 'Pati Kliniği', clientName: 'Ali Veli', date: '15.10.2026' };

describe('kvkk-form.utils', () => {
    it('yer tutucuları her geçtiği yerde doldurur; satır sonlarını korur', () => {
        const text = '{{clinicName}} olarak\n{{clientName}} için {{date}} tarihli form.\n{{clientName}}';

        expect(fillKvkkFormTemplate(text, values)).toBe('Pati Kliniği olarak\nAli Veli için 15.10.2026 tarihli form.\nAli Veli');
    });

    it('büyük/küçük harf duyarlı; tanınmayan veya boşluklu yer tutucu olduğu gibi kalır', () => {
        expect(fillKvkkFormTemplate('{{ClinicName}} {{ clientName }} {{petName}} {date}', values)).toBe('{{ClinicName}} {{ clientName }} {{petName}} {date}');
    });

    it('doldurulan değerdeki yer tutucu yeniden işlenmez', () => {
        expect(fillKvkkFormTemplate('{{clientName}} / {{date}}', { ...values, clientName: '{{date}}' })).toBe('{{date}} / 15.10.2026');
    });

    it('form tarihi İstanbul günü gg.aa.yyyy; her sabit yer tutucunun açıklaması var', () => {
        expect(kvkkFormDate(new Date('2026-10-14T22:30:00Z'))).toBe('15.10.2026');
        expect(KVKK_FORM_PLACEHOLDERS.every((p) => kvkkFormPlaceholderHint(p).length > 0)).toBeTrue();
        expect(kvkkFormPlaceholderHint('{{x}}')).toBe('');
    });

    it('metin sürümü etiketi (ADR-032): null bilinmiyor, 0 varsayılan metin, diğerleri numara; ayrıştırma geçersizi null yapar', () => {
        expect([kvkkTextVersionLabel(null), kvkkTextVersionLabel(0), kvkkTextVersionLabel(3)]).toEqual(['Bilinmiyor', 'Varsayılan metin', '3']);
        expect([parseKvkkTextVersion(2), parseKvkkTextVersion(0), parseKvkkTextVersion('2'), parseKvkkTextVersion(-1), parseKvkkTextVersion(undefined)]).toEqual([2, 0, null, null, null]);
    });

    it('tür: yalnız açık rıza kutu/imza bloğu basar; bilinmeyen tür açık rıza sayılır', () => {
        expect([KVKK_TEMPLATE_KINDS.consent.printsConsentBlock, KVKK_TEMPLATE_KINDS.disclosure.printsConsentBlock]).toEqual([true, false]);
        expect([parseKvkkTemplateKind('disclosure'), parseKvkkTemplateKind(null), parseKvkkTemplateKind('Disclosure'), parseKvkkTemplateKind('x')]).toEqual([
            'disclosure',
            'consent',
            'consent',
            'consent'
        ]);
    });
});
