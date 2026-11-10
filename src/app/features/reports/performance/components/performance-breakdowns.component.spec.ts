import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { PerformanceBreakdownsDto } from '@/app/features/reports/performance/models/performance-breakdowns.model';
import { breakdownRows, PerformanceBreakdownsComponent } from './performance-breakdowns.component';

const dto = (withPrevious = true): PerformanceBreakdownsDto => ({
    currency: 'TRY',
    current: {
        from: '2026-11-01',
        to: '2026-11-07',
        byVeterinarian: [
            { veterinarianUserId: 'v1', name: 'Dr. Ayşe', examinationCount: 3, netChargeAmount: 1500 },
            { veterinarianUserId: null, name: 'Atanmamış', examinationCount: 0, netChargeAmount: 200 }
        ],
        byLineKind: [{ lineKind: 'Service', netChargeAmount: 1700, chargeCount: 4 }],
        topItems: [{ description: 'Genel muayene', lineKind: 'Service', netChargeAmount: 1700, chargeCount: 4 }],
        bySpecies: null,
        activity: { visitCount: 5, clientCount: 4 }
    },
    previous: withPrevious
        ? { from: '2026-10-25', to: '2026-10-31', byVeterinarian: [{ veterinarianUserId: 'v1', name: 'Dr. Ayşe', examinationCount: 2, netChargeAmount: 1000 }], byLineKind: [], topItems: [], bySpecies: null, activity: null }
        : null
});

describe('PerformanceBreakdownsComponent (TIER-004)', () => {
    let fixture: ComponentFixture<PerformanceBreakdownsComponent>;
    let api: { get: ReturnType<typeof vi.fn> };
    let locked: boolean;
    let settled: WritableSignal<boolean>;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`);

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [PerformanceBreakdownsComponent],
            providers: [
                provideRouter([]),
                { provide: ApiClient, useValue: api },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => (locked ? { feature: 'AdvancedReports', isEnabled: false, requiredPlanCode: 'Pro' } : null), planFeatureReady: () => settled() && !locked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PerformanceBreakdownsComponent);
        fixture.componentRef.setInput('from', '2026-11-01');
        fixture.componentRef.setInput('to', '2026-11-07');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        locked = false;
        settled = signal(true);
        api = { get: vi.fn().mockReturnValue(of(dto())) };
    });

    it('dönem süzgeciyle yükler; izni olan tabloları ve geliş özetini çizer, izinsiz bölüm çizilmez', async () => {
        await create();

        expect(api.get).toHaveBeenCalledTimes(1);
        const params = api.get.mock.calls[0][1];

        expect(params.get('from')).toBe('2026-11-01');
        expect(params.get('compare')).toBe('true');
        expect(q('perf-veterinarians')?.textContent).toContain('Dr. Ayşe');
        expect(q('perf-veterinarians')?.textContent).toContain('Atanmamış');
        expect(q('perf-line-kinds')?.textContent).toContain('Hizmet');
        expect(q('perf-items')?.textContent).toContain('Genel muayene');
        expect(q('perf-species')).toBeNull();
        expect(q('perf-activity')?.textContent).toContain('5');
    });

    it('pakette yoksa istek göndermez, üst paket kutusu çıkar', async () => {
        locked = true;
        await create();

        expect(api.get).not.toHaveBeenCalled();
        expect(q('plan-upgrade-notice')?.textContent).toContain('Gelişmiş raporlar Profesyonel ve Kurumsal paketlerinde var');
    });

    it('paket bilgisi gelmeden istek göndermez; gelince bir kez yükler', async () => {
        settled.set(false);
        await create();
        expect(api.get).not.toHaveBeenCalled();

        settled.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('önceki dönemle ciro farkı; önceki dönemde olmayan satır "yeni"', () => {
        const d = dto();
        const rows = breakdownRows(d.current.byVeterinarian, d.previous!.byVeterinarian, (r) => ({ key: r.veterinarianUserId ?? '-', name: r.name, count: r.examinationCount, amount: r.netChargeAmount }), true);

        expect(rows[0].deltaText).toBe('+%50');
        expect(rows[1].deltaText).toBe('yeni');
        expect(breakdownRows(d.current.byVeterinarian, null, (r) => ({ key: r.name, name: r.name, count: null, amount: r.netChargeAmount }), false)[0].deltaText).toBeNull();
    });
});
