import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { PaymentsListPageComponent } from './payments-list-page.component';

const row: PaymentListItemVm = {
    id: 'p1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: null,
    petName: '',
    amount: 600,
    currency: 'TRY',
    method: 'cash',
    paidAtUtc: '2026-10-10T07:00:00Z'
};

describe('PaymentsListPageComponent — iptal', () => {
    let fixture: ComponentFixture<PaymentsListPageComponent>;
    let payments: jasmine.SpyObj<PaymentsService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [PaymentsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: PaymentsService, useValue: payments },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PaymentsListPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        sessionStorage.clear();
        payments = jasmine.createSpyObj<PaymentsService>('PaymentsService', ['getPayments', 'voidPayment']);
        payments.getPayments.and.returnValue(of({ items: [row], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
        claims = new Set(['Payments.Read']);
        mutationBlocked = false;
    });

    it('Payments.Correct yoksa İptal et görünmez', async () => {
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('İptal et');
    });

    it('Payments.Correct varsa İptal et görünür; salt okunur kiracıda gizlenir', async () => {
        claims.add('Payments.Correct');
        await setup();
        expect(fixture.nativeElement.textContent).toContain('İptal et');
        mutationBlocked = true;
        fixture.destroy();
        TestBed.resetTestingModule();
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('İptal et');
    });

    it('iptal diyaloğu seçili ödemeyi gerekçeyle iptal eder', async () => {
        claims.add('Payments.Correct');
        payments.voidPayment.and.returnValue(of(void 0));
        await setup();
        const cmp = fixture.componentInstance;
        cmp.openVoid(row);
        expect(cmp.voidSummary()).toContain('Ali Veli');
        await firstValueFrom(cmp.voidPayment('Yanlış tutar girildi'));
        expect(payments.voidPayment).toHaveBeenCalledOnceWith('p1', 'Yanlış tutar girildi');
    });

    it('iptal sonrası liste yeniden okunur', async () => {
        claims.add('Payments.Correct');
        await setup();
        payments.getPayments.calls.reset();
        fixture.componentInstance.afterVoid();
        expect(payments.getPayments).toHaveBeenCalledTimes(1);
    });
});
