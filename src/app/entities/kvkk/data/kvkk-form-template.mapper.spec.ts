import { kvkkFormTemplateToPutBody, mapKvkkFormTemplateDtoToVm } from './kvkk-form-template.mapper';

describe('kvkk-form-template.mapper', () => {
    it('varsayılan yanıt: metin korunur, sürüm yok; sabit alanlar gelmezse sözleşme değerleri', () => {
        const vm = mapKvkkFormTemplateDtoToVm({ clinicId: 'k1', text: 'Satır 1\n  Satır 2', isDefault: true, rowVersion: null });

        expect(vm).toEqual({
            clinicId: 'k1',
            text: 'Satır 1\n  Satır 2',
            isDefault: true,
            rowVersion: null,
            updatedAtUtc: null,
            maxLength: 20000,
            placeholders: ['{{clinicName}}', '{{clientName}}', '{{date}}'],
            textVersion: null
        });
    });

    it('kayıtlı metin: sürüm ve güncellenme okunur', () => {
        const vm = mapKvkkFormTemplateDtoToVm({ clinicId: 'k1', text: 'X', isDefault: false, rowVersion: 'rv1', updatedAtUtc: '2026-10-15T08:00:00Z', maxLength: 500, placeholders: ['{{date}}'] });

        expect([vm.isDefault, vm.rowVersion, vm.updatedAtUtc, vm.maxLength, vm.placeholders]).toEqual([false, 'rv1', '2026-10-15T08:00:00Z', 500, ['{{date}}']]);
    });

    it('metin sürümü (ADR-032): 0 ve pozitif sayı korunur; geçersiz değer null', () => {
        expect(mapKvkkFormTemplateDtoToVm({ textVersion: 0 }).textVersion).toBe(0);
        expect(mapKvkkFormTemplateDtoToVm({ textVersion: 4 }).textVersion).toBe(4);
        expect(mapKvkkFormTemplateDtoToVm({ textVersion: 1.5 }).textVersion).toBeNull();
        expect(mapKvkkFormTemplateDtoToVm({ textVersion: -1 }).textVersion).toBeNull();
    });

    it('gövde: varsayılandan ilk kayıtta sürüm null, kayıt varken mevcut sürüm; metin kırpılır', () => {
        expect(kvkkFormTemplateToPutBody('  Metin  ', { isDefault: true, rowVersion: 'ignored' })).toEqual({ text: 'Metin', rowVersion: null });
        expect(kvkkFormTemplateToPutBody('Metin', { isDefault: false, rowVersion: 'rv1' })).toEqual({ text: 'Metin', rowVersion: 'rv1' });
    });
});
