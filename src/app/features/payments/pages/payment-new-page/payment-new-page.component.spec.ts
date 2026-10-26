import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ClientBalanceVm, ClientOpenChargeVm } from '@/app/features/clients/models/client-balance-vm.model';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { PaymentNewPageComponent } from './payment-new-page.component';

const openCharge = (chargeId: string, over: Partial<ClientOpenChargeVm> = {}): ClientOpenChargeVm => ({
    chargeId,
    clinicId: 'c1',
    petId: 'p1',
    petName: 'Pamuk',
    visitId: null,
    visitArrivedAtUtc: null,
    examinationId: null,
    description: `Ücret ${chargeId}`,
    amount: 1000,
    allocatedAmount: 400,
    outstandingAmount: 600,
    createdAtUtc: '2026-10-10T07:00:00Z',
    ...over
});

const balance = (openCharges: ClientOpenChargeVm[]): ClientBalanceVm => ({
    clientId: 'cl1',
    clientName: 'Ali Veli',
    currency: 'TRY',
    chargedAmount: 1000,
    allocatedAmount: 400,
    outstandingAmount: 600,
    openCharges
});

/** Ödeme zamanı en çok 7 gün geriye girilebilir; sabit tarih zamanla pencereden çıkar, bu yüzden "1 saat önce" kullanılır. */
const recentPaidAtLocal = () => toIstanbulDateTimeLocalInputValue(new Date(Date.now() - 60 * 60 * 1000).toISOString());

const problem = (status: number, code: string) => new HttpErrorResponse({ status, error: { title: 'x', detail: 'Sunucu mesajı', extensions: { code } } });

describe('PaymentNewPageComponent', () => {
    let fixture: ComponentFixture<PaymentNewPageComponent>;
    let cmp: PaymentNewPageComponent;
    let payments: MockedObject<PaymentsService>;
    let clients: MockedObject<ClientsService>;
    let router: Router;
    let mutationBlocked: boolean;
    let query: Record<string, string>;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [PaymentNewPageComponent],
            providers: [
                provideRouter([]),
                { provide: PaymentsService, useValue: payments },
                { provide: ClientsService, useValue: clients },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'cl1', fullName: 'Ali Veli', phone: '—', petNames: [], label: 'Ali Veli' }) } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez', hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (k: string) => query[k] ?? null } } } }
            ]
        }).compileComponents();
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(PaymentNewPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    };

    const selectClient = () => {
        cmp.form.patchValue({ clientId: 'cl1', paidAtLocal: recentPaidAtLocal() });
        fixture.detectChanges();
    };

    beforeEach(() => {
        payments = {
            createPayment: vi.fn().mockName('PaymentsService.createPayment')
        } as unknown as MockedObject<PaymentsService>;
        clients = {
            getClientBalance: vi.fn().mockName('ClientsService.getClientBalance')
        } as unknown as MockedObject<ClientsService>;
        clients.getClientBalance.mockReturnValue(of(balance([openCharge('ch1'), openCharge('ch2', { outstandingAmount: 300 })])));
        mutationBlocked = false;
        query = {};
    });

    it('müşteri seçilince açık ücretleri yükler; yalnız aktif kliniğin ücretleri listelenir', async () => {
        clients.getClientBalance.mockReturnValue(of(balance([openCharge('ch1'), openCharge('other', { clinicId: 'c2' })])));
        await setup();
        selectClient();
        expect(clients.getClientBalance).toHaveBeenCalledWith('cl1');
        expect(cmp.openCharges().map((c) => c.chargeId)).toEqual(['ch1']);
    });

    it('tutar alanı yoktur; ödeme tutarı tahsis toplamıdır', async () => {
        await setup();
        selectClient();
        cmp.onAmountInput(cmp.openCharges()[0], '400');
        cmp.onAmountInput(cmp.openCharges()[1], '150,50');
        expect(cmp.total()).toBe(550.5);
        expect(fixture.nativeElement.querySelector('#amount')).toBeNull();
        expect(fixture.nativeElement.querySelector('#currency')).toBeNull();
    });

    it('kalan tutarı aşan satırda hata gösterir ve gönderimi engeller (601 / 600)', async () => {
        await setup();
        selectClient();
        cmp.onAmountInput(cmp.openCharges()[0], '601');
        fixture.detectChanges();
        expect(cmp.rowError(cmp.openCharges()[0])).toBe('Kalan tutarı aşamaz.');
        expect(cmp.canSubmit()).toBe(false);
        cmp.onSubmit();
        expect(payments.createPayment).not.toHaveBeenCalled();
    });

    it('tahsis girilmediyse gönderilmez', async () => {
        await setup();
        selectClient();
        expect(cmp.canSubmit()).toBe(false);
        cmp.onSubmit();
        expect(payments.createPayment).not.toHaveBeenCalled();
    });

    it('"Tamamı" kalan tutarı doldurur', async () => {
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[1]);
        expect(cmp.total()).toBe(300);
    });

    it('isteği requestId, TRY, tahsisler ve toplam tutarla gönderir; ayrıntıya yönlendirir', async () => {
        payments.createPayment.mockReturnValue(of({ id: 'pay1' }));
        await setup();
        selectClient();
        cmp.onAmountInput(cmp.openCharges()[0], '400');
        cmp.onAmountInput(cmp.openCharges()[1], '300');
        cmp.onSubmit();
        const req = vi.mocked(payments.createPayment).mock.lastCall![0];

        expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(req.currency).toBe('TRY');
        expect(req.amount).toBe(700);
        expect(req.clinicId).toBe('c1');
        expect(req.allocations).toEqual([
            { chargeId: 'ch1', amount: 400 },
            { chargeId: 'ch2', amount: 300 }
        ]);
        expect(router.navigate).toHaveBeenCalledWith(['/panel/payments', 'pay1'], { queryParams: { saved: '1' } });
    });

    it('çift tıklama: istek sürerken ikinci gönderim yapılmaz', async () => {
        payments.createPayment.mockReturnValue(
            new Subject<{
                id: string;
            }>()
        );
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        cmp.onSubmit();
        cmp.onSubmit();
        expect(payments.createPayment).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBe(true);
    });

    it('açık tutar değişti (409): güncel bakiyeyi yeniden okur, girilen tutarı korur, aynı requestId ile tekrar dener', async () => {
        payments.createPayment.mockReturnValueOnce(throwError(() => problem(409, 'PaymentAllocations.ExceedsOutstanding'))).mockReturnValueOnce(of({ id: 'pay1' }));
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        clients.getClientBalance.mockClear();
        clients.getClientBalance.mockReturnValue(of(balance([openCharge('ch1', { outstandingAmount: 500 })])));
        cmp.onSubmit();
        expect(cmp.submitError()).toContain('Açık tutarlar değişti');
        expect(clients.getClientBalance).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBe(false);
        // Girilen 600 yeni kalan 500'ü aştı: satır hatası, kullanıcı düzeltir.
        expect(cmp.rowError(cmp.openCharges()[0])).toBe('Kalan tutarı aşamaz.');
        cmp.onAmountInput(cmp.openCharges()[0], '500');
        cmp.onSubmit();
        const [first, second] = vi.mocked(payments.createPayment).mock.calls.map((a) => a[0].requestId);

        expect(second).toBe(first);
    });

    it('eşzamanlılık çakışması (409) da bakiyeyi yeniler', async () => {
        payments.createPayment.mockReturnValue(throwError(() => problem(409, 'Payments.ConcurrencyConflict')));
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        clients.getClientBalance.mockClear();
        cmp.onSubmit();
        expect(clients.getClientBalance).toHaveBeenCalledTimes(1);
        expect(cmp.submitError()).toContain('Açık tutarlar değişti');
    });

    it('aynı requestId farklı içerik (409) kullanıcıya listeyi kontrol etmesini söyler', async () => {
        payments.createPayment.mockReturnValue(throwError(() => problem(409, 'Payments.DuplicateRequestMismatch')));
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        cmp.onSubmit();
        expect(cmp.submitError()).toContain('Ödeme listesini kontrol edin');
    });

    it('müşterinin açık ücreti yoksa ücret ekleme bağlantısı gösterir ve gönderilemez', async () => {
        clients.getClientBalance.mockReturnValue(of(balance([])));
        await setup();
        selectClient();
        expect(fixture.nativeElement.textContent).toContain('açık ücreti yok');
        expect(fixture.nativeElement.querySelector('a[href*="/panel/charges/new"]')).not.toBeNull();
        expect(cmp.canSubmit()).toBe(false);
    });

    it('geliş bağlamıyla gelindiyse ücret ekleme bağlantısı müşteri yanında visitId de taşır', async () => {
        query = { clientId: 'cl1', visitId: 'v1' };
        clients.getClientBalance.mockReturnValue(of(balance([])));
        await setup();
        const href = (fixture.nativeElement.querySelector('a[href*="/panel/charges/new"]') as HTMLAnchorElement).getAttribute('href');

        expect(href).toContain('clientId=cl1');
        expect(href).toContain('visitId=v1');
    });

    it('bakiye yüklenemezse hata gösterir', async () => {
        clients.getClientBalance.mockReturnValue(throwError(() => new Error('Müşteri bakiyesi yüklenemedi.')));
        await setup();
        selectClient();
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('bakiyesi yüklenemedi');
    });

    it('muayene bağlamı: müşteri ön seçilir, o muayenenin ücretleri tam tutarla dolu gelir ve muayene ödemeye bağlanır', async () => {
        query = { clientId: 'cl1', examinationId: 'ex1' };
        clients.getClientBalance.mockReturnValue(of(balance([openCharge('ch1', { examinationId: 'ex1' }), openCharge('ch2', { examinationId: 'ex2' })])));
        payments.createPayment.mockReturnValue(of({ id: 'pay1' }));
        await setup();
        cmp.form.patchValue({ paidAtLocal: recentPaidAtLocal() });
        fixture.detectChanges();
        expect(cmp.form.controls.clientId.value).toBe('cl1');
        expect(cmp.allocations()).toEqual([{ chargeId: 'ch1', amount: 600 }]);
        cmp.onSubmit();
        expect(vi.mocked(payments.createPayment).mock.lastCall![0].examinationId).toBe('ex1');
    });

    it('geliş bağlamı: o gelişin ücretleri dolu gelir', async () => {
        query = { clientId: 'cl1', visitId: 'v1' };
        clients.getClientBalance.mockReturnValue(of(balance([openCharge('ch1', { visitId: 'v1' }), openCharge('ch2', { visitId: 'v2' })])));
        await setup();
        expect(cmp.allocations().map((a) => a.chargeId)).toEqual(['ch1']);
    });

    it('ücret bağlamı: yalnız o ücret tam tutarla dolu gelir, aynı gelişin diğer ücretleri boş kalır', async () => {
        query = { clientId: 'cl1', chargeId: 'ch2', visitId: 'v1' };
        clients.getClientBalance.mockReturnValue(of(balance([openCharge('ch1', { visitId: 'v1' }), openCharge('ch2', { visitId: 'v1' })])));
        await setup();
        expect(cmp.allocations().map((a) => a.chargeId)).toEqual(['ch2']);
    });

    it('müşteri değişince bağlam düşer ve tutarlar sıfırlanır', async () => {
        query = { clientId: 'cl1', examinationId: 'ex1' };
        clients.getClientBalance.mockReturnValue(of(balance([openCharge('ch1', { examinationId: 'ex1' })])));
        payments.createPayment.mockReturnValue(of({ id: 'pay1' }));
        await setup();
        cmp.form.patchValue({ clientId: 'cl2', paidAtLocal: recentPaidAtLocal() });
        cmp.fillOutstanding(cmp.openCharges()[0]);
        cmp.onSubmit();
        expect(vi.mocked(payments.createPayment).mock.lastCall![0].examinationId).toBeNull();
    });

    it('salt okunur kiracıda gönderilmez', async () => {
        mutationBlocked = true;
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        cmp.onSubmit();
        expect(payments.createPayment).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('salt okunur');
    });

    describe('ödeme zamanı alt sınırı (en çok 7 gün geri)', () => {
        afterEach(() => vi.useRealTimers());

        it('alt sınır sayfa açılışında sabitlenir: dakika değişince [min] değişmez (her CD turunda yeniden hesaplanınca NG0100)', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date('2026-10-19T10:28:59.900Z')); // İstanbul 13:28, dakika sınırının hemen öncesi
            await setup();
            const minOf = () => fixture.debugElement.query(By.css('app-date-input[inputId="paidAtLocal"]')).injector.get(DateInputComponent).min();

            expect(minOf()).toBe('2026-10-12T13:28');

            vi.setSystemTime(new Date('2026-10-19T10:30:00.000Z'));
            fixture.detectChanges();

            expect(minOf()).toBe('2026-10-12T13:28');
        });
    });
});
