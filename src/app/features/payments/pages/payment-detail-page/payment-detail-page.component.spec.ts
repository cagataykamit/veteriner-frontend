import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PaymentDetailVm } from '@/app/features/payments/models/payment-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { DetailRelatedSummariesService } from '@/app/features/patients/services/detail-related-summaries.service';
import { PaymentDetailPageComponent } from './payment-detail-page.component';

const payment: PaymentDetailVm = {
    id: 'p1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: null,
    petName: '',
    hasMultiplePets: false,
    amount: 600,
    currency: 'TRY',
    method: 'cash',
    note: '—',
    paidAtUtc: '2026-10-10T07:00:00Z',
    appointmentId: null,
    examinationId: null
} as PaymentDetailVm;

describe('PaymentDetailPageComponent — iptal', () => {
    let fixture: ComponentFixture<PaymentDetailPageComponent>;
    let payments: jasmine.SpyObj<PaymentsService>;
    let claims: Set<string>;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [PaymentDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PaymentsService, useValue: payments },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                {
                    provide: DetailRelatedSummariesService,
                    useValue: { loadRelatedExaminationsForPaymentContext: () => of([]), loadRecentAppointmentsForPaymentPetContext: () => of([]) }
                },
                { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'p1' }), snapshot: { queryParamMap: { get: () => null } } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PaymentDetailPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        payments = jasmine.createSpyObj<PaymentsService>('PaymentsService', ['getPaymentById', 'voidPayment']);
        payments.getPaymentById.and.returnValue(of(payment));
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
        const nav = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

        fixture.componentInstance.afterVoid();
        expect(nav).toHaveBeenCalledWith(['/panel/payments']);
    });
});
