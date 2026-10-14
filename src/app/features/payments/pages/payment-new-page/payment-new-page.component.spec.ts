import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ClientBalanceVm, ClientOpenChargeVm } from '@/app/features/clients/models/client-balance-vm.model';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
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

const problem = (status: number, code: string) =>
    new HttpErrorResponse({ status, error: { title: 'x', detail: 'Sunucu mesajı', extensions: { code } } });

describe('PaymentNewPageComponent', () => {
    let fixture: ComponentFixture<PaymentNewPageComponent>;
    let cmp: PaymentNewPageComponent;
    let payments: jasmine.SpyObj<PaymentsService>;
    let clients: jasmine.SpyObj<ClientsService>;
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
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(PaymentNewPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    };

    const selectClient = () => {
        cmp.form.patchValue({ clientId: 'cl1', paidAtLocal: '2026-10-12T10:00' });
        fixture.detectChanges();
    };

    beforeEach(() => {
        payments = jasmine.createSpyObj<PaymentsService>('PaymentsService', ['createPayment']);
        clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClientBalance']);
        clients.getClientBalance.and.returnValue(of(balance([openCharge('ch1'), openCharge('ch2', { outstandingAmount: 300 })])));
        mutationBlocked = false;
        query = {};
    });

    it('müşteri seçilince açık ücretleri yükler; yalnız aktif kliniğin ücretleri listelenir', async () => {
        clients.getClientBalance.and.returnValue(of(balance([openCharge('ch1'), openCharge('other', { clinicId: 'c2' })])));
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
        expect(cmp.canSubmit()).toBeFalse();
        cmp.onSubmit();
        expect(payments.createPayment).not.toHaveBeenCalled();
    });

    it('tahsis girilmediyse gönderilmez', async () => {
        await setup();
        selectClient();
        expect(cmp.canSubmit()).toBeFalse();
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
        payments.createPayment.and.returnValue(of({ id: 'pay1' }));
        await setup();
        selectClient();
        cmp.onAmountInput(cmp.openCharges()[0], '400');
        cmp.onAmountInput(cmp.openCharges()[1], '300');
        cmp.onSubmit();
        const req = payments.createPayment.calls.mostRecent().args[0];
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
        payments.createPayment.and.returnValue(new Subject<{ id: string }>());
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        cmp.onSubmit();
        cmp.onSubmit();
        expect(payments.createPayment).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBeTrue();
    });

    it('açık tutar değişti (409): güncel bakiyeyi yeniden okur, girilen tutarı korur, aynı requestId ile tekrar dener', async () => {
        payments.createPayment.and.returnValues(throwError(() => problem(409, 'PaymentAllocations.ExceedsOutstanding')), of({ id: 'pay1' }));
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        clients.getClientBalance.calls.reset();
        clients.getClientBalance.and.returnValue(of(balance([openCharge('ch1', { outstandingAmount: 500 })])));
        cmp.onSubmit();
        expect(cmp.submitError()).toContain('Açık tutarlar değişti');
        expect(clients.getClientBalance).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBeFalse();
        // Girilen 600 yeni kalan 500'ü aştı: satır hatası, kullanıcı düzeltir.
        expect(cmp.rowError(cmp.openCharges()[0])).toBe('Kalan tutarı aşamaz.');
        cmp.onAmountInput(cmp.openCharges()[0], '500');
        cmp.onSubmit();
        const [first, second] = payments.createPayment.calls.allArgs().map((a) => a[0].requestId);
        expect(second).toBe(first);
    });

    it('eşzamanlılık çakışması (409) da bakiyeyi yeniler', async () => {
        payments.createPayment.and.returnValue(throwError(() => problem(409, 'Payments.ConcurrencyConflict')));
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        clients.getClientBalance.calls.reset();
        cmp.onSubmit();
        expect(clients.getClientBalance).toHaveBeenCalledTimes(1);
        expect(cmp.submitError()).toContain('Açık tutarlar değişti');
    });

    it('aynı requestId farklı içerik (409) kullanıcıya listeyi kontrol etmesini söyler', async () => {
        payments.createPayment.and.returnValue(throwError(() => problem(409, 'Payments.DuplicateRequestMismatch')));
        await setup();
        selectClient();
        cmp.fillOutstanding(cmp.openCharges()[0]);
        cmp.onSubmit();
        expect(cmp.submitError()).toContain('Ödeme listesini kontrol edin');
    });

    it('müşterinin açık ücreti yoksa ücret ekleme bağlantısı gösterir ve gönderilemez', async () => {
        clients.getClientBalance.and.returnValue(of(balance([])));
        await setup();
        selectClient();
        expect(fixture.nativeElement.textContent).toContain('açık ücreti yok');
        expect(fixture.nativeElement.querySelector('a[href*="/panel/charges/new"]')).not.toBeNull();
        expect(cmp.canSubmit()).toBeFalse();
    });

    it('geliş bağlamıyla gelindiyse ücret ekleme bağlantısı müşteri yanında visitId de taşır', async () => {
        query = { clientId: 'cl1', visitId: 'v1' };
        clients.getClientBalance.and.returnValue(of(balance([])));
        await setup();
        const href = (fixture.nativeElement.querySelector('a[href*="/panel/charges/new"]') as HTMLAnchorElement).getAttribute('href');
        expect(href).toContain('clientId=cl1');
        expect(href).toContain('visitId=v1');
    });

    it('bakiye yüklenemezse hata gösterir', async () => {
        clients.getClientBalance.and.returnValue(throwError(() => new Error('Müşteri bakiyesi yüklenemedi.')));
        await setup();
        selectClient();
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('bakiyesi yüklenemedi');
    });

    it('muayene bağlamı: müşteri ön seçilir, o muayenenin ücretleri tam tutarla dolu gelir ve muayene ödemeye bağlanır', async () => {
        query = { clientId: 'cl1', examinationId: 'ex1' };
        clients.getClientBalance.and.returnValue(
            of(balance([openCharge('ch1', { examinationId: 'ex1' }), openCharge('ch2', { examinationId: 'ex2' })]))
        );
        payments.createPayment.and.returnValue(of({ id: 'pay1' }));
        await setup();
        cmp.form.patchValue({ paidAtLocal: '2026-10-12T10:00' });
        fixture.detectChanges();
        expect(cmp.form.controls.clientId.value).toBe('cl1');
        expect(cmp.allocations()).toEqual([{ chargeId: 'ch1', amount: 600 }]);
        cmp.onSubmit();
        expect(payments.createPayment.calls.mostRecent().args[0].examinationId).toBe('ex1');
    });

    it('geliş bağlamı: o gelişin ücretleri dolu gelir', async () => {
        query = { clientId: 'cl1', visitId: 'v1' };
        clients.getClientBalance.and.returnValue(of(balance([openCharge('ch1', { visitId: 'v1' }), openCharge('ch2', { visitId: 'v2' })])));
        await setup();
        expect(cmp.allocations().map((a) => a.chargeId)).toEqual(['ch1']);
    });

    it('ücret bağlamı: yalnız o ücret tam tutarla dolu gelir, aynı gelişin diğer ücretleri boş kalır', async () => {
        query = { clientId: 'cl1', chargeId: 'ch2', visitId: 'v1' };
        clients.getClientBalance.and.returnValue(of(balance([openCharge('ch1', { visitId: 'v1' }), openCharge('ch2', { visitId: 'v1' })])));
        await setup();
        expect(cmp.allocations().map((a) => a.chargeId)).toEqual(['ch2']);
    });

    it('müşteri değişince bağlam düşer ve tutarlar sıfırlanır', async () => {
        query = { clientId: 'cl1', examinationId: 'ex1' };
        clients.getClientBalance.and.returnValue(of(balance([openCharge('ch1', { examinationId: 'ex1' })])));
        payments.createPayment.and.returnValue(of({ id: 'pay1' }));
        await setup();
        cmp.form.patchValue({ clientId: 'cl2', paidAtLocal: '2026-10-12T10:00' });
        cmp.fillOutstanding(cmp.openCharges()[0]);
        cmp.onSubmit();
        expect(payments.createPayment.calls.mostRecent().args[0].examinationId).toBeNull();
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
});
