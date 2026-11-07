import type { HttpParams } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicsOverviewDto, ClinicsOverviewFiguresDto, ClinicsOverviewRowDto } from '@/app/features/reports/performance/models/clinics-overview.model';
import { ClinicsOverviewPageComponent } from './clinics-overview-page.component';

const figures = (ciro: number, cash: number, exams: number): ClinicsOverviewFiguresDto => ({
    netChargeAmount: ciro,
    netCollectedAmount: cash,
    visitCount: null,
    examinationCount: exams,
    appointments: { scheduled: 1, completed: 4, cancelled: 0, noShow: 0 }
});

const row = (id: string, name: string, ciro: number, previousCiro: number): ClinicsOverviewRowDto => ({
    clinicId: id,
    clinicName: name,
    current: figures(ciro, ciro / 2, 3),
    previous: figures(previousCiro, 0, 3),
    outstanding: { totalOutstandingAmount: 100, clientCount: 1 }
});

const overview = (clinics: ClinicsOverviewRowDto[]): ClinicsOverviewDto => ({
    currency: 'TRY',
    from: '2026-11-01',
    to: '2026-11-07',
    previousFrom: '2026-10-25',
    previousTo: '2026-10-31',
    clinics,
    total: {
        current: figures(3000, 1500, 6),
        previous: figures(2000, 0, 6),
        outstanding: { totalOutstandingAmount: 200, clientCount: 1 }
    }
});

describe('ClinicsOverviewPageComponent (TIER-007)', () => {
    let fixture: ComponentFixture<ClinicsOverviewPageComponent>;
    let get: ReturnType<typeof vi.fn>;
    let locked: boolean;

    const el = () => fixture.nativeElement as HTMLElement;
    const text = (testId: string) => el().querySelector(`[data-testid="${testId}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    async function create(dto: ClinicsOverviewDto): Promise<void> {
        get = vi.fn().mockReturnValue(of(dto));
        await TestBed.configureTestingModule({
            imports: [ClinicsOverviewPageComponent],
            providers: [
                provideRouter([]),
                { provide: ApiClient, useValue: { get } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => (locked ? { feature: 'ClinicsOverview', isEnabled: false, requiredPlanCode: 'Premium' } : null) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClinicsOverviewPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        locked = false;
    });

    afterEach(() => fixture?.destroy());

    it('bu ay ve karşılaştırmayla yükler; şube satırları, toplam ve önceki döneme göre fark çizilir', async () => {
        await create(overview([row('c1', 'Merkez', 2000, 1000), row('c2', 'Bornova', 1000, 1000)]));

        expect(get).toHaveBeenCalledTimes(1);
        const params = get.mock.calls[0][1] as HttpParams;

        expect(params.get('from')?.endsWith('-01')).toBe(true);
        expect(params.get('compare')).toBe('true');
        expect(params.has('clinicId')).toBe(false);
        expect(text('overview-row-c1')).toContain('Merkez');
        expect(text('overview-row-c1')).toContain('₺2.000,00');
        expect(text('overview-row-c1')).toContain('+%100');
        expect(text('overview-row-c2')).toContain('+%0');
        expect(text('overview-total')).toContain('Toplam');
        expect(text('overview-total')).toContain('₺3.000,00');
        expect(text('overview-previous-period')).toContain('25.10.2026 – 31.10.2026');
        expect(text('overview-cards')).toContain('Bornova');
    });

    it('izni olmayan sütun çizilmez; açık alacak karşılaştırılmaz', async () => {
        await create(overview([row('c1', 'Merkez', 2000, 1000), row('c2', 'Bornova', 1000, 1000)]));

        const headers = Array.from(el().querySelectorAll('[data-testid="overview-table"] th')).map((th) => th.textContent?.trim());

        expect(headers).toEqual(['Şube', 'Ciro', 'Tahsilat', 'Açık alacak', 'Muayene', 'Tamamlanan randevu']);
        const outstandingCell = el().querySelectorAll('[data-testid="overview-row-c1"] td')[3];

        expect(outstandingCell.textContent?.trim()).toBe('₺100,00');
    });

    it('tek şubede toplam satırı gösterilmez', async () => {
        await create(overview([row('c1', 'Merkez', 2000, 1000)]));

        expect(text('overview-row-c1')).toContain('Merkez');
        expect(el().querySelector('[data-testid="overview-total"]')).toBeNull();
    });

    it('pakette yoksa istek göndermez, üst paket kutusu çıkar', async () => {
        locked = true;
        await create(overview([]));

        expect(get).not.toHaveBeenCalled();
        expect(text('plan-upgrade-notice')).toContain('Şubeler özeti Kurumsal paketinde var');
    });
});
