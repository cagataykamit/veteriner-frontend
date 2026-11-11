import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClientCreditDto } from '@/app/entities/client-credit/models/client-credit-api.model';
import { ClientCreditsService } from '@/app/entities/client-credit/services/client-credits.service';
import { ClientCreditsPanelComponent } from './client-credits-panel.component';

const credit = (id: string, over: Partial<ClientCreditDto> = {}): ClientCreditDto => ({
    id,
    clinicId: 'k1',
    clientId: 'c1',
    sourcePaymentId: `pay-${id}`,
    source: 'Overpayment',
    status: 'Open',
    amount: 400,
    usedAmount: 250,
    remainingAmount: 150,
    currency: 'TRY',
    createdAtUtc: '2026-10-30T10:00:00Z',
    createdByUserId: 'u1',
    refundedAtUtc: null,
    refundedAmount: null,
    refundMethod: null,
    refundReason: null,
    voidedAtUtc: null,
    applications: [
        { id: 'a1', chargeId: 'ch1', chargeDescription: 'Muayene', amount: 250, createdAtUtc: '2026-10-30T11:00:00Z', reversedAtUtc: null, reverseReason: null },
        { id: 'a2', chargeId: 'ch2', chargeDescription: 'Aşı', amount: 50, createdAtUtc: '2026-10-30T11:05:00Z', reversedAtUtc: '2026-10-30T12:00:00Z', reverseReason: 'Yanlış ücret' }
    ],
    isImported: false,
    ...over
});

const strip = (s: string | null | undefined) => (s ?? '').replace(/\s/g, '');

describe('ClientCreditsPanelComponent (müşteri kartı kredisi)', () => {
    let fixture: ComponentFixture<ClientCreditsPanelComponent>;
    let cmp: ClientCreditsPanelComponent;
    let service: MockedObject<ClientCreditsService>;
    let claims: Set<string>;
    let query: Record<string, string>;
    let toast: ReturnType<typeof vi.fn>;

    const el = () => fixture.nativeElement as HTMLElement;

    const setup = () => {
        TestBed.configureTestingModule({
            imports: [ClientCreditsPanelComponent],
            providers: [
                provideRouter([]),
                { provide: ClientCreditsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false, lockedPlanFeature: () => null } },
                { provide: CashRegistersService, useValue: { list: () => of([]) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: MessageService, useValue: { add: toast } }
            ]
        });
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(ClientCreditsPanelComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('clientId', 'c1');
        fixture.detectChanges();
    };

    beforeEach(() => {
        service = {
            getCredits: vi
                .fn()
                .mockName('ClientCreditsService.getCredits')
                .mockReturnValue(of([credit('cr1'), credit('cr2', { source: 'Prepayment', amount: 300, usedAmount: 0, remainingAmount: 300, applications: [] })])),
            reverseApplication: vi.fn().mockName('ClientCreditsService.reverseApplication').mockReturnValue(of(undefined)),
            refundCredit: vi
                .fn()
                .mockName('ClientCreditsService.refundCredit')
                .mockReturnValue(of(credit('cr2', { status: 'Refunded' })))
        } as unknown as MockedObject<ClientCreditsService>;
        claims = new Set(['Charges.Read']);
        query = {};
        toast = vi.fn();
    });

    it('Charges.Read yoksa istek atılmaz, bölüm çizilmez', () => {
        claims.clear();
        setup();
        expect(service.getCredits).not.toHaveBeenCalled();
        expect(el().querySelector('[data-testid="client-credits"]')).toBeNull();
    });

    it('kredi yoksa ve kapalılar gösterilmiyorsa bölüm çizilmez', () => {
        service.getCredits.mockReturnValue(of([]));
        setup();
        expect(service.getCredits).toHaveBeenCalledWith('c1', false);
        expect(el().querySelector('[data-testid="client-credits"]')).toBeNull();
    });

    it('açık krediler: kaynak, tutar, kullanılan, kalan; kullanılabilir toplam ve mahsuplar', () => {
        setup();
        const rows = el().querySelectorAll('[data-testid="client-credit-row"]');

        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Fazla ödeme');
        expect(rows[0].textContent).toContain('Açık');
        expect(strip(rows[0].textContent)).toContain('Tutar₺400,00');
        expect(strip(rows[0].textContent)).toContain('Kullanılan₺250,00');
        expect(strip(rows[0].textContent)).toContain('Kalan₺150,00');
        expect(rows[1].textContent).toContain('Avans');
        expect(strip(el().querySelector('[data-testid="client-credits-available"]')?.textContent)).toContain('₺450,00');

        const apps = rows[0].querySelectorAll('[data-testid="client-credit-application"]');

        expect(apps.length).toBe(2);
        expect(apps[0].textContent).toContain('Muayene');
        expect(apps[1].textContent).toContain('Geri alındı');
        expect(apps[1].textContent).toContain('Yanlış ücret');
    });

    it('devir alacağı: eski program etiketi, kaynak ödeme bağlantısı yok, iade edilebilir', () => {
        service.getCredits.mockReturnValue(
            of([credit('cr9', { source: 'OpeningBalance', sourcePaymentId: null, isImported: true, amount: 500, usedAmount: 0, remainingAmount: 500, applications: [] })])
        );
        claims.add('Payments.Correct');
        setup();
        const row = el().querySelector('[data-testid="client-credit-row"]') as HTMLElement;

        expect(row.textContent).toContain('Devir alacağı (eski program)');
        expect(row.textContent).not.toContain('Kaynak ödeme');
        expect(row.querySelector('[data-testid="client-credit-refund"]')).not.toBeNull();
    });

    it('"Kapalıları göster" kapalı kredileri ister; kayıt yoksa bölüm açık kalır', () => {
        setup();
        service.getCredits.mockReturnValue(of([]));
        cmp.includeClosed.set(true);
        fixture.detectChanges();
        expect(service.getCredits).toHaveBeenLastCalledWith('c1', true);
        expect(el().querySelector('[data-testid="client-credits"]')?.textContent).toContain('kredi kaydı yok');
    });

    it('Payments.Correct yoksa İade et ve Geri al görünmez', () => {
        setup();
        expect(el().querySelector('[data-testid="client-credit-refund"]')).toBeNull();
        expect(el().querySelector('[data-testid="client-credit-reverse"]')).toBeNull();
    });

    it('Payments.Correct ile iade: kalanı olan açık kredide düğme; seçilen yöntem ve gerekçe gider, liste yenilenir', () => {
        claims.add('Payments.Correct');
        setup();
        expect(el().querySelectorAll('[data-testid="client-credit-refund"]').length).toBe(2);
        // Geri alınmış mahsupta "Geri al" yok; yalnız etkin mahsupta var.
        expect(el().querySelectorAll('[data-testid="client-credit-reverse"]').length).toBe(1);

        const target = cmp.credits()![1];

        cmp.openRefund(target);
        cmp.refundMethod.set('transfer');
        cmp.refund('Müşteri istedi').subscribe();
        expect(service.refundCredit).toHaveBeenCalledWith('c1', 'cr2', 'Müşteri istedi', 'transfer', null);

        service.getCredits.mockClear();
        cmp.afterChange('Kredi iade edildi.', 'x');
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Kredi iade edildi.' }));
        expect(service.getCredits).toHaveBeenCalledTimes(1);
    });

    it('Payments.Correct ile mahsup geri alma: mahsup kimliği ve gerekçe gider', () => {
        claims.add('Payments.Correct');
        setup();
        const c = cmp.credits()![0];

        cmp.openReverse(c, c.applications[0]);
        cmp.reverse('Yanlış ücrete mahsup').subscribe();
        expect(service.reverseApplication).toHaveBeenCalledWith('c1', 'a1', 'Yanlış ücrete mahsup');
    });

    it('iade edilmiş kredide İade et ve Geri al yoktur; iade bilgisi yazılır', () => {
        claims.add('Payments.Correct');
        service.getCredits.mockReturnValue(of([credit('cr1', { status: 'Refunded', remainingAmount: 0, refundedAtUtc: '2026-10-31T09:00:00Z', refundedAmount: 150, refundMethod: 'Cash', refundReason: 'Müşteri istedi' })]));
        setup();
        const row = el().querySelector('[data-testid="client-credit-row"]')!;

        expect(row.textContent).toContain('İade edildi');
        expect(row.textContent).toContain('Nakit');
        expect(row.textContent).toContain('Müşteri istedi');
        expect(row.querySelector('[data-testid="client-credit-refund"]')).toBeNull();
        expect(row.querySelector('[data-testid="client-credit-reverse"]')).toBeNull();
    });

    it('ödeme ekranından krediden ödeme sonrası gelindiyse bilgi mesajı bir kez gösterilir, anahtar adresten silinir', () => {
        query = { creditApplied: '1' };
        setup();
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Krediden ödendi.' }));
        expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { creditApplied: null }, replaceUrl: true }));
    });
});
