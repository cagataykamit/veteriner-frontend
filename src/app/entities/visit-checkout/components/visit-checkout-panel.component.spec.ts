import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { CHARGES_CREATE_CLAIM, EDOCUMENTS_ISSUE_CLAIM, PAYMENTS_CREATE_CLAIM, VISITS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ChargeSuggestionsService } from '@/app/entities/charge/services/charge-suggestions.service';
import { ClientCreditsService } from '@/app/entities/client-credit/services/client-credits.service';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { PaymentsService } from '@/app/entities/payment/services/payments.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import type { VisitCheckoutSummaryDto } from '@/app/entities/visit-checkout/models/visit-checkout.model';
import { VisitCheckoutService } from '@/app/entities/visit-checkout/services/visit-checkout.service';
import { VisitCheckoutPanelComponent } from './visit-checkout-panel.component';

function summary(over: Partial<VisitCheckoutSummaryDto> = {}): VisitCheckoutSummaryDto {
    return {
        visitId: 'v1',
        clinicId: 'c1',
        careStatus: 'InProgress',
        arrivedAtUtc: '2026-11-20T06:40:00Z',
        completedAtUtc: null,
        isVoided: false,
        responsibleVeterinarianName: 'Deniz Kaya',
        arrivalReason: null,
        petId: 'p1',
        petName: 'Boncuk',
        speciesName: 'Kedi',
        clientId: 'cl1',
        clientName: 'Ayşe Yılmaz',
        clientPhone: null,
        currency: 'TRY',
        charges: {
            chargeIndicator: 'PaymentPending',
            pendingItems: [
                { id: 's1', sourceType: 'Administration', petId: 'p1', petName: 'Boncuk', description: 'Karma aşı', quantity: 1, unit: 'doz', suggestedUnitPrice: 850, occurredAtUtc: '2026-11-20T07:00:00Z' }
            ],
            visitCharges: [{ chargeId: 'ch1', petId: 'p1', petName: 'Boncuk', description: 'Muayene', amount: 600, allocatedAmount: 0, outstandingAmount: 600, createdAtUtc: '2026-11-20T06:50:00Z' }],
            otherOpenCharges: [
                {
                    chargeId: 'old1',
                    visitId: 'v0',
                    visitArrivedAtUtc: '2026-10-12T07:00:00Z',
                    petId: 'p1',
                    petName: 'Boncuk',
                    description: 'Tırnak kesimi',
                    amount: 150,
                    allocatedAmount: 0,
                    outstandingAmount: 150,
                    createdAtUtc: '2026-10-12T07:10:00Z'
                }
            ],
            creditBalance: 0
        },
        ...over
    };
}

describe('VisitCheckoutPanelComponent (CHECKOUT-001)', () => {
    let claims: Set<string>;
    let checkout: { getSummary: ReturnType<typeof vi.fn> };
    let suggestions: { convert: ReturnType<typeof vi.fn>; waive: ReturnType<typeof vi.fn> };
    let payments: { createPayment: ReturnType<typeof vi.fn> };
    let credits: { applyCredit: ReturnType<typeof vi.fn> };
    let visits: { startVisit: ReturnType<typeof vi.fn>; completeVisit: ReturnType<typeof vi.fn> };
    let eDocuments: { visitCloseSuggestion: ReturnType<typeof vi.fn>; preview: ReturnType<typeof vi.fn> };

    function render(s: VisitCheckoutSummaryDto = summary()): ComponentFixture<VisitCheckoutPanelComponent> {
        checkout.getSummary.mockReturnValue(of(s));
        const f = TestBed.createComponent(VisitCheckoutPanelComponent);

        f.componentRef.setInput('visitId', 'v1');
        f.detectChanges();

        return f;
    }

    const settle = async (f: ComponentFixture<VisitCheckoutPanelComponent>) => {
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
        }

        f.detectChanges();
    };

    beforeEach(() => {
        claims = new Set([CHARGES_CREATE_CLAIM, PAYMENTS_CREATE_CLAIM, VISITS_UPDATE_CLAIM]);
        checkout = { getSummary: vi.fn() };
        suggestions = {
            convert: vi.fn().mockReturnValue(of({ created: true, charge: { id: 'new1', amount: 850, outstandingAmount: 850 } })),
            waive: vi.fn().mockReturnValue(of({}))
        };
        payments = { createPayment: vi.fn().mockReturnValue(of({ id: 'pay1' })) };
        credits = { applyCredit: vi.fn().mockReturnValue(of({})) };
        visits = { startVisit: vi.fn().mockReturnValue(of({})), completeVisit: vi.fn().mockReturnValue(of({})) };
        eDocuments = { visitCloseSuggestion: vi.fn().mockReturnValue(of(null)), preview: vi.fn() };

        TestBed.configureTestingModule({
            imports: [VisitCheckoutPanelComponent],
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicName: () => 'Pati Kliniği', getClinicId: () => 'c1' } },
                { provide: VisitCheckoutService, useValue: checkout },
                { provide: ChargeSuggestionsService, useValue: suggestions },
                { provide: PaymentsService, useValue: payments },
                { provide: ClientCreditsService, useValue: credits },
                { provide: VisitsService, useValue: visits },
                { provide: EDocumentsService, useValue: eDocuments },
                // Nakit satırındaki kasa seçimi: tek kasa (Ana kasa) olduğu için alan görünmez, kasa sunucuda Ana kasa olur.
                { provide: CashRegistersService, useValue: { list: () => of([{ id: 'r1', clinicId: 'c1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true }]) } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => null } }
            ]
        });
    });

    it('açılışta kalemler ücrete çevrilecek, bu gelişin ücreti seçili, eski borç seçili değil', () => {
        const f = render();
        const c = f.componentInstance;
        const el = f.nativeElement as HTMLElement;

        expect(c.decisionOf('s1')).toBe('convert');
        expect(c.selected().has('ch1')).toBe(true);
        expect(c.selected().has('old1')).toBe(false);
        expect(c.due()).toBe(1450);
        expect(el.querySelectorAll('[data-testid="checkout-other-charge"]').length).toBe(1);
    });

    it('parçalı ödeme: kalem çevrilir, iki ödeme sırayla dağıtılır, geliş tamamlanır', async () => {
        const f = render();
        const c = f.componentInstance;
        const finished = vi.fn();

        c.finished.subscribe(finished);
        c.addLine('card');
        c.setLineAmount(c.lines()[0].id, '1000');
        c.addLine('transfer');
        c.fillRemaining(c.lines()[1].id);
        expect(c.lines()[1].amount).toBe(450);

        c.submit();
        await settle(f);

        expect(suggestions.convert).toHaveBeenCalledWith('s1', expect.objectContaining({ requestId: expect.any(String), unitPrice: undefined }));
        const first = payments.createPayment.mock.calls[0][0];
        const second = payments.createPayment.mock.calls[1][0];

        expect(first).toEqual(
            expect.objectContaining({
                clinicId: 'c1',
                clientId: 'cl1',
                petId: 'p1',
                amount: 1000,
                method: 'card',
                allocations: [
                    { chargeId: 'new1', amount: 850 },
                    { chargeId: 'ch1', amount: 150 }
                ],
                creditAmount: undefined,
                cashRegisterId: null
            })
        );
        expect(second).toEqual(expect.objectContaining({ amount: 450, method: 'transfer', allocations: [{ chargeId: 'ch1', amount: 450 }] }));
        expect(visits.completeVisit).toHaveBeenCalledWith('v1', { withoutCharge: false });
        expect(c.phase()).toBe('done');
        expect(finished).toHaveBeenCalled();
        // Başlıktaki durum rozeti kapanıştan sonra tamamlanmış gelişi gösterir (açılıştaki "Muayenede" kalmaz).
        expect((f.nativeElement as HTMLElement).querySelector('p-tag')?.textContent?.trim()).toBe('Tamamlandı');
    });

    it('ikinci ödeme hata verirse panel durur; tekrar deneme aynı requestId ile gider ve kaydedilen ödeme tekrarlanmaz', async () => {
        const f = render();
        const c = f.componentInstance;

        payments.createPayment.mockReturnValueOnce(of({ id: 'pay1' })).mockReturnValueOnce(throwError(() => new Error('Sunucu yanıt vermedi.')));
        c.addLine('cash');
        c.setLineAmount(c.lines()[0].id, '630');
        c.addLine('card');
        c.setLineAmount(c.lines()[1].id, '820');

        c.submit();
        await settle(f);

        expect(c.phase()).toBe('failed');
        expect(c.failedLineId()).toBe(c.lines()[1].id);
        expect(c.savedLineIds().has(c.lines()[0].id)).toBe(true);
        expect((f.nativeElement as HTMLElement).querySelector('[data-testid="checkout-failed"]')?.textContent).toContain('Sunucu yanıt vermedi.');
        expect(visits.completeVisit).not.toHaveBeenCalled();

        const failedRequestId = payments.createPayment.mock.calls[1][0].requestId;

        payments.createPayment.mockReturnValue(of({ id: 'pay2' }));
        c.retryFailed();
        await settle(f);

        expect(payments.createPayment).toHaveBeenCalledTimes(3);
        expect(payments.createPayment.mock.calls[2][0].requestId).toBe(failedRequestId);
        expect(suggestions.convert).toHaveBeenCalledTimes(1);
        expect(c.phase()).toBe('done');
    });

    it('hata sonrası borçla kapat: başarısız satır alınmamış sayılır, geliş yine tamamlanır', async () => {
        const f = render();
        const c = f.componentInstance;

        payments.createPayment.mockReturnValueOnce(throwError(() => new Error('x')));
        c.addLine('card');
        c.setLineAmount(c.lines()[0].id, '1450');
        c.submit();
        await settle(f);

        c.closeWithDebtAfterFailure();
        await settle(f);

        expect(c.lines().length).toBe(0);
        expect(visits.completeVisit).toHaveBeenCalledTimes(1);
        expect(c.phase()).toBe('done');
        expect(c.totals().remaining).toBe(1450);
    });

    it('krediden ödeme önce mahsup edilir; fazla ödeme son satırda krediye yazılır', async () => {
        const s = summary();

        s.charges!.creditBalance = 500;
        const f = render(s);
        const c = f.componentInstance;

        c.useCreditMax();
        c.addLine('card');
        c.setLineAmount(c.lines()[0].id, '1000');
        expect(c.totals().overpaid).toBe(50);

        c.submit();
        await settle(f);

        expect(credits.applyCredit).toHaveBeenCalledWith('cl1', expect.any(String), [{ chargeId: 'new1', amount: 500 }]);
        expect(payments.createPayment.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                amount: 1000,
                allocations: [
                    { chargeId: 'new1', amount: 350 },
                    { chargeId: 'ch1', amount: 600 }
                ],
                creditAmount: 50
            })
        );
    });

    it('ücretlenecek bir şey yoksa bekleyen geliş başlatılıp ücretsiz onayıyla tamamlanır', async () => {
        const f = render(summary({ careStatus: 'Waiting', charges: { chargeIndicator: 'NoChargeableWork', pendingItems: [], visitCharges: [], otherOpenCharges: [], creditBalance: 0 } }));
        const c = f.componentInstance;

        expect(c.primaryLabel()).toBe('Gelişi tamamla');
        c.submit();
        await settle(f);

        expect(visits.startVisit).toHaveBeenCalledWith('v1');
        expect(visits.completeVisit).toHaveBeenCalledWith('v1', { withoutCharge: true });
    });

    it('kalem gerekçeyle ücretsiz sayılır (en az 5 karakter); geliş ücretsiz onayıyla kapanır', async () => {
        const f = render(summary({ charges: { chargeIndicator: 'ChargeMissing', pendingItems: summary().charges!.pendingItems, visitCharges: [], otherOpenCharges: [], creditBalance: 0 } }));
        const c = f.componentInstance;

        c.startWaive('s1');
        c.setWaiveReason('s1', 'abc');
        c.confirmWaive('s1');
        expect(c.decisionOf('s1')).toBe('convert');
        c.setWaiveReason('s1', 'kontrol, ücret alınmadı');
        c.confirmWaive('s1');
        expect(c.decisionOf('s1')).toBe('waive');

        c.submit();
        await settle(f);

        expect(suggestions.waive).toHaveBeenCalledWith('s1', 'kontrol, ücret alınmadı');
        expect(suggestions.convert).not.toHaveBeenCalled();
        expect(visits.completeVisit).toHaveBeenCalledWith('v1', { withoutCharge: true });
    });

    it('fiyatı olmayan kalem fiyat girilmeden kaydedilmez; girilen fiyat çevirmeye gider', async () => {
        const s = summary();

        s.charges!.pendingItems[0] = { ...s.charges!.pendingItems[0], suggestedUnitPrice: null, quantity: 2 };
        const f = render(s);
        const c = f.componentInstance;

        expect(c.canSubmit()).toBe(false);
        c.setUnitPrice('s1', '120');
        expect(c.due()).toBe(840);
        expect(c.canSubmit()).toBe(true);

        c.submit();
        await settle(f);

        expect(suggestions.convert).toHaveBeenCalledWith('s1', expect.objectContaining({ unitPrice: 120 }));
    });

    it('ücret okuma yetkisi yoksa yalnız geliş tamamlanır', async () => {
        claims = new Set([VISITS_UPDATE_CLAIM]);
        const f = render(summary({ charges: null }));
        const c = f.componentInstance;

        expect((f.nativeElement as HTMLElement).textContent).toContain('Ücretleri görme yetkiniz yok');
        c.submit();
        await settle(f);

        expect(payments.createPayment).not.toHaveBeenCalled();
        expect(visits.completeVisit).toHaveBeenCalledWith('v1', { withoutCharge: false });
    });

    it('e-Belge önerisi belge kesme izniyle, Bugün kapanışıyla aynı kuralla açılır', async () => {
        claims.add(EDOCUMENTS_ISSUE_CLAIM);
        eDocuments.visitCloseSuggestion.mockReturnValue(of({ visitId: 'v1' }));
        const f = render();
        const c = f.componentInstance;

        expect((f.nativeElement as HTMLElement).querySelector('app-e-document-issue-dialog')).not.toBeNull();
        c.addLine('card');
        c.fillRemaining(c.lines()[0].id);
        c.submit();
        await settle(f);

        expect(eDocuments.visitCloseSuggestion).toHaveBeenCalledWith('v1');
        expect(c.documentOpen()).toBe(true);
        expect(c.documentSource()).toEqual({ visitId: 'v1' });
    });

    it('belge kesme izni yoksa öneri çağrılmaz ve pencere çizilmez', async () => {
        const f = render();
        const c = f.componentInstance;

        expect((f.nativeElement as HTMLElement).querySelector('app-e-document-issue-dialog')).toBeNull();
        c.submit();
        await settle(f);

        expect(eDocuments.visitCloseSuggestion).not.toHaveBeenCalled();
    });

    it('tamamlanmış ve ödenmiş geliş yalnız özet ve fiş gösterir', () => {
        const f = render(
            summary({
                careStatus: 'Completed',
                charges: {
                    chargeIndicator: 'Paid',
                    pendingItems: [],
                    visitCharges: [{ chargeId: 'ch1', petId: 'p1', petName: 'Boncuk', description: 'Muayene', amount: 600, allocatedAmount: 600, outstandingAmount: 0, createdAtUtc: '2026-11-20T06:50:00Z' }],
                    otherOpenCharges: [],
                    creditBalance: 0
                }
            })
        );

        expect(f.componentInstance.isSettled()).toBe(true);
        expect((f.nativeElement as HTMLElement).querySelector('[data-testid="checkout-settled"]')).not.toBeNull();
        expect(f.componentInstance.receipt().charges).toEqual([{ description: 'Muayene', amount: 600 }]);
    });
});
