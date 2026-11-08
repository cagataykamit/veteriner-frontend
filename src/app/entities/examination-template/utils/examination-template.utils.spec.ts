import type { ExaminationTemplateDto } from '@/app/entities/examination-template/models/examination-template.model';
import {
    templateApplyInitialChoices,
    templateApplyQuantityValid,
    templateApplyRequestLines,
    templateApplySummary,
    templateChargePreview,
    templateContentSummary,
    templateEstimatedChargeText,
    templateHasText,
    templateIncludedLines,
    templateInactiveLineNames
} from './examination-template.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

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
const result = (over: object = {}) => ({
    examinationId: 'e1',
    rowVersion: 'V2',
    updatedFields: [],
    text: { visitReason: 'NotInTemplate', findingsLinesAdded: 0, planLinesAdded: 0 },
    pendingChargeCount: 0,
    administrations: [],
    services: [],
    ...over
});

describe('examination-template.utils', () => {
    it('metin: boşluktan ibaret metin yok sayılır', () => {
        expect(templateHasText(template({ findings: '  ' }))).toBe(false);
        expect(templateHasText(template({ plan: 'Kontrol: 7 gün' }))).toBe(true);
    });

    it('içerik özeti ve pasif satırlar', () => {
        expect(templateContentSummary(template())).toBe('—');
        expect(templateContentSummary(template({ visitReason: 'Kaşıntı', lines: [line('a'), line('b')] }))).toBe('Metin + 2 satır');
        expect(templateInactiveLineNames(template({ lines: [line('a'), line('Damla', { productIsActive: false })] }))).toEqual(['Damla']);
    });

    it('uygulama özeti bölüm bazında neyin eklendiğini, atlandığını ve kaç kalem doğduğunu söyler', () => {
        const withText = template({ visitReason: 'Kaşıntı', findings: 'Otoskopi:\nTimpan:', plan: 'Damla 7 gün', lines: [line('a')] });

        expect(
            templateApplySummary(
                withText,
                result({
                    updatedFields: ['findings', 'plan'],
                    text: { visitReason: 'SkippedExisting', findingsLinesAdded: 2, planLinesAdded: 1 },
                    pendingChargeCount: 2,
                    administrations: [{}],
                    services: [
                        { productId: 's1', productName: 'Kulak temizliği', unit: 'Adet', quantity: 1, chargeSuggestionId: 'c1' },
                        { productId: 's2', productName: 'Bedelsiz kontrol', unit: 'Adet', quantity: 1, chargeSuggestionId: null }
                    ]
                }) as never
            )
        ).toBe(
            '"Otitis paketi" uygulandı: şikâyet dolu olduğu için şablonun şikâyeti eklenmedi, bulguya 2 satır eklendi, plana 1 satır eklendi, 1 ürün stoktan düştü, 2 hizmet yazıldı, 2 ücret bekleyen kalem.'
        );
        expect(templateApplySummary(withText, result({ updatedFields: ['visitReason'], text: { visitReason: 'Filled', findingsLinesAdded: 0, planLinesAdded: 0 } }) as never)).toBe(
            '"Otitis paketi" uygulandı: şikâyet dolduruldu, bulgu metni muayenede zaten vardı, plan metni muayenede zaten vardı.'
        );
        expect(templateApplySummary(template(), result() as never)).toBe('"Otitis paketi" uygulandı.');
    });

    it('önizleme toplamı: paket fiyatı doluysa tahsil edilen paket fiyatı, değilse satır toplamı (EXAM-007)', () => {
        const lines = [line('a', { quantity: 2, currentUnitPrice: 90 }), line('b', { currentUnitPrice: 200 })];

        expect(templateChargePreview(template({ lines }))).toEqual({ total: 380, linesTotal: 380, isPackage: false });
        expect(templateChargePreview(template({ lines, packagePrice: 300 }))).toEqual({ total: 300, linesTotal: 380, isPackage: true });
    });

    it('gelişteki tahmini ücret: paket fiyatı, yoksa kalem toplamı "tahmini"; bilinmiyorsa hiçbir şey (CHECKIN-004)', () => {
        const lines = [line('a', { quantity: 2, currentUnitPrice: 90 }), line('b', { currentUnitPrice: 200 })];

        expect(templateEstimatedChargeText(template({ lines, packagePrice: 300 }))).toBe(`Tahmini ücret: ${formatMoney(300)} (paket fiyatı)`);
        expect(templateEstimatedChargeText(template({ packagePrice: 0 }))).toBe(`Tahmini ücret: ${formatMoney(0)} (paket fiyatı)`);
        expect(templateEstimatedChargeText(template({ lines }))).toBe(`Tahmini ücret: ${formatMoney(380)} (kalem fiyatları toplamı, tahmini)`);
        expect(templateEstimatedChargeText(template({ lines: [line('c', { currentUnitPrice: 0 })] }))).toBeNull();
        expect(templateEstimatedChargeText(template())).toBeNull();
    });

    it('paket uygulama özeti paket ücretini söyler', () => {
        const summary = templateApplySummary(template({ packagePrice: 300 }), result({ packageChargeSuggestionId: 's1', administrations: [{}] }) as never);

        expect(summary).toContain('paket ücreti');
        expect(summary).toContain('satırlar pakete dahil');
    });
});

describe('şablon uygulamada satır seçimi (EXAM-013)', () => {
    const t = template({ lines: [line('a', { quantity: 1 }), line('b', { quantity: 2 })] });

    it('başlangıçta seçim şablonla aynıdır ve satır listesi gönderilmez', () => {
        const choices = templateApplyInitialChoices(t);

        expect(choices).toEqual({ a: { included: true, quantity: 1 }, b: { included: true, quantity: 2 } });
        expect(templateApplyRequestLines(t, choices)).toBeUndefined();
    });

    it('hariç satır ve değişen miktar listeye yansır; sıra şablondaki sıradır', () => {
        const choices = { a: { included: true, quantity: 3 }, b: { included: false, quantity: 2 } };

        expect(templateIncludedLines(t, choices).map((l) => [l.productId, l.quantity])).toEqual([['a', 3]]);
        expect(templateApplyRequestLines(t, choices)).toEqual([{ productId: 'a', quantity: 3 }]);
        expect(templateApplyRequestLines(t, { a: { included: false, quantity: 1 }, b: { included: false, quantity: 2 } })).toEqual([]);
    });

    it('miktar kuralı şablon satırıyla aynı', () => {
        expect(templateApplyQuantityValid(0.5)).toBe(true);
        expect(templateApplyQuantityValid(1.234)).toBe(true);
        expect(templateApplyQuantityValid(null)).toBe(false);
        expect(templateApplyQuantityValid(0)).toBe(false);
        expect(templateApplyQuantityValid(1.2345)).toBe(false);
        expect(templateApplyQuantityValid(100001)).toBe(false);
    });
});