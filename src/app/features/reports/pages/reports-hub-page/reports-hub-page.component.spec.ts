import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { APPOINTMENTS_READ_CLAIM, PAYMENTS_READ_CLAIM, PRESCRIPTIONS_READ_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ReportHubSummaryDto } from '@/app/features/reports/hub/models/report-hub-summary.model';
import { ReportHubSummaryService } from '@/app/features/reports/hub/services/report-hub-summary.service';
import { ReportPreferencesService } from '@/app/entities/report-preference/services/report-preferences.service';
import { ReportsHubPageComponent } from './reports-hub-page.component';

function hubSummary(attention: Partial<ReportHubSummaryDto['attention']> = {}): ReportHubSummaryDto {
    return {
        period: 'week',
        clinicId: 'c1',
        currency: 'TRY',
        generatedAtUtc: '2026-11-20T09:30:00Z',
        window: { from: '2026-11-16', to: '2026-11-20', previousFrom: '2026-11-09', previousTo: '2026-11-13' },
        todayCash: { netCollectedAmount: 300, collectedCount: 1, last7Days: [], mainRegisterBalance: null },
        turnover: null,
        collections: { netAmount: 300, collectedCount: 1, byMethod: [{ paymentMethod: 'Card', netAmount: 300 }] },
        outstanding: null,
        appointments: { totalCount: 4, noShowCount: 1, statusCounts: { scheduled: 1, completed: 2, cancelled: 0, noShow: 1 }, series: [] },
        examinations: null,
        vaccinations: null,
        attention: {
            hbsNotEnteredPrescriptions: null,
            hbsNotEnteredVaccinations: null,
            endOfDayUnchargedVisitCount: null,
            overdueVaccinationCount: null,
            lowStockProductCount: null,
            overdueAppointmentCount: null,
            ...attention
        }
    };
}

describe('ReportsHubPageComponent — tasarım B (ADR-052) ve favoriler (REPORT-003)', () => {
    let preferences: MockedObject<ReportPreferencesService>;
    let summaryService: { get: ReturnType<typeof vi.fn> };
    let claims: Set<string>;

    function render(favoriteKeys: string[] = []) {
        preferences.listFavoriteKeys.mockReturnValue(of(favoriteKeys));
        const fixture = TestBed.createComponent(ReportsHubPageComponent);

        fixture.detectChanges();

        return fixture;
    }

    const el = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;
    const favoriteLabels = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-testid="favorite-link"]')).map((n) => n.textContent?.trim());
    const starFor = (root: HTMLElement, label: string) => Array.from(root.querySelectorAll<HTMLButtonElement>('[data-testid="favorite-toggle"]')).find((b) => b.getAttribute('aria-label')?.endsWith(label))!;
    const questionIds = (root: HTMLElement) => Array.from(root.querySelectorAll('section[data-testid^="question-"]')).map((n) => n.getAttribute('data-testid'));

    beforeEach(() => {
        claims = new Set([PAYMENTS_READ_CLAIM, APPOINTMENTS_READ_CLAIM]);
        preferences = {
            listFavoriteKeys: vi.fn().mockName('listFavoriteKeys'),
            addFavorite: vi.fn().mockName('addFavorite'),
            removeFavorite: vi.fn().mockName('removeFavorite')
        } as unknown as MockedObject<ReportPreferencesService>;
        preferences.addFavorite.mockReturnValue(of(undefined));
        preferences.removeFavorite.mockReturnValue(of(undefined));
        summaryService = { get: vi.fn().mockReturnValue(of(hubSummary())) };
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ReportPreferencesService, useValue: preferences },
                { provide: ReportHubSummaryService, useValue: summaryService },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { planLockHint: () => null } }
            ]
        });
    });

    it('yalnız raporu açılabilen soru kartları çizilir; özet bu haftayla yüklenir', () => {
        const fixture = render();

        expect(questionIds(el(fixture))).toEqual(['question-cash', 'question-collections', 'question-appointments']);
        expect(summaryService.get).toHaveBeenCalledWith('week');
        expect(el(fixture).querySelector('[data-testid="question-appointments"] [data-testid="figure-sub"]')?.textContent).toContain('1 Gelmedi');
    });

    it('dönem değişince özet o dönemle yeniden istenir', () => {
        const fixture = render();

        el(fixture).querySelector<HTMLButtonElement>('[data-testid="period-month"]')!.click();
        fixture.detectChanges();

        expect(summaryService.get).toHaveBeenLastCalledWith('month');
        expect(el(fixture).querySelector('[data-testid="period-month"]')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('yeni dönem yüklenirken kart eski sayıyı eski dönemin adıyla gösterir ve ızgara meşgul işaretlenir', () => {
        const fixture = render();
        const month$ = new Subject<ReportHubSummaryDto>();
        const sub = () => el(fixture).querySelector('[data-testid="question-appointments"] [data-testid="figure-sub"]')?.textContent;
        const grid = () => el(fixture).querySelector('[data-testid="question-grid"]');

        summaryService.get.mockReturnValue(month$);
        el(fixture).querySelector<HTMLButtonElement>('[data-testid="period-month"]')!.click();
        fixture.detectChanges();

        expect(sub()).toContain('bu hafta');
        expect(grid()?.getAttribute('aria-busy')).toBe('true');

        month$.next({ ...hubSummary(), period: 'month' });
        fixture.detectChanges();

        expect(sub()).toContain('bu ay');
        expect(grid()?.getAttribute('aria-busy')).toBe('false');
    });

    it('ilk özet gelene kadar bant ve kart sayıları için yer tutucu çizilir; sıra aynı kalır, özet gelince yer tutucular kalkar', () => {
        const first$ = new Subject<ReportHubSummaryDto>();

        summaryService.get.mockReturnValue(first$);
        const fixture = render();
        const root = el(fixture);
        const placeholders = () => root.querySelectorAll('[data-testid="figure-placeholder"]').length;
        const before = questionIds(root);

        expect(root.querySelector('[data-testid="attention-placeholder"]')).not.toBeNull();
        expect(placeholders()).toBe(3);
        expect(root.querySelector('[data-testid="figure-value"]')).toBeNull();

        first$.next(hubSummary({ endOfDayUnchargedVisitCount: 2 }));
        fixture.detectChanges();

        expect(questionIds(root)).toEqual(before);
        expect(placeholders()).toBe(0);
        expect(root.querySelector('[data-testid="attention-placeholder"]')).toBeNull();
        expect(root.querySelector('[data-testid="attention-endOfDay"]')).not.toBeNull();
        expect(root.querySelectorAll('[data-testid="figure-value"]').length).toBe(3);
    });

    it('dönem değişirken eldeki özet kalır; yer tutucu yalnız ilk açılışta', () => {
        const fixture = render();
        const month$ = new Subject<ReportHubSummaryDto>();

        summaryService.get.mockReturnValue(month$);
        el(fixture).querySelector<HTMLButtonElement>('[data-testid="period-month"]')!.click();
        fixture.detectChanges();

        expect(el(fixture).querySelector('[data-testid="figure-placeholder"]')).toBeNull();
        expect(el(fixture).querySelector('[data-testid="attention-placeholder"]')).toBeNull();
    });

    it('bant yalnız sıfırdan büyük ve izinli uyarıyla görünür', () => {
        summaryService.get.mockReturnValue(of(hubSummary({ endOfDayUnchargedVisitCount: 0 })));
        expect(el(render()).querySelector('[data-testid="attention-band"]')).toBeNull();
    });

    it('izinli uyarı bantta sayısı ve bağlantısıyla çizilir', () => {
        claims.add(PRESCRIPTIONS_READ_CLAIM);
        summaryService.get.mockReturnValue(of(hubSummary({ hbsNotEnteredPrescriptions: { count: 4, oldestAtUtc: null }, lowStockProductCount: 3 })));
        const root = el(render());

        expect(root.querySelector('[data-testid="attention-hbsPrescriptions"]')?.textContent).toContain("4 reçete HBS'e (e-Reçete) girilmemiş");
        expect(root.querySelector('[data-testid="attention-lowStock"]')).toBeNull();
    });

    it('B-02: gecikmiş randevu bantta görünür ve takvimi Gecikmiş durumuyla açar', () => {
        claims.add(VISITS_READ_CLAIM);
        summaryService.get.mockReturnValue(of(hubSummary({ overdueAppointmentCount: 29 })));
        const row = el(render()).querySelector('[data-testid="attention-overdueAppointments"]');

        expect(row?.textContent).toContain('29 randevu gecikmiş, hâlâ planlı');
        expect(row?.querySelector('a')?.getAttribute('href')).toBe('/panel/appointments/calendar?view=month&states=Overdue');
    });

    it('özet yüklenemezse rapor bağlantıları yine çalışır', () => {
        summaryService.get.mockReturnValue(throwError(() => new Error('500')));
        const root = el(render());

        expect(root.querySelector('[data-testid="hub-load-error"]')).not.toBeNull();
        expect(root.textContent).toContain('Ödeme hareketleri');
        expect(root.querySelector('[data-testid="figure-value"]')).toBeNull();
        expect(root.querySelector('[data-testid="figure-placeholder"]')).toBeNull();
        expect(root.querySelector('[data-testid="attention-placeholder"]')).toBeNull();
    });

    it('favoriler en üstte, eklenme sırasıyla; izni olmayan rapor favoride olsa da görünmez', () => {
        const root = el(render(['payments', 'registers.vaccines', 'appointments']));

        expect(favoriteLabels(root)).toEqual(['Ödeme hareketleri', 'Randevu hareketleri']);
        expect(starFor(root, 'Ödeme hareketleri').getAttribute('aria-pressed')).toBe('true');
    });

    it('yıldız favoriye ekler ve kısayol satırına taşır', () => {
        const fixture = render([]);

        expect(favoriteLabels(el(fixture))).toEqual([]);
        starFor(el(fixture), 'Randevu hareketleri').click();
        fixture.detectChanges();

        expect(preferences.addFavorite).toHaveBeenCalledWith('appointments');
        expect(favoriteLabels(el(fixture))).toEqual(['Randevu hareketleri']);
    });

    it('favoriden çıkarma başarısızsa önceki duruma döner ve uyarı gösterir', () => {
        preferences.removeFavorite.mockReturnValue(throwError(() => new Error('ağ')));
        const fixture = render(['payments']);

        fixture.componentInstance.toggleFavorite('/panel/reports/payments');
        fixture.detectChanges();

        expect(preferences.removeFavorite).toHaveBeenCalledWith('payments');
        expect(fixture.componentInstance.favoriteKeys()).toEqual(['payments']);
        expect(el(fixture).querySelector('[role="alert"]')?.textContent).toContain('Favori kaydedilemedi');
    });

    it('arama eşleşen raporun kartını vurgular, diğerlerini soldurur', () => {
        const fixture = render();

        fixture.componentInstance.query.set('pos');
        fixture.detectChanges();

        expect(el(fixture).querySelector('[data-testid="question-collections"]')?.classList).toContain('ring-2');
        expect(el(fixture).querySelector('[data-testid="question-appointments"]')?.classList).toContain('opacity-35');
    });
});
