import {
    ADMINISTRATIONS_READ_CLAIM,
    APPOINTMENTS_READ_CLAIM,
    CASH_REGISTERS_READ_CLAIM,
    CHARGES_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    PAYMENTS_READ_CLAIM,
    PRESCRIPTIONS_READ_CLAIM,
    PRODUCTS_READ_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM,
    VISITS_CORRECT_CLAIM,
    VISITS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { REPORT_SECTIONS } from '@/app/core/routing/panel-navigation';
import type { ReportHubSummaryDto } from '@/app/features/reports/hub/models/report-hub-summary.model';
import { attentionRows, formatHubMoney, reportMatches, visibleQuestions, visibleReports } from './report-hub.rules';

const ALL = [
    ADMINISTRATIONS_READ_CLAIM,
    APPOINTMENTS_READ_CLAIM,
    CASH_REGISTERS_READ_CLAIM,
    CHARGES_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    PAYMENTS_READ_CLAIM,
    PRESCRIPTIONS_READ_CLAIM,
    PRODUCTS_READ_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM,
    VISITS_CORRECT_CLAIM,
    VISITS_READ_CLAIM
];

const has = (claims: readonly string[]) => (c: string) => claims.includes(c);
const points = (...values: number[]) => values.map((value, i) => ({ from: `2026-11-${16 + i}`, to: `2026-11-${16 + i}`, value }));

function summary(overrides: Partial<ReportHubSummaryDto> = {}): ReportHubSummaryDto {
    return {
        period: 'week',
        clinicId: 'c1',
        currency: 'TRY',
        generatedAtUtc: '2026-11-20T09:30:00Z',
        window: { from: '2026-11-16', to: '2026-11-20', previousFrom: '2026-11-09', previousTo: '2026-11-13' },
        todayCash: { netCollectedAmount: 18450, collectedCount: 24, last7Days: points(16, 21, 18, 24, 19, 22, 18), mainRegisterBalance: 6120 },
        turnover: { netChargeAmount: 118600, previousNetChargeAmount: 111900, series: points(61, 58, 66, 64, 70) },
        collections: {
            netAmount: 100,
            collectedCount: 141,
            byMethod: [
                { paymentMethod: 'Cash', netAmount: 31 },
                { paymentMethod: 'Card', netAmount: 62 },
                { paymentMethod: 'Transfer', netAmount: 7 }
            ]
        },
        outstanding: { totalOutstandingAmount: 48900, clientCount: 27, maxClientOutstandingAmount: 6200 },
        appointments: { totalCount: 86, noShowCount: 7, statusCounts: { scheduled: 20, completed: 55, cancelled: 4, noShow: 7 }, series: points(11, 14, 13, 16, 12) },
        examinations: { count: 64, series: points(8, 10, 9, 12, 11) },
        vaccinations: { appliedCount: 41, upcomingCount: 23 },
        attention: {
            hbsNotEnteredPrescriptions: { count: 12, oldestAtUtc: '2026-11-11T08:00:00Z' },
            hbsNotEnteredVaccinations: { count: 5, oldestAtUtc: '2026-11-19T08:00:00Z' },
            endOfDayUnchargedVisitCount: 3,
            overdueVaccinationCount: 0,
            lowStockProductCount: 2
        },
        ...overrides
    };
}

const subText = (q: { figure: { when: string | null; parts: readonly { text: string }[] } | null }) => (q.figure?.when ? `${q.figure.when} · ` : '') + (q.figure?.parts.map((p) => p.text).join('') ?? '');

describe('report-hub.rules (ADR-052, tasarım B)', () => {
    it('17 raporun her biri bir soruya bağlı; tam yetkide sekiz kart taslak sırasıyla', () => {
        const questions = visibleQuestions(visibleReports(has(ALL)), null, 'week');

        expect(questions.map((q) => q.id)).toEqual(['cash', 'period', 'collections', 'outstanding', 'appointments', 'clinical', 'hbs', 'registers']);
        expect(new Set(questions.flatMap((q) => q.reports.map((r) => r.route)))).toEqual(new Set(REPORT_SECTIONS.flatMap((s) => s.entries.map((e) => e.route))));
    });

    it('kart bağlandığı raporun izniyle görünür; raporu açılamayan kart çizilmez', () => {
        const questions = visibleQuestions(visibleReports(has([PAYMENTS_READ_CLAIM])), summary(), 'week');

        expect(questions.map((q) => q.id)).toEqual(['cash', 'collections']);
        expect(questions[0].reports.map((r) => r.label)).toEqual(['Gün sonu']);
    });

    it('kart sayıları ve alt satırları taslaktaki gibi biçimlenir', () => {
        const byId = Object.fromEntries(visibleQuestions(visibleReports(has(ALL)), summary(), 'week').map((q) => [q.id, q]));

        expect(byId['cash'].figure?.value).toBe(formatHubMoney(18450));
        expect(subText(byId['cash'])).toBe(`bugün · 3 iş ücreti kapanmadı · Ana kasa ${formatHubMoney(6120)}`);
        expect(byId['cash'].figure?.spark).toHaveLength(7);
        expect(subText(byId['period'])).toBe('bu hafta · +%6 geçen haftaya göre');
        expect(byId['collections'].figure?.split).toEqual([
            { label: 'Kart', percent: 62 },
            { label: 'Nakit', percent: 31 },
            { label: 'Havale', percent: 7 }
        ]);
        expect(subText(byId['outstanding'])).toBe(`şu an · 27 müşteri · en yüksek ${formatHubMoney(6200)}`);
        expect(subText(byId['appointments'])).toBe('bu hafta · 7 Gelmedi (%8)');
        expect(subText(byId['clinical'])).toBe('bu hafta · 41 aşı uygulandı · 23 planlı');
        expect(byId['hbs'].figure?.value).toBe('17');
        expect(subText(byId['hbs'])).toBe('şu an · 12 reçete · 5 aşı');
        expect(byId['registers'].figure?.value).toBe('6');
    });

    it('önceki dönem 0 ise fark yazılmaz; özet yoksa sayılı kartlar yalnız bağlantılarla kalır', () => {
        const flat = summary({ turnover: { netChargeAmount: 500, previousNetChargeAmount: 0, series: [] } });
        const period = visibleQuestions(visibleReports(has(ALL)), flat, 'today').find((q) => q.id === 'period')!;

        expect(subText(period)).toBe('bugün · ');
        expect(
            visibleQuestions(visibleReports(has(ALL)), null, 'week')
                .filter((q) => q.figure)
                .map((q) => q.id)
        ).toEqual(['registers']);
    });

    it('uyarı sayısı sıfırsa ya da bağlandığı sayfanın izni yoksa satır çizilmez', () => {
        const now = new Date('2026-11-20T12:00:00');

        expect(attentionRows(summary(), has(ALL), now).map((r) => [r.key, r.count])).toEqual([
            ['hbsPrescriptions', 12],
            ['hbsVaccinations', 5],
            ['endOfDay', 3],
            ['lowStock', 2]
        ]);
        expect(attentionRows(summary(), has(ALL), now)[0].hint).toBe('En eskisi 9 gün önce · HBS takibi — reçeteler');
        // Sayaç sunucuda son 1 takvim ayı ile sınırlı (VaccinationDueRule); metin bunu söyler.
        expect(attentionRows(summary({ attention: { ...summary().attention, overdueVaccinationCount: 4 } }), has(ALL), now).find((r) => r.key === 'overdueVaccinations')?.text).toBe(
            '4 aşının zamanı son 1 ayda geçti'
        );
        expect(attentionRows(summary(), has([PRESCRIPTIONS_READ_CLAIM]), now).map((r) => r.key)).toEqual(['hbsPrescriptions']);
        expect(attentionRows(null, has(ALL), now)).toEqual([]);

        const low = attentionRows(summary(), has([PRODUCTS_READ_CLAIM]), now)[0];

        expect([low.route, low.queryParams]).toEqual(['/panel/stocks', { isBelowMinimum: 'true' }]);
    });

    it('arama Türkçe harf farkını yok sayar ve anahtar kelimeye bakar', () => {
        const reports = visibleReports(has(ALL));
        const hits = (q: string) => reports.filter((r) => reportMatches(r, q)).map((r) => r.label);

        expect(hits('narkotik')).toEqual(['Narkotik ve Psikotropik Defteri']);
        expect(hits('borc')).toEqual(['Borç Raporu']);
        expect(hits('   ')).toEqual([]);
    });
});
