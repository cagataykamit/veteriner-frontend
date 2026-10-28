import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MockedObject } from 'vitest';
import { NEVER, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { SUBSCRIPTIONS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ExampleClinicService } from '@/app/entities/example-clinic/services/example-clinic.service';
import { DiscountCodesService } from '@/app/entities/sales-partner/services/discount-codes.service';
import type { PendingPlanChangeVm, SubscriptionCheckoutSessionVm, SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { SubscriptionsService } from '@/app/entities/subscription/services/subscriptions.service';
import { SubscriptionPageComponent } from './subscription-page.component';

const STORED_SESSION_KEY = 'veteriner.subscription.checkoutSessionId';

const summary = (over: Partial<SubscriptionSummaryVm> = {}): SubscriptionSummaryVm => ({
    tenantId: 't1',
    tenantName: 'Merkez Pati Kliniği',
    planCode: 'pro',
    planName: 'Pro',
    statusRaw: 1,
    status: 'active',
    trialStartsAtUtc: null,
    trialEndsAtUtc: null,
    daysRemaining: 20,
    currentPeriodStartUtc: '2026-10-01T00:00:00Z',
    currentPeriodEndUtc: '2099-11-01T00:00:00Z',
    billingCycleAnchorUtc: null,
    nextBillingAtUtc: '2099-11-01T00:00:00Z',
    pendingPlanChange: null,
    isReadOnly: false,
    canManageSubscription: true,
    availablePlans: [
        { code: 'basic', name: 'Basic', description: 'Küçük klinikler için', maxUsers: 2 },
        { code: 'pro', name: 'Pro', description: 'Büyüyen klinikler için', maxUsers: 5 },
        { code: 'premium', name: 'Premium', description: 'Çok şubeli kurumlar için', maxUsers: null }
    ],
    billingPeriod: 'Monthly',
    ...over
});

const session = (over: Partial<SubscriptionCheckoutSessionVm> = {}): SubscriptionCheckoutSessionVm => ({
    checkoutSessionId: 'cs-1',
    tenantId: 't1',
    currentPlanCode: 'pro',
    targetPlanCode: 'premium',
    statusRaw: 'open',
    status: 'open',
    provider: 'iyzico',
    checkoutUrl: 'https://odeme.example/cs-1',
    canContinue: true,
    expiresAtUtc: '2099-11-01T10:00:00Z',
    externalReference: null,
    proratedChargeMinor: null,
    chargeCurrencyCode: null,
    prorationRatio: null,
    billingPeriod: 'Monthly',
    ...over
});

const pendingDowngrade: PendingPlanChangeVm = {
    currentPlanCode: 'pro',
    targetPlanCode: 'basic',
    changeTypeRaw: 'Downgrade',
    changeType: 'downgrade',
    statusRaw: 'Scheduled',
    status: 'scheduled',
    effectiveAtUtc: '2099-11-01T00:00:00Z'
};

describe('SubscriptionPageComponent', () => {
    let fixture: ComponentFixture<SubscriptionPageComponent>;
    let service: MockedObject<SubscriptionsService>;
    let claims: string[];
    let queryParams: Record<string, string>;
    const tenantReadOnly = { applySummary: vi.fn().mockName('TenantReadOnlyContextService.applySummary') };

    const el = () => fixture.nativeElement as HTMLElement;
    const text = () => el().textContent ?? '';
    const buttons = () => Array.from(el().querySelectorAll('button')) as HTMLButtonElement[];
    const buttonLabels = () => buttons().map((b) => b.textContent?.trim() ?? '');

    const button = (label: string) => {
        const b = buttons().find((x) => x.textContent?.trim() === label);

        if (!b) {
            throw new Error(`Düğme yok: ${label}; mevcut: ${buttonLabels().join(' | ')}`);
        }

        return b;
    };

    const click = (label: string) => {
        button(label).click();
        fixture.detectChanges();
    };

    const chooseYearly = () => {
        const yearly = Array.from(el().querySelectorAll('p-selectbutton p-togglebutton')).find((x) => x.textContent?.includes('Yıllık · 2 ay hediye')) as HTMLElement;

        yearly.click();
        fixture.detectChanges();
    };

    const render = () => {
        TestBed.configureTestingModule({
            imports: [SubscriptionPageComponent],
            providers: [
                provideRouter([]),
                { provide: SubscriptionsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: tenantReadOnly },
                { provide: DiscountCodesService, useValue: { getSubscriptionDiscount: () => NEVER, applySubscriptionDiscount: () => NEVER } },
                { provide: ExampleClinicService, useValue: { getStatus: () => NEVER, load: () => NEVER, clear: () => NEVER } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } }
            ]
        });
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(SubscriptionPageComponent);
        fixture.detectChanges();
    };

    beforeEach(() => {
        sessionStorage.clear();
        claims = [SUBSCRIPTIONS_MANAGE_CLAIM];
        queryParams = {};
        tenantReadOnly.applySummary.mockReset();
        service = {
            getSubscriptionSummary: vi.fn().mockName('SubscriptionsService.getSubscriptionSummary'),
            getPendingPlanChange: vi.fn().mockName('SubscriptionsService.getPendingPlanChange'),
            startCheckout: vi.fn().mockName('SubscriptionsService.startCheckout'),
            getCheckout: vi.fn().mockName('SubscriptionsService.getCheckout'),
            finalizeCheckout: vi.fn().mockName('SubscriptionsService.finalizeCheckout'),
            cancelCheckout: vi.fn().mockName('SubscriptionsService.cancelCheckout'),
            scheduleDowngrade: vi.fn().mockName('SubscriptionsService.scheduleDowngrade'),
            cancelPendingPlanChange: vi.fn().mockName('SubscriptionsService.cancelPendingPlanChange')
        } as unknown as MockedObject<SubscriptionsService>;
        service.getSubscriptionSummary.mockReturnValue(of(summary()));
        service.getPendingPlanChange.mockReturnValue(of(null));
    });

    afterEach(() => {
        fixture?.destroy();
        sessionStorage.clear();
    });

    describe('yükleme, hata ve boş durumlar', () => {
        it('özet gelene kadar yükleniyor durumu gösterilir', () => {
            service.getSubscriptionSummary.mockReturnValue(NEVER);
            render();

            expect(text()).toContain('Abonelik özeti yükleniyor…');
            expect(text()).not.toContain('Kurum özeti');
        });

        it('özet alınamazsa hata durumu ve Tekrar dene ile yeniden yükleme', () => {
            service.getSubscriptionSummary.mockReturnValue(throwError(() => new Error('Sunucuya ulaşılamadı.')));
            render();

            expect(text()).toContain('Abonelik özeti alınamadı');
            expect(text()).toContain('Sunucuya ulaşılamadı.');

            service.getSubscriptionSummary.mockReturnValue(of(summary()));
            click('Tekrar dene');

            expect(service.getSubscriptionSummary).toHaveBeenCalledTimes(2);
            expect(text()).toContain('Kurum özeti');
        });

        it('plan listesi boşsa boş durum metni', () => {
            service.getSubscriptionSummary.mockReturnValue(of(summary({ availablePlans: [] })));
            render();

            expect(text()).toContain('Plan listesi bulunamadı.');
        });

        it('fiyatı talep üzerine olan plan "İletişime geçin" gösterir', () => {
            render();

            expect(text()).toContain('İletişime geçin');
        });

        it('ilk yüklemede özet önbelleği atlanmaz ve salt okunur bağlamına uygulanır', () => {
            render();

            expect(service.getSubscriptionSummary).toHaveBeenCalledWith({ bustCache: false });
            expect(service.getPendingPlanChange).toHaveBeenCalledWith({ bustCache: false });
            expect(tenantReadOnly.applySummary).toHaveBeenCalledWith(expect.objectContaining({ tenantName: 'Merkez Pati Kliniği', pendingPlanChange: null }));
        });
    });

    describe('görünür metin ve düğmeler', () => {
        it('etkin aylık abonelikte özet, dönem, erişim ve plan kartları', () => {
            render();
            const t = text();

            for (const s of ['Abonelik', 'Kurum özeti', 'Merkez Pati Kliniği', 'Mevcut plan', 'Profesyonel', 'Dönem bilgisi', 'Ödeme dönemi', 'Aylık', 'Dönem başlangıcı', 'Dönem sonu', 'Sonraki yenileme', 'Kalan gün', '20 gün']) {
                expect(t).toContain(s);
            }

            expect(t).toContain('Erişim durumu');
            expect(t).toContain('Kurum erişimi');
            expect(t).toContain('Aktif');
            expect(t).toContain('Evet');
            expect(t).toContain('Paket yükseltmeleri güvenli ödeme adımıyla tamamlanır.');
            expect(t).toContain('Kullanılabilir planlar');
            expect(t).toContain('Temel');
            expect(t).toContain('Kurumsal');
            expect(t).toContain('Mevcut');
            expect(t).toContain('Küçük klinikler için');
            expect(t).toContain('Yıllık ödemede 12 ay için 10 ay ücreti alınır');
            expect(t).toContain('Bilgi');
            expect(t).toContain('Ödemeler iyzico altyapısı üzerinden güvenli şekilde tamamlanır.');
            expect(t).toContain('Paket düşürme işlemleri mevcut fatura dönemi sonunda uygulanır.');
            expect(t).toContain('Ödeme durumu');
            expect(t).toContain('Henüz başlatılmış bir ödeme işlemi bulunmuyor.');

            const labels = buttonLabels();

            expect(labels).toContain('Dönem sonunda bu pakete geç');
            expect(labels).toContain('Hemen yükselt');
            expect(labels).not.toContain('Yıllığa geç');
            expect(labels).not.toContain('Ödeme başlat');
        });

        it('yıllık dönem seçilince mevcut pakette Yıllığa geç düğmesi çıkar', () => {
            render();
            chooseYearly();

            expect(buttonLabels()).toContain('Yıllığa geç');
        });

        it('deneme sürerken dönem seçimi yok, deneme metinleri gösterilir', () => {
            service.getSubscriptionSummary.mockReturnValue(of(summary({ status: 'trialing', trialStartsAtUtc: '2026-10-01T00:00:00Z', trialEndsAtUtc: '2099-10-15T00:00:00Z', daysRemaining: 9 })));
            render();
            const t = text();

            expect(t).toContain('Deneme başlangıcı');
            expect(t).toContain('Deneme bitişi');
            expect(t).toContain('Kalan deneme süresi');
            expect(t).toContain('Deneme süreniz boyunca plan değişiklikleri ödeme gerektirmez.');
            expect(t).not.toContain('Ödeme dönemi');
            expect(t).not.toContain('Yıllık ödemede 12 ay için 10 ay ücreti alınır');
            expect(buttonLabels()).toContain('Deneme bitiminde bu pakete geç');
        });

        it('yönetim yetkisi yoksa plan bilgileri salt gösterilir; bekleyen değişiklik sorgulanmaz', () => {
            claims = [];
            render();
            const t = text();

            expect(t).toContain('Plan bilgileri');
            expect(t).toContain('Plan değişikliği için kurum yöneticinizle iletişime geçin.');
            expect(t).not.toContain('Ödeme durumu');
            expect(t).not.toContain('Bilgi');
            expect(buttonLabels()).not.toContain('Hemen yükselt');
            expect(service.getPendingPlanChange).not.toHaveBeenCalled();
        });

        it('süresi dolmuş salt okunur abonelikte uyarı ve yenileme düğmeleri', () => {
            service.getSubscriptionSummary.mockReturnValue(of(summary({ status: 'readonly', isReadOnly: true, daysRemaining: 0, currentPeriodEndUtc: '2026-09-01T00:00:00Z', nextBillingAtUtc: null })));
            render();
            const t = text();

            expect(t).toContain('Abonelik süreniz sona erdi. Yazma işlemlerini açmak için paket seçip ödeme yapın.');
            expect(t).toContain('Süre bitişi');
            expect(t).toContain('Yenileme bekliyor');
            expect(t).toContain('Süre doldu');
            expect(t).toContain('Salt okunur');
            expect(t).toContain('Aboneliğinizi yenilemek için mevcut paketinizde veya istediğiniz pakette ödeme adımını başlatın.');

            const labels = buttonLabels();

            expect(labels).toContain('Aboneliği yenile');
            expect(labels).toContain('Bu paketle devam et');
            expect(labels).toContain('Ödeme başlat');
        });
    });

    describe('ana eylemler', () => {
        it('Hemen yükselt ödeme oturumu başlatır; oturum kartta gösterilir ve saklanır', () => {
            service.startCheckout.mockReturnValue(of(session()));
            render();

            click('Hemen yükselt');

            expect(service.startCheckout).toHaveBeenCalledWith('premium', 'Monthly');
            expect(sessionStorage.getItem(STORED_SESSION_KEY)).toBe('cs-1');
            expect(text()).toContain('Hedef paket');
            expect(text()).toContain('Güvenli ödeme sayfasına yönlendirileceksiniz.');
            expect(buttonLabels()).toContain('Ödemeye devam et');
            expect(buttonLabels()).toContain('Durumu yenile');
        });

        it('yıllık seçiliyken yükseltme yıllık dönemle başlatılır', () => {
            service.startCheckout.mockReturnValue(of(session({ billingPeriod: 'Yearly' })));
            render();
            chooseYearly();
            click('Hemen yükselt');

            expect(service.startCheckout).toHaveBeenCalledWith('premium', 'Yearly');
        });

        it('ödeme başlatılamazsa hata metni gösterilir', () => {
            service.startCheckout.mockReturnValue(throwError(() => new Error('Ödeme sağlayıcısı yanıt vermedi.')));
            render();

            click('Hemen yükselt');

            expect(text()).toContain('Ödeme sağlayıcısı yanıt vermedi.');
        });

        it('oturumu yenile ödeme durumunu yeniden çeker', () => {
            service.startCheckout.mockReturnValue(of(session()));
            service.getCheckout.mockReturnValue(of(session({ status: 'processing' })));
            render();
            click('Hemen yükselt');

            click('Durumu yenile');

            expect(service.getCheckout).toHaveBeenCalledWith('cs-1');
        });

        it('manuel sağlayıcıda Ödemeyi tamamla oturumu sonlandırır ve özeti yeniden yükler', () => {
            service.startCheckout.mockReturnValue(of(session({ provider: 'manual', checkoutUrl: null })));
            service.finalizeCheckout.mockReturnValue(of(session({ provider: 'manual', checkoutUrl: null, status: 'finalized', canContinue: false })));
            render();
            click('Hemen yükselt');

            click('Ödemeyi tamamla');

            expect(service.finalizeCheckout).toHaveBeenCalledWith('cs-1');
            expect(service.getSubscriptionSummary).toHaveBeenCalledTimes(2);
            expect(text()).toContain('Bu ödeme işlemi artık devam ettirilemiyor.');
        });

        it('paket düşürme dönem sonuna planlanır, özet yenilenir ve bilgi verilir', () => {
            service.scheduleDowngrade.mockReturnValue(of(summary()));
            render();
            service.getPendingPlanChange.mockReturnValue(of(pendingDowngrade));

            click('Dönem sonunda bu pakete geç');

            expect(service.scheduleDowngrade).toHaveBeenCalledWith('basic');
            expect(service.getSubscriptionSummary).toHaveBeenCalledTimes(2);
            expect(text()).toContain('Paket düşürme dönem sonuna planlandı.');
            expect(text()).toContain('Bekleyen plan değişikliği');
            expect(text()).toContain('Dönem sonunda paket düşürme');
            expect(text()).toContain('Planlandı');
            expect(text()).toContain('Bu değişiklik ödeme gerektirmez. Mevcut dönem bitiminde');
            expect(text()).not.toContain('Ödeme durumu');
        });

        it('paket düşürme başarısızsa hata metni', () => {
            service.scheduleDowngrade.mockReturnValue(throwError(() => new Error('Düşürme reddedildi.')));
            render();

            click('Dönem sonunda bu pakete geç');

            expect(text()).toContain('Düşürme reddedildi.');
        });

        it('bekleyen geçiş iptal edilir ve bilgi verilir', () => {
            service.getPendingPlanChange.mockReturnValue(of(pendingDowngrade));
            service.cancelPendingPlanChange.mockReturnValue(of(summary()));
            render();
            service.getPendingPlanChange.mockReturnValue(of(null));

            click('Bekleyen geçişi iptal et');

            expect(service.cancelPendingPlanChange).toHaveBeenCalled();
            expect(text()).toContain('Bekleyen plan değişikliği iptal edildi.');
            expect(text()).not.toContain('Hedef plan');
        });

        it('salt okunur abonelikte Ödeme başlat mevcut paket için ödeme açar', () => {
            service.getSubscriptionSummary.mockReturnValue(of(summary({ status: 'readonly', isReadOnly: true, daysRemaining: 0, currentPeriodEndUtc: '2026-09-01T00:00:00Z' })));
            service.startCheckout.mockReturnValue(of(session({ targetPlanCode: 'pro', proratedChargeMinor: 99900, chargeCurrencyCode: 'TRY' })));
            render();

            click('Ödeme başlat');

            expect(service.startCheckout).toHaveBeenCalledWith('pro', 'Monthly');
            expect(text()).toContain('Ödenecek tutar:');
        });
    });

    describe('ödeme dönüşü', () => {
        it('başarılı dönüşte özet önbelleksiz çekilir, hedef plan yansıyınca başarı bildirilir', () => {
            queryParams = { session_id: 'cs-9' };
            service.getSubscriptionSummary.mockReturnValue(of(summary({ planCode: 'premium', planName: 'Premium' })));
            service.getCheckout.mockReturnValue(of(session({ checkoutSessionId: 'cs-9', status: 'finalized' })));
            render();

            expect(service.getSubscriptionSummary).toHaveBeenCalledWith({ bustCache: true });
            expect(service.getCheckout).toHaveBeenCalledWith('cs-9');
            expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
            expect(text()).toContain('Üyeliğiniz başarıyla güncellendi.');
            expect(text()).toContain('Yeni paketiniz artık aktif.');
            expect(text()).not.toContain('Ödeme sonucu işleniyor.');
        });

        it('ödeme başarısız sonlanırsa hata bandı ve Durumu yenile', () => {
            queryParams = { session_id: 'cs-9' };
            service.getCheckout.mockReturnValue(of(session({ checkoutSessionId: 'cs-9', status: 'failed', canContinue: false })));
            render();

            expect(text()).toContain('Ödeme tamamlanamadı.');
            expect(text()).toContain('Gerekirse plan değişikliğini yeniden başlatabilirsiniz.');
            expect(buttonLabels().filter((l) => l === 'Durumu yenile').length).toBeGreaterThan(0);
        });

        it('iptal dönüşünde oturum kapatılır; eski ödeme sayfasına devam önerilmez', () => {
            queryParams = { session_id: 'cs-9', status: 'cancel' };
            service.cancelCheckout.mockReturnValue(of(undefined));
            render();

            expect(text()).toContain('Ödeme sayfasından ayrıldınız veya işlemi iptal ettiniz.');
            expect(text()).toContain('Ödeme alınmadı. Ödemeyi yeniden başlatabilirsiniz.');
            expect(service.cancelCheckout).toHaveBeenCalledWith('cs-9');
            expect(service.getCheckout).not.toHaveBeenCalled();
            expect(buttonLabels()).not.toContain('Ödemeye devam et');
        });

        it('iptal dönüşünde oturum kapatılamasa da eski sayfaya devam önerilmez', () => {
            queryParams = { session_id: 'cs-9', status: 'cancel' };
            service.cancelCheckout.mockReturnValue(throwError(() => new Error('ağ')));
            render();

            expect(service.cancelCheckout).toHaveBeenCalledWith('cs-9');
            expect(buttonLabels()).not.toContain('Ödemeye devam et');
        });
    });
});
