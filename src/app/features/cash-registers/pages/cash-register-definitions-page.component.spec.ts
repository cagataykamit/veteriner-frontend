import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { TenantPlanFeatureVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { CashRegisterDefinitionsPageComponent } from './cash-register-definitions-page.component';

const main: CashRegisterDto = { id: 'r-main', clinicId: 'k1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true };
const drawer: CashRegisterDto = { id: 'r2', clinicId: 'k1', code: 'K2', name: 'Arka kasa', isMain: false, isActive: true };

describe('CashRegisterDefinitionsPageComponent (Tanımlar › Kasalar, S-05)', () => {
    let fixture: ComponentFixture<CashRegisterDefinitionsPageComponent>;
    let service: { list: ReturnType<typeof vi.fn>; listCategories: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; updateCategory: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; createCategory: ReturnType<typeof vi.fn> };
    let claims: Set<string>;
    const locked = signal<TenantPlanFeatureVm | null>(null);
    const el = () => fixture.nativeElement as HTMLElement;
    const row = (id: string) => el().querySelector(`[data-testid="${id}"]`)!;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [CashRegisterDefinitionsPageComponent],
            providers: [
                provideRouter([]),
                { provide: CashRegistersService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', canAccessSubscription: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => locked(), mutationBlocked: () => false } }
            ]
        });
        fixture = TestBed.createComponent(CashRegisterDefinitionsPageComponent);
        fixture.detectChanges();
    };

    beforeEach(() => {
        claims = new Set(['CashRegisters.Manage']);
        locked.set(null);
        service = {
            list: vi.fn().mockReturnValue(of([main, drawer])),
            listCategories: vi.fn().mockReturnValue(of([{ id: 'c1', name: 'Masraf', isActive: true }])),
            update: vi.fn().mockReturnValue(of(drawer)),
            updateCategory: vi.fn().mockReturnValue(of({})),
            create: vi.fn().mockReturnValue(of({})),
            createCategory: vi.fn().mockReturnValue(of({}))
        };
    });

    it('satır başına Kaydet yok; kalemle açılan satırda Kaydet / Vazgeç, kaydedince satır kapanır', () => {
        create();

        expect(el().querySelectorAll('[data-testid="cash-row-save"]')).toHaveLength(0);
        expect(row('cash-register-row-r-main').textContent).toContain('Ana kasa');
        expect(row('cash-register-row-r-main').querySelector('p-toggleswitch')).toBeNull();

        (row('cash-register-row-r2').querySelector('[data-testid="cash-row-edit"]') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(el().querySelectorAll('[data-testid="cash-row-save"]')).toHaveLength(1);

        fixture.componentInstance.draftName = 'Ön kasa';
        fixture.componentInstance.saveEdit();
        fixture.detectChanges();
        expect(service.update).toHaveBeenCalledWith('r2', 'K2', 'Ön kasa', true);
        expect(fixture.componentInstance.editing()).toBeNull();

        fixture.componentInstance.editCategory({ id: 'c1', name: 'Masraf', isActive: true });
        fixture.componentInstance.cancelEdit();
        expect(service.updateCategory).not.toHaveBeenCalled();
    });

    it('"Etkin" anahtarı hemen kaydeder', () => {
        create();
        fixture.componentInstance.saveCategory({ id: 'c1', name: 'Masraf', isActive: true }, 'Masraf', false);

        expect(service.updateCategory).toHaveBeenCalledWith('c1', 'Masraf', false);
    });

    it('Temel pakette üst paket kutusu, tanım listesi yok', () => {
        locked.set({ feature: 'CashManagement', isEnabled: false, requiredPlanCode: 'Pro' });
        create();

        expect(el().querySelector('[data-testid="plan-upgrade-notice"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="cash-register-list"]')).toBeNull();
    });
});
