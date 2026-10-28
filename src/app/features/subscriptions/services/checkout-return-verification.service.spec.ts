import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { SubscriptionCheckoutSessionVm, SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { CheckoutReturnVerificationService, type CheckoutReturnVerificationHost } from '@/app/features/subscriptions/services/checkout-return-verification.service';

const STORED_SESSION_KEY = 'veteriner.subscription.checkoutSessionId';

const session = (over: Partial<SubscriptionCheckoutSessionVm> = {}) => ({ checkoutSessionId: 'cs-9', targetPlanCode: 'premium', status: 'open', ...over }) as SubscriptionCheckoutSessionVm;

const summary = (over: Partial<SubscriptionSummaryVm> = {}) => ({ planCode: 'pro', isReadOnly: false, ...over }) as SubscriptionSummaryVm;

describe('CheckoutReturnVerificationService — ödeme dönüşü doğrulama turları', () => {
    let service: CheckoutReturnVerificationService;
    let toastAdd: Mock;
    let fetchSnapshot: Mock;
    let host: CheckoutReturnVerificationHost & { readonly applySummary: Mock; readonly setCheckoutSession: Mock };

    const snapshot = (s: SubscriptionCheckoutSessionVm, sum: SubscriptionSummaryVm) => of([s, sum] as const);

    beforeEach(() => {
        vi.useFakeTimers();
        sessionStorage.clear();
        toastAdd = vi.fn().mockName('MessageService.add');
        fetchSnapshot = vi.fn().mockName('host.fetchSnapshot');
        host = {
            fetchSnapshot,
            applySummary: vi.fn().mockName('host.applySummary'),
            setCheckoutSession: vi.fn().mockName('host.setCheckoutSession')
        };
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: MessageService, useValue: { add: toastAdd } }, CheckoutReturnVerificationService]
        });
        service = TestBed.inject(CheckoutReturnVerificationService);
    });

    afterEach(() => {
        vi.useRealTimers();
        sessionStorage.clear();
    });

    it('hedef plan özete yansıyınca başarı bandı, oturum temizlenir ve bildirim bir kez gösterilir', () => {
        sessionStorage.setItem(STORED_SESSION_KEY, 'cs-9');
        const finalized = session({ status: 'finalized' });
        const upgraded = summary({ planCode: 'Premium ' });

        fetchSnapshot.mockReturnValue(snapshot(finalized, upgraded));

        service.verify('cs-9', host);

        expect(fetchSnapshot).toHaveBeenCalledWith('cs-9');
        expect(host.setCheckoutSession.mock.calls).toEqual([[finalized], [null]]);
        expect(host.applySummary).toHaveBeenCalledWith(upgraded);
        expect(service.postCheckoutSyncing()).toBe(false);
        expect(service.postCheckoutPhase()).toBe('success');
        expect(service.returnBanner()).toEqual({ severity: 'success', title: 'Üyeliğiniz başarıyla güncellendi.', detail: 'Yeni paketiniz artık aktif.' });
        expect(sessionStorage.getItem(STORED_SESSION_KEY)).toBeNull();
        expect(toastAdd).toHaveBeenCalledOnce();
        expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Üyeliğiniz başarıyla güncellendi.', life: 8000 }));

        service.verify('cs-9', host);

        expect(toastAdd).toHaveBeenCalledTimes(1);
    });

    it('hedef plan yansımadıkça 2 sn arayla yoklar; istek hatasında 2,5 sn sonra yeniden dener', () => {
        fetchSnapshot.mockReturnValueOnce(snapshot(session(), summary())).mockReturnValueOnce(throwError(() => new Error('ağ'))).mockReturnValue(snapshot(session(), summary({ planCode: 'premium' })));

        service.verify('cs-9', host);

        expect(service.postCheckoutPhase()).toBe('processing');
        expect(service.returnBanner()).toBeNull();

        vi.advanceTimersByTime(1999);
        expect(fetchSnapshot).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(fetchSnapshot).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(2499);
        expect(fetchSnapshot).toHaveBeenCalledTimes(2);
        vi.advanceTimersByTime(1);
        expect(fetchSnapshot).toHaveBeenCalledTimes(3);
        expect(service.postCheckoutPhase()).toBe('success');
    });

    it('plan eşleşse de erişim salt okunursa yoklamaya devam eder', () => {
        fetchSnapshot.mockReturnValue(snapshot(session(), summary({ planCode: 'premium', isReadOnly: true })));

        service.verify('cs-9', host);
        vi.advanceTimersByTime(2000);

        expect(fetchSnapshot).toHaveBeenCalledTimes(2);
        expect(service.postCheckoutSyncing()).toBe(true);
    });

    it('ödeme başarısız sonlanırsa hata bandı; yoklama durur', () => {
        fetchSnapshot.mockReturnValue(snapshot(session({ status: 'failed' }), summary()));

        service.verify('cs-9', host);
        vi.advanceTimersByTime(10_000);

        expect(fetchSnapshot).toHaveBeenCalledTimes(1);
        expect(service.postCheckoutPhase()).toBe('error');
        expect(service.returnBanner()).toEqual({ severity: 'error', title: 'Ödeme tamamlanamadı.', detail: 'Gerekirse plan değişikliğini yeniden başlatabilirsiniz.', showRefreshCta: true });
    });

    it('oturum iptal edilmişse ikincil band', () => {
        fetchSnapshot.mockReturnValue(snapshot(session({ status: 'cancelled' }), summary()));

        service.verify('cs-9', host);

        expect(service.postCheckoutPhase()).toBe('warning');
        expect(service.returnBanner()).toEqual({ severity: 'secondary', title: 'Ödeme işlemi iptal edilmiş veya sonlandırılmış görünüyor.', showRefreshCta: true });
    });

    it('çift ödeme iadeye alındıysa bilgi bandı; yoklama durur', () => {
        fetchSnapshot.mockReturnValue(snapshot(session({ status: 'cancelled', duplicatePaymentRefund: true }), summary()));

        service.verify('cs-9', host);
        vi.advanceTimersByTime(10_000);

        expect(fetchSnapshot).toHaveBeenCalledTimes(1);
        expect(service.returnBanner()).toEqual({
            severity: 'info',
            title: 'Bu ödeme paketinize işlenmedi; iade ediliyor.',
            detail: 'Aynı ödeme işleminde önceki ödemeniz paketinizi zaten açtı. Bu ikinci ödeme kartınıza otomatik olarak iade edilir.',
            showRefreshCta: false
        });
    });

    describe('45 tur sonunda zaman aşımı', () => {
        const runAllRounds = () => {
            service.verify('cs-9', host);
            vi.advanceTimersByTime(45 * 2000);
        };

        it('paket yansımadıysa uyarı bandı; oturum kartta kalır', () => {
            const open = session();

            fetchSnapshot.mockReturnValue(snapshot(open, summary()));

            runAllRounds();

            expect(fetchSnapshot).toHaveBeenCalledTimes(46);
            expect(host.setCheckoutSession).toHaveBeenLastCalledWith(open);
            expect(service.postCheckoutSyncing()).toBe(false);
            expect(service.returnBanner()).toEqual(expect.objectContaining({ severity: 'warn', title: 'Ödeme tamamlandı ancak paket değişikliği henüz yansımadı.', showRefreshCta: true }));

            vi.advanceTimersByTime(10_000);
            expect(fetchSnapshot).toHaveBeenCalledTimes(46);
        });

        it('paket yansıdı ama erişim salt okunursa tam erişim uyarısı', () => {
            fetchSnapshot.mockReturnValue(snapshot(session(), summary({ planCode: 'premium', isReadOnly: true })));

            runAllRounds();

            expect(service.returnBanner()?.title).toBe('Paket bilgisi güncellendi; tam erişim birkaç saniye içinde açılabilir.');
        });

        it('son turda özet güncel görünürse oturum temizlenir, zaman aşımı uyarısı verilir', () => {
            sessionStorage.setItem(STORED_SESSION_KEY, 'cs-9');
            fetchSnapshot.mockReturnValue(throwError(() => new Error('ağ')));
            service.verify('cs-9', host);
            vi.advanceTimersByTime(44 * 2500);
            fetchSnapshot.mockReturnValue(snapshot(session(), summary({ planCode: 'premium' })));

            vi.advanceTimersByTime(2500);

            expect(fetchSnapshot).toHaveBeenCalledTimes(46);
            expect(host.setCheckoutSession).toHaveBeenLastCalledWith(null);
            expect(sessionStorage.getItem(STORED_SESSION_KEY)).toBeNull();
            expect(service.returnBanner()?.title).toBe('Ödeme doğrulaması zaman aşımına uğradı.');
            expect(toastAdd).not.toHaveBeenCalled();
        });

        it('son tur da başarısızsa doğrulanamadı uyarısı', () => {
            fetchSnapshot.mockReturnValue(throwError(() => new Error('ağ')));
            service.verify('cs-9', host);

            vi.advanceTimersByTime(45 * 2500);

            expect(fetchSnapshot).toHaveBeenCalledTimes(46);
            expect(service.postCheckoutSyncing()).toBe(false);
            expect(service.returnBanner()).toEqual({ severity: 'warn', title: 'Abonelik durumu doğrulanamadı.', detail: 'Bağlantınızı kontrol edip durumu yenileyin.', showRefreshCta: true });
        });
    });

    it('sağlayıcı yok edilince bekleyen tur iptal edilir', () => {
        fetchSnapshot.mockReturnValue(snapshot(session(), summary()));
        service.verify('cs-9', host);

        TestBed.resetTestingModule();
        vi.advanceTimersByTime(10_000);

        expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    });
});
