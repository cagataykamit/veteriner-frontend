import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { CashMovementFormsComponent } from './cash-movement-forms.component';

const REGISTER = { id: 'r1', clinicId: 'c1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true };

describe('CashMovementFormsComponent — tek tür önden seçili (H1)', () => {
    const create = (categories: { id: string; name: string; isActive: boolean }[], inputs: Record<string, string> = {}) => {
        const createMovement = vi.fn().mockReturnValue(of({}));

        TestBed.configureTestingModule({
            imports: [CashMovementFormsComponent],
            providers: [
                { provide: CashRegistersService, useValue: { createMovement, createTransfer: vi.fn() } },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(CashMovementFormsComponent);

        fixture.componentRef.setInput('clinicId', 'c1');
        fixture.componentRef.setInput('registers', [REGISTER]);
        fixture.componentRef.setInput('categories', categories);

        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }

        fixture.detectChanges();

        return { cmp: fixture.componentInstance, createMovement, fixture };
    };

    it('tek aktif tür varsa seçili gelir ve gönderilir', () => {
        const { cmp, createMovement } = create([
            { id: 'k1', name: 'Kira', isActive: true },
            { id: 'k0', name: 'Eski', isActive: false }
        ]);

        expect(cmp.effectiveCategoryId()).toBe('k1');
        const saved = vi.fn();

        cmp.saved.subscribe(saved);
        cmp.amount.set(100);
        cmp.submit();
        expect(createMovement).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'k1', direction: 'Out' }));
        expect(saved).toHaveBeenCalledWith('Para çıkışı kaydedildi.');
    });

    it('yön açan düğmeden gelir (Para girişi); pencerede yön ve tür seçici yok (S-05)', () => {
        const { cmp, createMovement, fixture } = create([{ id: 'k1', name: 'Kira', isActive: true }], { direction: 'In' });

        expect((fixture.nativeElement as HTMLElement).querySelector('p-selectbutton')).toBeNull();
        cmp.amount.set(50);
        cmp.submit();
        expect(createMovement).toHaveBeenCalledWith(expect.objectContaining({ direction: 'In', amount: 50 }));
    });

    it('birden çok tür varsa seçim kullanıcıya kalır', () => {
        const { cmp } = create([
            { id: 'k1', name: 'Kira', isActive: true },
            { id: 'k2', name: 'Fatura', isActive: true }
        ]);

        expect(cmp.effectiveCategoryId()).toBeNull();
        cmp.categoryId.set('k2');
        expect(cmp.effectiveCategoryId()).toBe('k2');
    });
});
