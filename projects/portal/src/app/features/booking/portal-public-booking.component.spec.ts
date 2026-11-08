import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PORTAL_FRAMED } from '@portal/app/core/embed/portal-embed';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText, problem, typeInto } from '@portal/app/testing/portal-testing';
import { PortalBookingApi } from './portal-booking.api';
import { BOOKING_DAYS, BOOKING_PAGE, SLOT_MON_0900, SLOT_MON_0930 } from './portal-booking.fixtures';
import { PortalPublicBookingComponent } from './portal-public-booking.component';

describe('PortalPublicBookingComponent (kliniğe özel bağlantı)', () => {
    let fixture: ComponentFixture<PortalPublicBookingComponent>;
    let el: HTMLElement;
    let api: MockedObject<PortalBookingApi>;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    async function create(code: string | undefined = 'k7m2p9xq4r8t'): Promise<void> {
        fixture = TestBed.createComponent(PortalPublicBookingComponent);
        fixture.componentRef.setInput('bookingCode', code);
        el = fixture.nativeElement;
        await settle();
    }

    async function chooseReasonAndSlot(): Promise<void> {
        el.querySelector<HTMLInputElement>('input[name=booking-reason][value=reason-1]')!.click();
        await settle();
        buttonByText(el, '09:00')!.click();
        await settle();
    }

    async function fillAndSendCode(): Promise<void> {
        typeInto(el, '#booking-name', 'Ayşe Yılmaz');
        typeInto(el, '#booking-phone', '05551234567');
        typeInto(el, '#booking-pet-name', 'Pamuk');
        typeInto(el, '#booking-pet-species', 'Kedi');
        typeInto(el, '#booking-email', 'ayse@example.com');
        buttonByText(el, 'Doğrulama kodu gönder')!.click();
        await settle();
        typeInto(el, '#booking-code', '123 456');
        await settle();
    }

    /** Tamamlanan adımların başlık özetleri, sırayla. */
    function summaries(): string[] {
        return Array.from(el.querySelectorAll('[data-testid=step-summary]')).map((p) => p.textContent!.trim());
    }

    async function submit(): Promise<void> {
        buttonByText(el, 'Talebi gönder')!.click();
        await settle();
    }

    beforeEach(async () => {
        api = {
            publicPage: vi.fn().mockName('publicPage'),
            publicAvailability: vi.fn().mockName('publicAvailability'),
            requestPublicCode: vi.fn().mockName('requestPublicCode'),
            createPublicRequest: vi.fn().mockName('createPublicRequest'),
            publicLogoUrl: vi.fn((code: string) => `/api/portal/v1/booking/${code}/logo`)
        } as unknown as MockedObject<PortalBookingApi>;
        api.publicPage.mockReturnValue(of(BOOKING_PAGE));
        api.publicAvailability.mockReturnValue(of(BOOKING_DAYS));
        api.requestPublicCode.mockReturnValue(of(undefined));
        await TestBed.configureTestingModule({
            imports: [PortalPublicBookingComponent],
            // Test koşucusu sayfayı çerçevede açar; gömülü görünüm yalnız kendi testlerinde açılır.
            providers: [provideRouter([]), { provide: PortalBookingApi, useValue: api }, { provide: PORTAL_FRAMED, useValue: false }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    describe('marka ve gömülü görünüm (APPT-021/022)', () => {
        const main = () => el.querySelector<HTMLElement>('main')!;

        it('kliniğin okunur rengi sayfa değişkenlerine yazılır, logo başlıkta çizilir', async () => {
            api.publicPage.mockReturnValue(of({ ...BOOKING_PAGE, branding: { accentColor: '#1d3557', hasLogo: true } }));
            await create();

            expect(main().style.getPropertyValue('--vetinity-navy')).toBe('#1d3557');
            expect(main().style.getPropertyValue('--p-button-primary-background')).toBe('#1d3557');
            expect(el.querySelector('[data-testid=brand-clinic-logo]')?.getAttribute('src')).toBe('/api/portal/v1/booking/k7m2p9xq4r8t/logo');
            expect(el.querySelector('.portal-brand-name')?.textContent).toContain('Merkez Veteriner');
        });

        it('kontrastı düşük renk uygulanmaz; logo yoksa harf rozeti kalır', async () => {
            api.publicPage.mockReturnValue(of({ ...BOOKING_PAGE, branding: { accentColor: '#ffd166', hasLogo: false } }));
            await create();

            expect(main().style.getPropertyValue('--vetinity-navy')).toBe('');
            expect(el.querySelector('[data-testid=brand-clinic-logo]')).toBeNull();
            expect(el.querySelector('.portal-brand-badge')?.textContent).toBe('M');
            expect(api.publicLogoUrl).not.toHaveBeenCalled();
        });

        it('gömülüyken üst başlık çizilmez, belgeler yeni sekmede açılır', async () => {
            TestBed.overrideProvider(PORTAL_FRAMED, { useValue: true });
            await create();

            expect(el.querySelector('portal-brand-header')).toBeNull();
            expect(main().classList).toContain('booking-embedded');

            await chooseReasonAndSlot();
            const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[href^="/legal/"]'));

            expect(links.length).toBe(3);
            expect(links.every((a) => a.target === '_blank' && a.rel === 'noopener')).toBe(true);
        });
    });

    it('klinik bilgisini ve yalnız online nedenleri gösterir; neden seçilince müsaitlik istenir', async () => {
        await create();

        expect(el.textContent).toContain('Merkez Veteriner');
        expect(el.textContent).toContain('Aşı');
        expect(el.textContent).toContain('Kontrol');
        expect(api.publicAvailability).not.toHaveBeenCalled();

        await chooseReasonAndSlot();

        expect(api.publicAvailability).toHaveBeenCalledWith('k7m2p9xq4r8t', 'reason-1');
        expect(summaries()).toEqual(['Aşı · ~15 dk', 'Pazartesi, 02.11.2026 · 09:00']);
        expect(el.querySelector('#booking-name')).not.toBeNull();
    });

    it('klinik sitesinde seçilen saat (?saat=) neden seçilince müsaitse seçili gelir (TIER-017)', async () => {
        fixture = TestBed.createComponent(PortalPublicBookingComponent);
        fixture.componentRef.setInput('bookingCode', 'k7m2p9xq4r8t');
        fixture.componentRef.setInput('saat', '2026-11-02T06:30:00.000Z');
        el = fixture.nativeElement;
        await settle();

        expect(el.querySelector('[data-testid=preferred-slot]')?.textContent).toContain('Pazartesi, 02.11.2026 · 09:30');

        el.querySelector<HTMLInputElement>('input[name=booking-reason][value=reason-1]')!.click();
        await settle();

        expect(fixture.componentInstance.selectedSlot()).toBe(SLOT_MON_0930);
        expect(summaries()[1]).toBe('Pazartesi, 02.11.2026 · 09:30');
        expect(el.querySelector('#booking-name')).not.toBeNull();
    });

    it('siteden gelen saat bu nedenin listesinde yoksa seçilmez ve söylenir', async () => {
        fixture = TestBed.createComponent(PortalPublicBookingComponent);
        fixture.componentRef.setInput('bookingCode', 'k7m2p9xq4r8t');
        fixture.componentRef.setInput('saat', '2026-11-02T07:00:00Z');
        el = fixture.nativeElement;
        await settle();

        el.querySelector<HTMLInputElement>('input[name=booking-reason][value=reason-1]')!.click();
        await settle();

        expect(fixture.componentInstance.selectedSlot()).toBeNull();
        expect(el.textContent).toContain('Sitede seçtiğiniz saat bu neden için uygun değil');
    });

    it('giriş kartı "nasıl işler" adımlarını, acil şeridi aranabilir klinik telefonunu gösterir', async () => {
        await create();

        expect(el.querySelector('[data-testid=booking-urgent] a')?.getAttribute('href')).toBe('tel:02320000000');
        expect(el.querySelector('portal-booking-how')?.textContent).toContain('Klinik onaylar');
    });

    it('bilgiler adımı alanlar dolunca tamamlanır ve özetlenir', async () => {
        await create();
        await chooseReasonAndSlot();
        typeInto(el, '#booking-name', 'Ayşe Yılmaz');
        typeInto(el, '#booking-phone', '05551234567');
        typeInto(el, '#booking-pet-name', 'Pamuk');
        await settle();

        expect(summaries()[2]).toBe('Pamuk · Ayşe Yılmaz');
    });

    it('geçersiz cep telefonu alanın altında söylenir, bilgiler adımı tamamlanmaz', async () => {
        await create();
        await chooseReasonAndSlot();
        typeInto(el, '#booking-name', 'Ayşe Yılmaz');
        typeInto(el, '#booking-phone', '0212 123 45 67');
        typeInto(el, '#booking-pet-name', 'Pamuk');
        el.querySelector('#booking-phone')!.dispatchEvent(new Event('blur'));
        await settle();

        expect(el.querySelector('#booking-phone + .portal-field-error')?.textContent).toContain('Geçerli bir cep telefonu girin');
        expect(summaries()).not.toContain('Pamuk · Ayşe Yılmaz');
    });

    it('yalnız boşluktan oluşan ad boş sayılır; alanın altında söylenir', async () => {
        await create();
        await chooseReasonAndSlot();
        typeInto(el, '#booking-name', '   ');
        typeInto(el, '#booking-phone', '05551234567');
        typeInto(el, '#booking-pet-name', 'Pamuk');
        el.querySelector('#booking-name')!.dispatchEvent(new Event('blur'));
        await settle();

        expect(el.querySelector('#booking-name + .portal-field-error')?.textContent).toContain('Adınızı ve soyadınızı girin.');
        expect(summaries().some((s) => s.includes('Pamuk'))).toBe(false);
    });

    it('404 kapalı bağlantı mesajı; kod yoksa istek atılmaz', async () => {
        api.publicPage.mockReturnValue(throwError(() => problem(404, PORTAL_ERROR_CODES.onlineBookingNotFound)));
        await create();
        expect(el.querySelector('[data-testid=booking-closed]')?.textContent).toContain('kapalı ya da bağlantı geçersiz');

        fixture.destroy();
        api.publicPage.mockClear();
        await create('  ');
        expect(api.publicPage).not.toHaveBeenCalled();
        expect(el.querySelector('[data-testid=booking-closed]')).not.toBeNull();
    });

    it('kod gönderilir, sayaç başlar; talep gönderilince "kesin randevu değildir" mesajı', async () => {
        api.createPublicRequest.mockReturnValue(of({ id: 'req-1', status: 'Pending', requestedStartUtc: SLOT_MON_0900 }));
        await create();
        await chooseReasonAndSlot();
        expect(buttonByText(el, 'Talebi gönder')!.disabled).toBe(true);

        await fillAndSendCode();

        expect(api.requestPublicCode).toHaveBeenCalledWith('k7m2p9xq4r8t', 'ayse@example.com');
        expect(buttonByText(el, 'Kodu tekrar gönder')!.disabled).toBe(true);
        expect(el.querySelector('[data-testid=booking-privacy] a')?.getAttribute('href')).toBe('/legal/privacy');

        await submit();

        expect(api.createPublicRequest).toHaveBeenCalledWith('k7m2p9xq4r8t', {
            email: 'ayse@example.com',
            verificationCode: '123456',
            contactName: 'Ayşe Yılmaz',
            phone: '05551234567',
            petName: 'Pamuk',
            petSpecies: 'Kedi',
            petBreed: null,
            reasonId: 'reason-1',
            requestedStartUtc: SLOT_MON_0900,
            note: null,
            channel: null
        });
        const done = el.querySelector('[data-testid=booking-done]')!.textContent!;

        expect(done).toContain('kesin randevu değildir');
        expect(done).toContain('ayse@example.com');
        expect(done).toContain('Pazartesi, 02.11.2026 · 09:00');
        expect(done).toContain('Pamuk · Kedi');
        expect(el.querySelector('h1')?.textContent).toContain('Talebiniz alındı');
    });

    it('bağlantının kaynak değeri (?kaynak=) talebe olduğu gibi gider; izinli değeri sunucu belirler (TIER-016)', async () => {
        api.createPublicRequest.mockReturnValue(of({ id: 'req-1', status: 'Pending', requestedStartUtc: SLOT_MON_0900 }));
        fixture = TestBed.createComponent(PortalPublicBookingComponent);
        fixture.componentRef.setInput('bookingCode', 'k7m2p9xq4r8t');
        fixture.componentRef.setInput('kaynak', ' site ');
        el = fixture.nativeElement;
        await settle();
        await chooseReasonAndSlot();
        await fillAndSendCode();
        await submit();

        expect(api.createPublicRequest).toHaveBeenCalledWith('k7m2p9xq4r8t', expect.objectContaining({ channel: 'site' }));
    });

    it('"Diğer" seçilince not zorunlu; notla nedensiz talep gider (ADR-042 eki)', async () => {
        api.createPublicRequest.mockReturnValue(of({ id: 'req-1', status: 'Pending', requestedStartUtc: SLOT_MON_0900 }));
        await create();
        el.querySelector<HTMLInputElement>('input[name=booking-reason][value=other]')!.click();
        await settle();

        expect(api.publicAvailability).toHaveBeenCalledWith('k7m2p9xq4r8t', null);

        buttonByText(el, '09:00')!.click();
        await settle();
        await fillAndSendCode();
        await submit();

        expect(api.createPublicRequest).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Ne için geldiğinizi kısaca yazın.');

        typeInto(el, '#booking-note', 'Tırnak kesimi');
        await settle();
        await submit();

        expect(api.createPublicRequest).toHaveBeenCalledWith('k7m2p9xq4r8t', expect.objectContaining({ reasonId: null, note: 'Tırnak kesimi' }));
    });

    it('hatalı kod alanın altında gösterilir', async () => {
        api.createPublicRequest.mockReturnValue(throwError(() => problem(400, PORTAL_ERROR_CODES.onlineBookingInvalidCode)));
        await create();
        await chooseReasonAndSlot();
        await fillAndSendCode();
        await submit();

        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.onlineBookingInvalidCode]);
    });

    it('saat dolmuşsa seçim temizlenir ve müsaitlik yenilenir', async () => {
        api.createPublicRequest.mockReturnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.slotUnavailable)));
        await create();
        await chooseReasonAndSlot();
        await fillAndSendCode();
        await submit();

        expect(api.publicAvailability).toHaveBeenCalledTimes(2);
        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.slotUnavailable]);
        expect(el.querySelector('#booking-name')).toBeNull();
    });

    it('bekleyen talep sınırı sayfadaki sayıyla anlatılır', async () => {
        api.createPublicRequest.mockReturnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.pendingLimitReached)));
        await create();
        await chooseReasonAndSlot();
        await fillAndSendCode();
        await submit();

        expect(el.textContent).toContain('en fazla 3 bekleyen talebiniz');
    });

    it('zorunlu alanlar boşsa gönderilmez', async () => {
        await create();
        await chooseReasonAndSlot();
        typeInto(el, '#booking-email', 'ayse@example.com');
        buttonByText(el, 'Doğrulama kodu gönder')!.click();
        await settle();
        await submit();

        expect(api.createPublicRequest).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Adınızı ve soyadınızı girin.');
        expect(el.textContent).toContain('Hayvanınızın adını girin.');
    });
});
