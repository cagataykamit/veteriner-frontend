import type { ExaminationTemplateDto } from '@/app/features/examination-templates/models/examination-template.model';
import { templateApplySummary, templateContentSummary, templateHasText, templateInactiveLineNames } from './examination-template.utils';

const line = (productId: string, over: Partial<ExaminationTemplateDto['lines'][number]> = {}): ExaminationTemplateDto['lines'][number] => ({
    productId,
    productName: productId,
    unit: 'Adet',
    productKind: 'Medicine',
    productIsActive: true,
    quantity: 1,
    currentUnitPrice: 10,
    currency: 'TRY',
    ...over
});
const template = (over: Partial<ExaminationTemplateDto> = {}): ExaminationTemplateDto => ({
    id: 't1',
    name: 'Otitis paketi',
    visitReason: null,
    findings: null,
    plan: null,
    isActive: true,
    isSystem: false,
    lines: [],
    rowVersion: 'V1',
    ...over
});
const result = (over: object = {}) => ({ examinationId: 'e1', rowVersion: 'V2', updatedFields: [], administrations: [], services: [], ...over });

describe('examination-template.utils', () => {
    it('metin: boşluktan ibaret metin yok sayılır', () => {
        expect(templateHasText(template({ findings: '  ' }))).toBeFalse();
        expect(templateHasText(template({ plan: 'Kontrol: 7 gün' }))).toBeTrue();
    });

    it('içerik özeti ve pasif satırlar', () => {
        expect(templateContentSummary(template())).toBe('—');
        expect(templateContentSummary(template({ visitReason: 'Kaşıntı', lines: [line('a'), line('b')] }))).toBe('Metin + 2 satır');
        expect(templateInactiveLineNames(template({ lines: [line('a'), line('Damla', { productIsActive: false })] }))).toEqual(['Damla']);
    });

    it('uygulama özeti metin, stok ve hizmet sonucunu söyler', () => {
        const withText = template({ visitReason: 'Kaşıntı', lines: [line('a')] });
        expect(
            templateApplySummary(
                withText,
                result({
                    updatedFields: ['visitReason'],
                    administrations: [{}],
                    services: [
                        { productId: 's1', productName: 'Kulak temizliği', unit: 'Adet', quantity: 1, chargeSuggestionId: 'c1' },
                        { productId: 's2', productName: 'Bedelsiz kontrol', unit: 'Adet', quantity: 1, chargeSuggestionId: null }
                    ]
                }) as never
            )
        ).toBe('"Otitis paketi" uygulandı: metin eklendi, 1 ürün stoktan düştü, 2 hizmet yazıldı, 1 hizmet ücret bekliyor.');
        expect(templateApplySummary(withText, result() as never)).toBe('"Otitis paketi" uygulandı: metin muayenede zaten vardı.');
        expect(templateApplySummary(template(), result() as never)).toBe('"Otitis paketi" uygulandı.');
    });
});
