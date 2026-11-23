import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PaymentDetailVm } from '@/app/entities/payment/models/payment-vm.model';
import { PaymentsService } from '@/app/entities/payment/services/payments.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { PaymentDetailPageComponent } from './payment-detail-page.component';

const payment: PaymentDetailVm = {
    id: 'p1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: null,
    petName: '',
    hasMultiplePets: false,
    amount: 600,
    creditedAmount: 0,
    currency: 'TRY',
    method: 'cash',
    cashRegisterName: null,
    note: '—',
    paidAtUtc: '2026-10-10T07:00:00Z',
    appointmentId: null,
    examinationId: null
} as PaymentDetailVm;

describe('PaymentDetailPageComponent — iptal', () => {
    let fixture: ComponentFixture<PaymentDetailPageComponent>;
    let payments: MockedObject<PaymentsService>;
    let claims: Set<string>;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [PaymentDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PaymentsService, useValue: payments },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'p1' }), snapshot: { queryParamMap: { get: () => null } } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PaymentDetailPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        payments = {
            getPaymentById: vi.fn().mockName('PaymentsService.getPaymentById'),
            voidPayment: vi.fn().mockName('PaymentsService.voidPayment'),
            getPaymentAllocations: vi.fn().mockName('PaymentsService.getPaymentAllocations')
        } as unknown as MockedObject<PaymentsService>;
        payments.getPaymentById.mockReturnValue(of(payment));
        payments.getPaymentAllocations.mockReturnValue(of([]));
        claims = new Set(['Payments.Read']);
    });

    it('Payments.Correct yoksa İptal et görünmez', async () => {
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('İptal et');
    });

    it('Payments.Correct varsa İptal et düğmesi görünür', async () => {
        claims.add('Payments.Correct');
        await setup();
        expect(fixture.nativeElement.textContent).toContain('İptal et');
    });

    it('iptal sonrası ödeme listesine döner (kayıt artık 404)', async () => {
        claims.add('Payments.Correct');
        await setup();
        const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        fixture.componentInstance.afterVoid();
        expect(nav).toHaveBeenCalledWith(['/panel/payments']);
    });

    it('krediye yazılan tutar varsa ayrı satırda gösterilir; yoksa satır yok', async () => {
        await setup();
        expect(fixture.nativeElement.querySelector('[data-testid="payment-credited"]')).toBeNull();

        TestBed.resetTestingModule();
        payments.getPaymentById.mockReturnValue(of({ ...payment, amount: 1000, creditedAmount: 400 }));
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Krediye yazılan');
        expect(fixture.nativeElement.querySelector('[data-testid="payment-credited"]').textContent.replace(/\s/g, '')).toContain('400,00');
    });

    it('kapatılan ücretler ilk kartta: açıklama ve tutar; ücrete sayılmayan ödemede açıklayıcı satır (K-04)', async () => {
        payments.getPaymentAllocations.mockReturnValue(of([{ chargeId: 'c1', description: 'Genel muayene', amount: 450 }, { chargeId: 'c2', description: 'Kuduz aşısı', amount: 150 }]));
        await setup();
        const rows = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="payment-allocation"]')) as HTMLElement[];

        expect(payments.getPaymentAllocations).toHaveBeenCalledWith('p1');
        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('Genel muayene');
        expect(rows[0].textContent).toContain('450,00');
        expect(rows[1].textContent).toContain('Kuduz aşısı');
        expect(fixture.nativeElement.textContent).not.toContain('İlgili muayeneler');

        TestBed.resetTestingModule();
        payments.getPaymentAllocations.mockReturnValue(of([]));
        payments.getPaymentById.mockReturnValue(of({ ...payment, creditedAmount: 600 }));
        await setup();
        expect(fixture.nativeElement.querySelector('[data-testid="payment-allocations"]').textContent).toContain('Bu ödeme bir ücrete sayılmadı; tutar müşteri kredisinde.');
    });

    it('nakit ödemede kasa adı görünür; kasa yoksa (kart, havale) satır yok', async () => {
        await setup();
        expect(fixture.nativeElement.querySelector('[data-testid="payment-cash-register"]')).toBeNull();

        TestBed.resetTestingModule();
        payments.getPaymentById.mockReturnValue(of({ ...payment, cashRegisterName: 'Arka kasa' }));
        await setup();
        expect(fixture.nativeElement.querySelector('[data-testid="payment-cash-register"]').textContent.trim()).toBe('Arka kasa');
    });
});
