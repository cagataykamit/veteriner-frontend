import { appointmentRates, collectionToChargeRatio, formatPercent, performanceDelta, performancePresetRange } from '@/app/features/reports/performance/utils/performance.utils';

describe('performance.utils', () => {
    const today = new Date(2026, 9, 28);

    it('hazır dönemler yerel takvimle, ikisi dahil', () => {
        expect(performancePresetRange('thisMonth', today)).toEqual({ from: '2026-10-01', to: '2026-10-28' });
        expect(performancePresetRange('lastMonth', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
        expect(performancePresetRange('last30', today)).toEqual({ from: '2026-09-29', to: '2026-10-28' });
        expect(performancePresetRange('thisYear', today)).toEqual({ from: '2026-01-01', to: '2026-10-28' });
        expect(performancePresetRange('custom', today)).toBeNull();
        expect(performancePresetRange('lastMonth', new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    });

    it('fark: yön ve yüzde; önceki 0 ya da yoksa yüzde/fark yok', () => {
        expect(performanceDelta(150, 100)).toEqual({ diff: 50, percent: 50, direction: 'up' });
        expect(performanceDelta(50, 100)).toEqual({ diff: -50, percent: -50, direction: 'down' });
        expect(performanceDelta(10, 0)).toEqual({ diff: 10, percent: null, direction: 'up' });
        expect(performanceDelta(0, 0)?.direction).toBe('flat');
        expect(performanceDelta(10, null)).toBeNull();
    });

    it('tahsilat / ciro ve randevu oranları', () => {
        expect(collectionToChargeRatio(300, 750)).toBe(40);
        expect(collectionToChargeRatio(300, 0)).toBeNull();
        expect(appointmentRates({ scheduled: 2, completed: 5, cancelled: 2, noShow: 1 })).toEqual({ total: 10, noShowRate: 10, cancelRate: 20 });
        expect(appointmentRates({ scheduled: 0, completed: 0, cancelled: 0, noShow: 0 }).noShowRate).toBeNull();
        expect(formatPercent(12.345)).toBe('%12,3');
        expect(formatPercent(null)).toBe('—');
    });
});
