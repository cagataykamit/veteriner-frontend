import {
    customDevelopmentPriorityLabel,
    customDevelopmentStatusLabel,
    customDevelopmentStatusSeverity,
    customDevelopmentTargetLabel
} from './custom-development-labels.utils';

describe('custom-development-labels.utils', () => {
    it('durum, konu ve öncelik Türkçe adla; bilinmeyen değer kendi koduyla görünür', () => {
        expect(customDevelopmentStatusLabel('OutOfScope')).toBe('Kapsam dışı');
        expect(customDevelopmentStatusLabel('Archived')).toBe('Archived');
        expect(customDevelopmentTargetLabel('Output')).toBe('Çıktı');
        expect(customDevelopmentPriorityLabel('High')).toBe('Yüksek');
    });

    it('kapsam dışı ve tamamlanan talep ayrı renkte', () => {
        expect(customDevelopmentStatusSeverity('OutOfScope')).toBe('danger');
        expect(customDevelopmentStatusSeverity('Completed')).toBe('success');
        expect(customDevelopmentStatusSeverity('Archived')).toBe('secondary');
    });
});
