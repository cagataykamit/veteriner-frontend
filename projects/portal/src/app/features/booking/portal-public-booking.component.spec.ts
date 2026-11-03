import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText, problem, typeInto } from '@portal/app/testing/portal-testing';
import { PortalBookingApi } from './portal-booking.api';
import { BOOKING_DAYS, BOOKING_PAGE, SLOT_MON_0900 } from './portal-booking.fixtures';
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

    async function submit(): Promise<void> {
        buttonByText(el, 'Talebi gönder')!.click();
        await settle();
    }

    beforeEach(async () => {
        api = {
            publicPage: vi.fn().mockName('publicPage'),
            publicAvailability: vi.fn().mockName('publicAvailability'),
            requestPublicCode: vi.fn().mockName('requestPublicCode'),
            createPublicRequest: vi.fn().mockName('createPublicRequest')
        } as unknown as MockedObject<PortalBookingApi>;
        api.publicPage.mockReturnValue(of(BOOKING_PAGE));
        api.publicAvailability.mockReturnValue(of(BOOKING_DAYS));
        api.requestPublicCode.mockReturnValue(of(undefined));
        await TestBed.configureTestingModule({
            imports: [PortalPublicBookingComponent],
            providers: [provideRouter([]), { provide: PortalBookingApi, useValue: api }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('klinik bilgisini ve yalnız online nedenleri gösterir; neden seçilince müsaitlik istenir', async () => {
        await create();

        expect(el.textContent).toContain('Merkez Veteriner');
        expect(el.textContent).toContain('Aşı');
        expect(el.textContent).toContain('Kontrol');
        expect(api.publicAvailability).not.toHaveBeenCalled();

        await chooseReasonAndSlot();

        expect(api.publicAvailability).toHaveBeenCalledWith('k7m2p9xq4r8t', 'reason-1');
        expect(el.textContent).toContain('Seçilen saat');
        expect(el.textContent).toContain('09:00');
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
            note: null
        });
        const done = el.querySelector('[data-testid=booking-done]')!.textContent!;

        expect(done).toContain('kesin randevu değildir');
        expect(done).toContain('ayse@example.com');
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
