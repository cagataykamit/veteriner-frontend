import { HttpParams } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import type { PerformancePeriodDto, PerformanceSummaryDto } from '@/app/features/reports/performance/models/performance-summary.model';
import { PerformancePageComponent } from './performance-page.component';

const amounts = (net: number, count = 1) => ({ collectedAmount: net, collectedCount: count, voidedAmount: 0, voidedCount: 0, netAmount: net, salesCollectedAmount: 0 });

const charges = (net: number) => ({
    grossChargeAmount: net,
    grossChargeCount: 2,
    salesChargeAmount: 0,
    voidedChargeAmount: 0,
    voidedChargeCount: 0,
    netChargeAmount: net,
    collectedAmount: 0,
    collectedCount: 0,
    salesCollectedAmount: 0,
    voidedCollectionAmount: 0,
    voidedCollectionCount: 0,
    netCollectedAmount: 0,
    correctionCount: 0
});

const period = (from: string, to: string, ciro: number, cash: number): PerformancePeriodDto => ({
    from,
    to,
    charges: charges(ciro),
    cash: {
        totals: amounts(cash, 3),
        byMethod: [
            { paymentMethod: 'Cash', ...amounts(cash) },
            { paymentMethod: 'Card', ...amounts(0, 0) },
            { paymentMethod: 'Transfer', ...amounts(0, 0) }
        ],
        byDay: [{ date: from, ...amounts(cash), cashNetAmount: cash, cardNetAmount: 0, transferNetAmount: 0 }],
        byUser: [{ userId: 'u1', userName: 'Ayşe Hekim', ...amounts(cash, 3) }]
    },
    examinationCount: 4,
    vaccinations: { applied: 2, scheduled: 1 },
    appointments: { scheduled: 1, completed: 6, cancelled: 2, noShow: 1 }
});

const SUMMARY: PerformanceSummaryDto = {
    currency: 'TRY',
    current: period('2026-10-01', '2026-10-28', 1500, 600),
    previous: period('2026-09-03', '2026-09-30', 1000, 600),
    outstanding: { totalOutstandingAmount: 900, clientCount: 3 }
};

describe('PerformancePageComponent', () => {
    let fixture: ComponentFixture<PerformancePageComponent>;
    let el: HTMLElement;
    let get: ReturnType<typeof vi.fn>;

    async function create(summary: PerformanceSummaryDto): Promise<void> {
        get = vi.fn().mockReturnValue(of(summary));
        await TestBed.configureTestingModule({
            imports: [PerformancePageComponent],
            providers: [provideRouter([]), { provide: ApiClient, useValue: { get } }]
        }).compileComponents();
        fixture = TestBed.createComponent(PerformancePageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const text = (testId: string) => el.querySelector(`[data-testid="${testId}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    afterEach(() => fixture?.destroy());

    it('varsayılan bu ay ve karşılaştırma açık; ciro farkı ve ayrıntı raporu bağlantısı', async () => {
        await create(SUMMARY);

        const params = get.mock.calls[0][1] as HttpParams;

        expect(params.get('compare')).toBe('true');
        expect(params.get('from')?.endsWith('-01')).toBe(true);
        expect(text('perf-kpi-charges')).toContain('Ciro (net ücret)');
        expect(text('perf-kpi-charges')).toContain('+₺500,00 (%50) önceki döneme göre');
        expect(text('perf-kpi-cash')).toContain('₺0,00 (%0) önceki döneme göre');
        expect(el.querySelector('[data-testid="perf-kpi-charges"]')?.getAttribute('href')).toBe('/panel/reports/end-of-day');
        expect(text('perf-kpi-outstanding')).toContain('3 müşteri');
        expect(text('perf-collection-ratio')).toContain('%40');
        expect(text('perf-previous-period')).toContain('2026-09-03 – 2026-09-30');
        expect(text('perf-appointments')).toContain('Gelmedi');
        expect(text('perf-appointments')).toContain('1 (%10)');
        expect(text('perf-users')).toContain('Ayşe Hekim');
        expect(text('perf-methods')).toContain('Nakit');
    });

    it('izni olmayan bölümler çizilmez', async () => {
        await create({
            currency: 'TRY',
            current: { ...SUMMARY.current, charges: null, examinationCount: null, vaccinations: null, appointments: null },
            previous: null,
            outstanding: null
        });

        expect(el.querySelector('[data-testid="perf-kpi-charges"]')).toBeNull();
        expect(el.querySelector('[data-testid="perf-kpi-outstanding"]')).toBeNull();
        expect(el.querySelector('[data-testid="perf-kpi-examinations"]')).toBeNull();
        expect(el.querySelector('[data-testid="perf-appointments"]')).toBeNull();
        expect(el.querySelector('[data-testid="perf-collection-ratio"]')).toBeNull();
        expect(text('perf-kpi-cash')).toContain('Net tahsilat');
        expect(text('perf-kpi-cash')).not.toContain('önceki döneme göre');
    });
});
