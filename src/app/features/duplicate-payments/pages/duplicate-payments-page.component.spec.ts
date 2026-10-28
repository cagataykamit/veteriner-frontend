import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { DuplicatePaymentDto } from '@/app/features/duplicate-payments/models/duplicate-payment.model';
import { DuplicatePaymentsService } from '@/app/features/duplicate-payments/services/duplicate-payments.service';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { DuplicatePaymentsPageComponent } from './duplicate-payments-page.component';

const row = (patch: Partial<DuplicatePaymentDto> = {}): DuplicatePaymentDto => ({
    checkoutSessionId: 'cs-1',
    tenantId: 't-1',
    tenantName: 'Pati Kliniği',
    targetPlanCode: 'pro',
    billingPeriod: 'Monthly',
    provider: 'Iyzico',
    amountMinor: 149900,
    currencyCode: 'TRY',
    detectedAtUtc: '2026-10-27T09:30:00Z',
    refundStatus: 'Pending',
    refundAttemptCount: 1,
    refundFailureReason: null,
    refundedAtUtc: null,
    ...patch
});

const ROWS: DuplicatePaymentDto[] = [
    row({ checkoutSessionId: 'cs-manual', tenantName: 'Mavi Veteriner', targetPlanCode: 'premium', billingPeriod: 'Yearly', refundStatus: 'ManualRequired', refundAttemptCount: 3, refundFailureReason: 'Sağlayıcı iadeyi reddetti.' }),
    row({ checkoutSessionId: 'cs-pending' }),
    row({ checkoutSessionId: 'cs-refunded', tenantName: null, tenantId: 't-9', targetPlanCode: 'basic', refundStatus: 'Refunded', refundedAtUtc: '2026-10-27T10:00:00Z', amountMinor: null })
];

describe('Çift ödemeler sayfası', () => {
    let service: MockedObject<DuplicatePaymentsService>;
    let fixture: ComponentFixture<DuplicatePaymentsPageComponent>;

    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const rows = (): HTMLElement[] => Array.from(el().querySelectorAll('[data-testid="dp-row"]'));

    const create = async (): Promise<void> => {
        TestBed.configureTestingModule({
            imports: [DuplicatePaymentsPageComponent],
            providers: [provideRouter([]), { provide: DuplicatePaymentsService, useValue: service }]
        });
        fixture = TestBed.createComponent(DuplicatePaymentsPageComponent);
        await fixture.whenStable();
    };

    const acceptConfirm = () => {
        const confirm = fixture.debugElement.injector.get(ConfirmationService);

        return vi.spyOn(confirm, 'confirm').mockImplementation((c) => {
            c.accept?.();

            return confirm;
        });
    };

    beforeEach(() => {
        service = {
            list: vi.fn().mockName('DuplicatePaymentsService.list'),
            markRefunded: vi.fn().mockName('DuplicatePaymentsService.markRefunded')
        } as unknown as MockedObject<DuplicatePaymentsService>;
        service.list.mockReturnValue(of(ROWS));
    });

    it('satırları kurum, paket ve dönem, tutar, tespit zamanı, deneme ve nedenle listeler', async () => {
        await create();

        expect(service.list).toHaveBeenCalledTimes(1);
        expect(el().textContent).toContain('ikinci bir ödeme gelirse otomatik iptal/iade edilir');

        const [manual, pending, refunded] = rows();

        expect(rows().length).toBe(3);
        expect(manual.textContent).toContain('Mavi Veteriner');
        expect(manual.textContent).toContain('Kurumsal · Yıllık');
        expect(manual.textContent).toContain(formatMoney(1499, 'TRY'));
        expect(manual.textContent).toContain(formatDateTimeDisplay('2026-10-27T09:30:00Z'));
        expect(manual.textContent).toContain('Sağlayıcı iadeyi reddetti.');
        expect(manual.textContent).toContain('3');
        expect(pending.textContent).toContain('Profesyonel · Aylık');
        expect(pending.textContent, 'neden yoksa tire').toContain('—');
        expect(refunded.textContent, 'kurum adı yoksa kimlik').toContain('t-9');
        expect(refunded.textContent).toContain('Temel · Aylık');
    });

    it('durum etiketleri: İade sürüyor, İade edildi, Elle iade gerekli', async () => {
        await create();

        const tags = rows().map((r) => r.querySelector('p-tag')?.textContent?.trim());

        expect(tags).toEqual(['Elle iade gerekli', 'İade sürüyor', 'İade edildi']);
    });

    it('İade edildi olarak işaretle yalnız ManualRequired satırda görünür', async () => {
        await create();

        const buttons = rows().map((r) => r.querySelector('[data-testid="dp-mark-refunded"]'));

        expect(buttons[0]?.textContent?.trim()).toBe('İade edildi olarak işaretle');
        expect(buttons[1]).toBeNull();
        expect(buttons[2]).toBeNull();
    });

    it('onaylanınca işaretleme çağrılır, liste yenilenir', async () => {
        service.markRefunded.mockReturnValue(of(undefined));
        await create();
        const confirm = acceptConfirm();

        (rows()[0].querySelector('[data-testid="dp-mark-refunded"]') as HTMLButtonElement).click();
        await fixture.whenStable();

        expect(confirm.mock.lastCall![0].message).toContain('iyzico panelinden iade ettikten sonra işaretleyin');
        expect(service.markRefunded).toHaveBeenCalledWith('cs-manual');
        expect(service.list).toHaveBeenCalledTimes(2);
    });

    it('işaretleme başarısızsa hata metni gösterilir, liste yenilenmez', async () => {
        service.markRefunded.mockReturnValue(throwError(() => new Error('Otomatik iade hâlâ sürüyor; sonuçlanınca durum güncellenir.')));
        await create();
        acceptConfirm();

        fixture.componentInstance.confirmMarkRefunded(ROWS[0]);
        await fixture.whenStable();

        expect(el().querySelector('[data-testid="dp-action-error"]')?.textContent).toContain('Otomatik iade hâlâ sürüyor');
        expect(service.list).toHaveBeenCalledTimes(1);
    });

    it('liste boşsa "Çift ödeme yok." gösterir', async () => {
        service.list.mockReturnValue(of([]));
        await create();

        expect(rows().length).toBe(0);
        expect(el().querySelector('app-empty-state')?.textContent).toContain('Çift ödeme yok.');
    });

    it('liste alınamazsa hata durumu gösterir', async () => {
        service.list.mockReturnValue(throwError(() => new Error('Çift ödemeler yüklenemedi.')));
        await create();

        expect(el().querySelector('app-error-state')?.textContent).toContain('Çift ödemeler yüklenemedi.');
    });
});
