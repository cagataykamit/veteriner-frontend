import type { MockedObject } from 'vitest';
import { HttpParams } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import type { TenantPlanFeatureVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { CashRegisterDto, CashRegisterReportDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersPageComponent } from './cash-registers-page.component';

const main: CashRegisterDto = { id: 'r-main', clinicId: 'k1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true };
const drawer: CashRegisterDto = { id: 'r2', clinicId: 'k1', code: 'K2', name: 'Arka kasa', isMain: false, isActive: true };

const report: CashRegisterReportDto = {
    clinicId: 'k1',
    cashRegisterId: null,
    cashRegisterName: null,
    from: '2026-11-02',
    to: '2026-11-08',
    currency: 'TRY',
    openingBalance: 420,
    totals: { cashNetAmount: 200, inAmount: 30, outAmount: 0, transferInAmount: 150, transferOutAmount: 150, netAmount: 230 },
    closingBalance: 650,
    rows: [
        {
            businessDate: '2026-11-08',
            atUtc: '2026-11-08T08:00:00Z',
            kind: 'Collection',
            referenceId: 'p1',
            cashRegisterId: 'r-main',
            cashRegisterName: 'Ana kasa',
            description: 'Ayşe',
            inAmount: 200,
            outAmount: 0,
            balance: 620,
            performedByName: 'Selin'
        },
        {
            businessDate: '2026-11-08',
            atUtc: '2026-11-08T09:00:00Z',
            kind: 'In',
            referenceId: 'm1',
            cashRegisterId: 'r-main',
            cashRegisterName: 'Ana kasa',
            description: 'Bozuk para',
            inAmount: 30,
            outAmount: 0,
            balance: 650,
            performedByName: 'Selin'
        }
    ]
};

describe('CashRegistersPageComponent', () => {
    let api: MockedObject<ApiClient>;
    let claims: Set<string>;
    const locked = signal<TenantPlanFeatureVm | null>(null);

    function create(): ComponentFixture<CashRegistersPageComponent> {
        const fixture = TestBed.createComponent(CashRegistersPageComponent);

        fixture.detectChanges();

        return fixture;
    }

    const byId = (f: ComponentFixture<CashRegistersPageComponent>, id: string) => (f.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

    beforeEach(() => {
        claims = new Set(['CashRegisters.Read', 'CashRegisters.Manage', 'CashMovements.Create', 'CashMovements.Void']);
        locked.set(null);
        api = {
            get: vi.fn().mockName('ApiClient.get'),
            post: vi.fn().mockName('ApiClient.post'),
            put: vi.fn().mockName('ApiClient.put')
        } as unknown as MockedObject<ApiClient>;
        api.get.mockImplementation(((path: string) => {
            if (path === '/api/v1/cash-registers') {
                return of([main, drawer]);
            }

            if (path === '/api/v1/cash-movements/categories') {
                return of([{ id: 'c1', name: 'Masraf', isActive: true }]);
            }

            return of(report);
        }) as never);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ApiClient, useValue: api },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', canAccessSubscription: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => locked(), mutationBlocked: () => false } }
            ]
        });
    });

    it('raporu aktif klinikle okur; devreden, dönem sonu ve yalnız kasa hareketlerinde iptal gösterir', () => {
        const f = create();
        const reportCall = api.get.mock.calls.find(([p]) => p === '/api/v1/cash-registers/report') as [string, HttpParams];

        expect(reportCall[1].get('clinicId')).toBe('k1');
        expect(reportCall[1].has('cashRegisterId')).toBe(false);
        expect(byId(f, 'cash-report-summary')?.textContent).toContain('420,00');
        expect(byId(f, 'cash-report-closing')?.textContent).toContain('650,00');
        expect((f.nativeElement as HTMLElement).querySelectorAll('[data-testid="cash-movement-void"]').length).toBe(1);
        expect(byId(f, 'cash-movement-forms')).not.toBeNull();
        expect(byId(f, 'cash-register-settings')).not.toBeNull();
    });

    it('resepsiyon: hareket girer, iptal ve tanım yok', () => {
        claims = new Set(['CashRegisters.Read', 'CashMovements.Create']);
        const f = create();

        expect(byId(f, 'cash-movement-forms')).not.toBeNull();
        expect(byId(f, 'cash-movement-void')).toBeNull();
        expect(byId(f, 'cash-register-settings')).toBeNull();
    });

    it('Temel pakette üst paket kutusu; giriş/çıkış ve tanım yok', () => {
        locked.set({ feature: 'CashManagement', isEnabled: false, requiredPlanCode: 'Pro' });
        const f = create();

        expect(byId(f, 'plan-upgrade-notice')).not.toBeNull();
        expect(byId(f, 'cash-movement-forms')).toBeNull();
        expect(byId(f, 'cash-register-settings')).toBeNull();
    });
});
