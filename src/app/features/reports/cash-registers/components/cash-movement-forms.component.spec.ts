import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { CashMovementFormsComponent } from './cash-movement-forms.component';

const REGISTER = { id: 'r1', clinicId: 'c1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true };

describe('CashMovementFormsComponent — tek tür önden seçili (H1)', () => {
    const create = (categories: { id: string; name: string; isActive: boolean }[]) => {
        const createMovement = vi.fn().mockReturnValue(of({}));

        TestBed.configureTestingModule({
            imports: [CashMovementFormsComponent],
            providers: [{ provide: CashRegistersService, useValue: { createMovement, createTransfer: vi.fn() } }]
        });
        const fixture = TestBed.createComponent(CashMovementFormsComponent);

        fixture.componentRef.setInput('clinicId', 'c1');
        fixture.componentRef.setInput('registers', [REGISTER]);
        fixture.componentRef.setInput('categories', categories);
        fixture.detectChanges();

        return { cmp: fixture.componentInstance, createMovement };
    };

    it('tek aktif tür varsa seçili gelir ve gönderilir', () => {
        const { cmp, createMovement } = create([
            { id: 'k1', name: 'Kira', isActive: true },
            { id: 'k0', name: 'Eski', isActive: false }
        ]);

        expect(cmp.effectiveCategoryId()).toBe('k1');
        cmp.amount.set(100);
        cmp.submit();
        expect(createMovement).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'k1' }));
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
