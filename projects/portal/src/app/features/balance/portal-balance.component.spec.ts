import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_SERVER_ERROR_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { BALANCE, BALANCE_CLEAR, CLINIC, configurePortalPage, createSessionStub, LINK_MERKEZ, page, PAYMENTS, url } from '@portal/app/testing/portal-fixtures';
import { PortalBalanceComponent } from './portal-balance.component';

const strip = (s: string | null | undefined) => (s ?? '').replace(/\s/g, '');

describe('PortalBalanceComponent (bakiye ve ödemeler)', () => {
    let fixture: ComponentFixture<PortalBalanceComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;

    const base = `links/${LINK_MERKEZ.linkId}`;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function respond(balance = BALANCE, payments = page(PAYMENTS), clinic = CLINIC): void {
        http.expectOne(url(`${base}/balance`)).flush(balance);
        http.expectOne((r) => r.url === url(`${base}/payments`) && r.params.get('page') === '1').flush(payments);
        http.expectOne(url(`${base}/clinic`)).flush(clinic);
    }

    beforeEach(async () => {
        configurePortalPage(PortalBalanceComponent, createSessionStub());
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalBalanceComponent);
        el = fixture.nativeElement;
        await settle();
    });

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('yüklenirken iskelet; toplam ücret, ödenen, kalan ve son ödeme tarihi', async () => {
        expect(el.querySelector('portal-skeleton')).not.toBeNull();
        respond();
        await settle();

        const summary = strip(el.querySelector('[data-testid=balance-summary]')?.textContent);

        expect(summary).toContain('₺500,00');
        expect(summary).toContain('Toplamücret₺1.500,00');
        expect(summary).toContain('Ödenen₺1.000,00');
        expect(summary).toContain('Kalan₺500,00');
        expect(summary).toContain('Sonödeme14.10.2026');
    });

    it('bağlanmamış ödeme varsa açıklamalı satır gösterir; yoksa göstermez', async () => {
        respond();
        await settle();

        const note = el.querySelector('[data-testid=balance-unallocated]')!.textContent!;

        expect(note).toContain('Henüz bir ücrete bağlanmamış ödemeleriniz');
        expect(strip(note)).toContain('₺200,00');
        expect(note).toContain('kalan tutardan düşülmemiştir');
    });

    it('borç yoksa "Borcunuz yok", açıklama satırı yok', async () => {
        respond(BALANCE_CLEAR);
        await settle();

        expect(el.querySelector('[data-testid=balance-summary]')?.textContent).toContain('Borcunuz yok');
        expect(el.querySelector('[data-testid=balance-unallocated]')).toBeNull();
    });

    it('online ödeme yok: kliniği arayın ve tel: bağlantısı', async () => {
        respond();
        await settle();

        const pay = el.querySelector('[data-testid=balance-pay]')!;

        expect(pay.textContent).toContain('Ödeme için kliniği arayın');
        expect(pay.querySelector('a')?.getAttribute('href')).toBe('tel:03125550000');
        expect(el.querySelector('form, input')).toBeNull();
        expect(buttonByText(el, 'Öde')).toBeUndefined();
    });

    it('telefon yoksa klinik iletişim sayfasına yönlendirir', async () => {
        respond(BALANCE, page(PAYMENTS), { ...CLINIC, phone: null });
        await settle();

        expect(el.querySelector('[data-testid=balance-pay] a')?.getAttribute('href')).toBe('/clinic');
    });

    it('ödeme geçmişi: tarih, tutar, yöntem; sayfalama ile sonraki sayfa eklenir', async () => {
        respond(BALANCE, page(PAYMENTS, 1, 2, 3));
        await settle();

        let rows = el.querySelectorAll('[data-testid=payment-list] li');

        expect(rows.length).toBe(2);
        expect(strip(rows[0].textContent)).toContain('₺1.000,00');
        expect(rows[0].textContent).toContain('Kart');
        expect(rows[0].textContent).toContain('14.10.2026');
        expect(rows[1].textContent).toContain('Nakit');

        buttonByText(el, 'Daha fazla göster')!.click();
        await settle();
        http.expectOne((r) => r.url === url(`${base}/payments`) && r.params.get('page') === '2').flush(
            page([{ paidAtUtc: '2026-08-01T09:00:00', amount: 50, currency: 'TRY', method: 'Transfer' }], 2, 2, 3)
        );
        await settle();

        rows = el.querySelectorAll('[data-testid=payment-list] li');
        expect(rows.length).toBe(3);
        expect(rows[2].textContent).toContain('Havale / EFT');
        expect(buttonByText(el, 'Daha fazla göster')).toBeUndefined();
    });

    it('ödeme yoksa boş durum; bakiye hatasında mesaj ve tekrar dene', async () => {
        http.expectOne(url(`${base}/balance`)).flush(null, { status: 500, statusText: 'Error' });
        http.expectOne((r) => r.url === url(`${base}/payments`)).flush(page([]));
        http.expectOne(url(`${base}/clinic`)).flush(CLINIC);
        await settle();

        expect(el.textContent).toContain('Ödeme kaydı yok');
        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_SERVER_ERROR_MESSAGE);

        buttonByText(el, 'Tekrar dene')!.click();
        await settle();
        http.expectOne(url(`${base}/balance`)).flush(BALANCE);
        await settle();

        expect(el.querySelector('[data-testid=balance-summary]')).not.toBeNull();
    });
});
