import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { formatMinutes, formatRate, type TrialActivationMetricsDto } from '@/app/features/trial-metrics/models/trial-metrics.model';
import { TrialMetricsService } from '@/app/features/trial-metrics/services/trial-metrics.service';
import { TrialMetricsPageComponent } from './trial-metrics-page.component';

const METRICS: TrialActivationMetricsDto = {
    fromUtc: '2026-09-25T00:00:00Z',
    toUtc: '2026-10-25T00:00:00Z',
    trialStarts: 40,
    exampleClinic: { count: 28, rate: 0.7 },
    activation: { count: 25, rate: 0.625, within10MinutesCount: 12, within10MinutesRate: 0.3, medianMinutesToFirstAction: 7.5 },
    conversion: { count: 3, rate: 0.075 },
    firstActionBreakdown: [
        { kind: 'ClientCreated', count: 10 },
        { kind: 'AppointmentCreated', count: 8 },
        { kind: 'BilinmeyenTur', count: 7 }
    ],
    byOnboarding: [
        { onboarding: 'ExampleClinic', trialStarts: 28, activationRate: 0.75, within10MinutesRate: 0.39, conversionRate: 0.11 },
        { onboarding: 'EmptyClinic', trialStarts: 12, activationRate: 0.33, within10MinutesRate: 0.08, conversionRate: 0 }
    ]
};

const EMPTY: TrialActivationMetricsDto = {
    ...METRICS,
    trialStarts: 0,
    exampleClinic: { count: 0, rate: null },
    activation: { count: 0, rate: null, within10MinutesCount: 0, within10MinutesRate: null, medianMinutesToFirstAction: null },
    conversion: { count: 0, rate: null },
    firstActionBreakdown: [],
    byOnboarding: [
        { onboarding: 'ExampleClinic', trialStarts: 0, activationRate: null, within10MinutesRate: null, conversionRate: null },
        { onboarding: 'EmptyClinic', trialStarts: 0, activationRate: null, within10MinutesRate: null, conversionRate: null }
    ]
};

describe('Deneme ölçümleri sayfası (TRIAL-008)', () => {
    let service: jasmine.SpyObj<TrialMetricsService>;
    let fixture: ComponentFixture<TrialMetricsPageComponent>;

    const text = (selector: string): string => (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim() ?? '';
    const all = (selector: string): HTMLElement[] => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(selector));

    const create = async (): Promise<void> => {
        TestBed.configureTestingModule({
            imports: [TrialMetricsPageComponent],
            providers: [provideRouter([]), { provide: TrialMetricsService, useValue: service }]
        });
        fixture = TestBed.createComponent(TrialMetricsPageComponent);
        await fixture.whenStable();
    };

    beforeEach(() => {
        service = jasmine.createSpyObj<TrialMetricsService>('TrialMetricsService', ['summary']);
        service.summary.and.returnValue(of(METRICS));
    });

    it('biçimleyiciler: oran yüzde, dakika "dk", payda yoksa tire', () => {
        expect(formatRate(0.625)).toBe('%62,5');
        expect(formatRate(null)).toBe('—');
        expect(formatMinutes(7.5)).toBe('7,5 dk');
        expect(formatMinutes(null)).toBe('—');
    });

    it('varsayılan dönem 30 gün ile yükler, kartları ve tabloları gösterir', async () => {
        await create();

        expect(service.summary).toHaveBeenCalledTimes(1);
        const [fromUtc, toUtc] = service.summary.calls.mostRecent().args;

        expect(Math.round((new Date(toUtc).getTime() - new Date(fromUtc).getTime()) / 86_400_000)).toBe(30);

        expect(text('[data-testid="tm-period-text"]')).toContain('40');
        expect(text('[data-testid="tm-card-starts"] [data-testid="tm-card-value"]')).toBe('40');
        expect(text('[data-testid="tm-card-example"] [data-testid="tm-card-value"]')).toBe('%70');
        expect(text('[data-testid="tm-card-activation"] [data-testid="tm-card-value"]')).toBe('%62,5');
        expect(text('[data-testid="tm-card-quick"] [data-testid="tm-card-value"]')).toBe('%30');
        expect(text('[data-testid="tm-card-median"] [data-testid="tm-card-value"]')).toBe('7,5 dk');
        expect(text('[data-testid="tm-card-conversion"] [data-testid="tm-card-value"]')).toBe('%7,5');

        const onboarding = all('[data-testid="tm-onboarding-row"]');

        expect(onboarding.length).toBe(2);
        expect(onboarding[0].textContent).toContain('Örnek klinikle başlayan');
        expect(onboarding[0].textContent).toContain('%75');
        expect(onboarding[1].textContent).toContain('%0');

        const breakdown = all('[data-testid="tm-breakdown-row"]');

        expect(breakdown.length).toBe(3);
        expect(breakdown[0].textContent).toContain('Müşteri ekleme');
        expect(breakdown[0].textContent).toContain('%40', 'aktive olanlar (25) içinde pay');
        expect(breakdown[2].textContent).toContain('BilinmeyenTur', 'bilinmeyen tür ham adıyla gösterilir');
    });

    it('dönem değişince yeniden yükler; aynı dönem tekrar istek atmaz', async () => {
        await create();

        fixture.componentInstance.selectPeriod(30);
        expect(service.summary).toHaveBeenCalledTimes(1);

        fixture.componentInstance.selectPeriod(7);
        await fixture.whenStable();
        expect(service.summary).toHaveBeenCalledTimes(2);
        const [fromUtc, toUtc] = service.summary.calls.mostRecent().args;

        expect(Math.round((new Date(toUtc).getTime() - new Date(fromUtc).getTime()) / 86_400_000)).toBe(7);
        expect(text('[data-testid="tm-period-text"]')).toContain('son 7 gün');
    });

    it('boş kohortta oranları tire gösterir ve dağılım boş mesajı verir', async () => {
        service.summary.and.returnValue(of(EMPTY));

        await create();

        expect(text('[data-testid="tm-card-activation"] [data-testid="tm-card-value"]')).toBe('—');
        expect(text('[data-testid="tm-card-median"] [data-testid="tm-card-value"]')).toBe('—');
        expect(text('[data-testid="tm-breakdown-empty"]')).toContain('aktive olan klinik yok');
        expect(text('[data-testid="tm-period-text"]')).toContain('deneme başlatan klinik yok');
    });

    it('servis hatasında hata durumu ve yeniden dene gösterir', async () => {
        service.summary.and.returnValue(throwError(() => new Error('Dönem geçersiz: başlangıç bitişten önce ve aralık en çok 366 gün olmalı.')));

        await create();

        expect(fixture.componentInstance.error()).toContain('Dönem geçersiz');
        expect(text('app-error-state')).toContain('Dönem geçersiz');
    });
});
