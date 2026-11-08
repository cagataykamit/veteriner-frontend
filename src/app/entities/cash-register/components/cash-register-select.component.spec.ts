import type { MockedObject } from 'vitest';
import { HttpParams } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import type { TenantPlanFeatureVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegisterSelectComponent } from './cash-register-select.component';

const main: CashRegisterDto = { id: 'r-main', clinicId: 'k1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true };
const drawer: CashRegisterDto = { id: 'r2', clinicId: 'k1', code: 'K2', name: 'Arka kasa', isMain: false, isActive: true };

describe('CashRegisterSelectComponent', () => {
    let api: MockedObject<ApiClient>;
    let claims: Set<string>;
    let registers: CashRegisterDto[];
    const locked = signal<TenantPlanFeatureVm | null>(null);

    function create(method = 'cash'): ComponentFixture<CashRegisterSelectComponent> {
        const fixture = TestBed.createComponent(CashRegisterSelectComponent);

        fixture.componentRef.setInput('clinicId', 'k1');
        fixture.componentRef.setInput('method', method);
        fixture.detectChanges();

        return fixture;
    }

    const select = (f: ComponentFixture<CashRegisterSelectComponent>) => (f.nativeElement as HTMLElement).querySelector('[data-testid="cash-register-select"]');

    beforeEach(() => {
        claims = new Set(['CashRegisters.Read']);
        registers = [main, drawer];
        locked.set(null);
        api = { get: vi.fn().mockName('ApiClient.get') } as unknown as MockedObject<ApiClient>;
        api.get.mockImplementation((() => of(registers)) as never);
        TestBed.configureTestingModule({
            providers: [
                { provide: ApiClient, useValue: api },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => locked() } }
            ]
        });
    });

    it('nakitte ve birden fazla aktif kasada görünür, Ana kasayı seçer', () => {
        const f = create();
        const [path, params] = api.get.mock.calls[0] as [string, HttpParams];

        expect(path).toBe('/api/v1/cash-registers');
        expect(params.get('clinicId')).toBe('k1');
        expect(select(f)).not.toBeNull();
        expect(f.componentInstance.value()).toBe('r-main');
    });

    it('alan altı açıklaması varsayılan olarak girişi, verilirse iadedeki çıkışı söyler', () => {
        const f = create();

        expect((f.nativeElement as HTMLElement).textContent).toContain('Nakit bu kasaya girer.');
        f.componentRef.setInput('hint', 'İade edilen nakit bu kasadan çıkar.');
        f.detectChanges();
        expect((f.nativeElement as HTMLElement).textContent).toContain('İade edilen nakit bu kasadan çıkar.');
    });

    it('kart ödemesinde görünmez ve değer boştur', () => {
        const f = create('card');

        expect(select(f)).toBeNull();
        expect(f.componentInstance.value()).toBeNull();
        expect((f.nativeElement as HTMLElement).className).toContain('hidden');
    });

    it('tek kasada sorulmaz (sunucu Ana kasayı kullanır)', () => {
        registers = [main];
        const f = create();

        expect(select(f)).toBeNull();
        expect(f.componentInstance.value()).toBeNull();
    });

    it('Temel pakette ya da izin yokken kasa listesi okunmaz', () => {
        locked.set({ feature: 'CashManagement', isEnabled: false, requiredPlanCode: 'Pro' });
        expect(select(create())).toBeNull();
        expect(api.get).not.toHaveBeenCalled();
    });
});
