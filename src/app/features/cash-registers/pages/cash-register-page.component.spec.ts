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
import { CashRegisterPageComponent } from './cash-register-page.component';

const main: CashRegisterDto = { id: 'r-main', clinicId: 'k1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true };
const drawer: CashRegisterDto = { id: 'r2', clinicId: 'k1', code: 'K2', name: 'Arka kasa', isMain: false, isActive: true };
const closed: CashRegisterDto = { id: 'r3', clinicId: 'k1', code: 'K3', name: 'Eski kasa', isMain: false, isActive: false };

const report = (cashRegisterId: string | null, closing: number, net: number, rows: CashRegisterReportDto['rows'] = []): CashRegisterReportDto => ({
    clinicId: 'k1',
    cashRegisterId,
    cashRegisterName: null,
    from: '2026-11-23',
    to: '2026-11-23',
    currency: 'TRY',
    openingBalance: closing - net,
    totals: { cashNetAmount: 0, inAmount: 0, outAmount: 0, transferInAmount: 0, transferOutAmount: 0, netAmount: net },
    closingBalance: closing,
    rows
});

const rows: CashRegisterReportDto['rows'] = [
    { businessDate: '2026-11-23', atUtc: '2026-11-23T07:00:00Z', kind: 'Collection', referenceId: 'p1', cashRegisterId: 'r-main', cashRegisterName: 'Ana kasa', description: 'Ayşe', inAmount: 200, outAmount: 0, balance: 1200, performedByName: 'Selin' },
    { businessDate: '2026-11-23', atUtc: '2026-11-23T08:30:00Z', kind: 'Out', referenceId: 'm1', cashRegisterId: 'r-main', cashRegisterName: 'Ana kasa', description: 'Kırtasiye', inAmount: 0, outAmount: 50, balance: 1150, performedByName: 'Selin' }
];

describe('CashRegisterPageComponent (Para › Kasa, S-05)', () => {
    let api: MockedObject<ApiClient>;
    let claims: Set<string>;
    let registers: CashRegisterDto[];
    const locked = signal<TenantPlanFeatureVm | null>(null);

    const create = (): ComponentFixture<CashRegisterPageComponent> => {
        const fixture = TestBed.createComponent(CashRegisterPageComponent);

        fixture.detectChanges();

        return fixture;
    };
    const el = (f: ComponentFixture<CashRegisterPageComponent>) => f.nativeElement as HTMLElement;
    const byId = (f: ComponentFixture<CashRegisterPageComponent>, id: string) => el(f).querySelector(`[data-testid="${id}"]`);

    beforeEach(() => {
        claims = new Set(['CashRegisters.Read', 'CashRegisters.Manage', 'CashMovements.Create', 'CashMovements.Void']);
        registers = [main, drawer, closed];
        locked.set(null);
        api = { get: vi.fn(), post: vi.fn(), put: vi.fn() } as unknown as MockedObject<ApiClient>;
        api.get.mockImplementation(((path: string, params?: HttpParams) => {
            if (path === '/api/v1/cash-registers') {
                return of(registers);
            }

            if (path === '/api/v1/cash-movements/categories') {
                return of([{ id: 'c1', name: 'Masraf', isActive: true }]);
            }

            const id = params?.get('cashRegisterId') ?? null;

            return of(id === 'r-main' ? report(id, 1150, 150) : id === 'r2' ? report(id, 300, -20) : report(null, 1450, 130, rows));
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

    it('etkin kasa başına bugünkü bakiye ve net (kasa başına rapor), toplam nakit; pasif kasa kutusu yok', () => {
        const f = create();
        const reportCalls = api.get.mock.calls.filter(([p]) => p === '/api/v1/cash-registers/report').map(([, p]) => (p as HttpParams).get('cashRegisterId'));

        expect(reportCalls).toEqual([null, 'r-main', 'r2']);
        expect(byId(f, 'cash-balance-r-main')?.textContent).toContain('1.150,00');
        expect(byId(f, 'cash-balance-r-main')?.textContent).toContain('Bugün +');
        expect(byId(f, 'cash-balance-r2')?.textContent).toContain('Bugün −');
        expect(byId(f, 'cash-balance-r3')).toBeNull();
        expect(byId(f, 'cash-balance-total')?.textContent).toContain('1.450,00');
        expect(byId(f, 'cash-balance-total')?.textContent).toContain('2 kasa');
    });

    it('bugünün hareketleri saatle, en yeni üstte; iptal yalnız kasa hareketinde; rapor ve tanım bağlantıları', () => {
        const f = create();
        const table = byId(f, 'cash-today')!;
        const bodyRows = Array.from(table.querySelectorAll('tbody tr'));

        expect(bodyRows[0].textContent).toContain('Kırtasiye');
        expect(bodyRows[0].textContent).toContain('11:30');
        expect(table.querySelectorAll('[data-testid="cash-movement-void"]')).toHaveLength(1);
        const links = Array.from(table.querySelectorAll('a')).map((a) => a.getAttribute('href'));

        expect(links).toEqual(['/panel/reports/cash-registers', '/panel/settings/definitions/cash-registers']);
    });

    it('Para girişi / Para çıkışı / Aktarım formu pencerede açar; kayıt sonrası bakiye yenilenir', () => {
        api.post.mockReturnValue(of({}) as never);
        const f = create();

        (byId(f, 'cash-open-in') as HTMLButtonElement).click();
        f.detectChanges();
        expect(f.componentInstance.formTitle()).toBe('Para girişi');
        expect(document.querySelector('[data-testid="cash-movement-forms"]')).not.toBeNull();

        const before = api.get.mock.calls.length;

        f.componentInstance.onSaved('Para girişi kaydedildi.');
        f.detectChanges();
        expect(f.componentInstance.form()).toBeNull();
        expect(byId(f, 'cash-saved')?.textContent).toContain('Para girişi kaydedildi.');
        expect(api.get.mock.calls.length).toBeGreaterThan(before);

        (byId(f, 'cash-open-transfer') as HTMLButtonElement).click();
        expect(f.componentInstance.formTitle()).toBe('Kasalar arası aktarım');
    });

    it('tek etkin kasada Aktarım yok; giriş izni yoksa düğme yok, iptal izni yoksa iptal yok', () => {
        registers = [main];
        claims = new Set(['CashRegisters.Read']);
        const f = create();

        expect(byId(f, 'cash-actions')).toBeNull();
        expect(byId(f, 'cash-movement-void')).toBeNull();
        expect(byId(f, 'cash-balance-total')).toBeNull();
        expect(Array.from(el(f).querySelectorAll('[data-testid="cash-today"] a')).map((a) => a.getAttribute('href'))).toEqual(['/panel/reports/cash-registers']);
    });

    it('Temel pakette üst paket kutusu; tek kasada bakiye ve düğme yok', () => {
        locked.set({ feature: 'CashManagement', isEnabled: false, requiredPlanCode: 'Pro' });
        registers = [main];
        const f = create();

        expect(byId(f, 'plan-upgrade-notice')).not.toBeNull();
        expect(byId(f, 'cash-balances')).toBeNull();
        expect(byId(f, 'cash-actions')).toBeNull();
    });
});
