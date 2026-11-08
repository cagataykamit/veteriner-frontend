import {
    MIGRATION_MEETING_DAY_LABELS,
    customDevelopmentPriorityLabel,
    customDevelopmentStatusLabel,
    customDevelopmentStatusSeverity,
    customDevelopmentTargetLabel,
    migrationSupportFeeLabel,
    migrationSupportSummary,
    parseFlagList,
    toFlagList
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

describe('geçiş desteği etiketleri (TIER-021)', () => {
    it('ücret metni pakete göre sunucudan gelen değerden; tutar yok', () => {
        expect(migrationSupportFeeLabel('Free')).toBe('Ücretsiz (paketinize dahil)');
        expect(migrationSupportFeeLabel('Quoted')).toBe('Ücretli; fiyat size bildirilecek');
        expect(customDevelopmentTargetLabel('Migration')).toBe('Geçiş desteği');
    });

    it('gün ve saat bayrakları sunucu biçimine çevrilir, sıra sabittir', () => {
        expect(toFlagList(['Thursday', 'Monday'], MIGRATION_MEETING_DAY_LABELS)).toBe('Monday, Thursday');
        expect(parseFlagList('Monday, Thursday, Bilinmeyen', MIGRATION_MEETING_DAY_LABELS)).toEqual(['Monday', 'Thursday']);
        expect(parseFlagList(null, MIGRATION_MEETING_DAY_LABELS)).toEqual([]);
    });

    it('talep özeti kayıt sayısı, gün, saat, süre ve ücreti içerir', () => {
        expect(
            migrationSupportSummary({ sourceProgram: 'EVet', recordVolume: 'Over10000', meetingDays: 'Tuesday', meetingTimes: 'Midday, Afternoon', fee: 'Free', meetingDurationMinutes: 60 })
        ).toBe('Yaklaşık kayıt: 10.000’den fazla · Uygun günler: Salı · Saat: 12.00 – 15.00, 15.00 – 18.00 · Görüşme 60 dk · Ücretsiz (paketinize dahil)');
    });
});
