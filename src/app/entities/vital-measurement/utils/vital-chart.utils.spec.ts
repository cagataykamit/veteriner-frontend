import { niceTicks, timeTicks } from '@/app/entities/vital-measurement/utils/vital-chart.utils';

describe('vital grafik yardımcıları', () => {
    it('değer çizgileri yuvarlak adımlıdır ve veriyi kapsar', () => {
        expect(niceTicks(38.5, 39.8)).toEqual([38.5, 39, 39.5, 40]);
        expect(niceTicks(96, 132)).toEqual([80, 100, 120, 140]);
        expect(niceTicks(12.3, 12.6)).toEqual([12.3, 12.4, 12.5, 12.6]);
    });

    it('tek değer için çizgiler değerin iki yanına açılır', () => {
        const ticks = niceTicks(38.6, 38.6);

        expect(ticks[0]).toBeLessThan(38.6);
        expect(ticks[ticks.length - 1]).toBeGreaterThan(38.6);
    });

    it('birkaç günlük aralıkta işaretler İstanbul gün başlarıdır', () => {
        // 18.11 09:00 – 20.11 14:20 (İstanbul) = 06:00Z – 11:20Z
        const ticks = timeTicks(Date.parse('2026-11-18T06:00:00Z'), Date.parse('2026-11-20T11:20:00Z'));

        expect(ticks).toEqual([
            { time: Date.parse('2026-11-18T21:00:00Z'), label: '19 Kas' },
            { time: Date.parse('2026-11-19T21:00:00Z'), label: '20 Kas' }
        ]);
    });

    it('bir günden kısa aralıkta saat, uzun aralıkta ay başı gösterir; yıl ocakta yazılır', () => {
        const hours = timeTicks(Date.parse('2026-11-20T06:10:00Z'), Date.parse('2026-11-20T09:30:00Z'));

        expect(hours.map((t) => t.label)).toEqual(['10:00', '11:00', '12:00']);

        const months = timeTicks(Date.parse('2025-12-02T07:30:00Z'), Date.parse('2026-11-20T11:20:00Z'));

        expect(months.map((t) => t.label)).toEqual(['Oca 2026', 'Nis', 'Tem', 'Eki']);
        expect(months[0].time).toBe(Date.parse('2025-12-31T21:00:00Z'));
    });
});
