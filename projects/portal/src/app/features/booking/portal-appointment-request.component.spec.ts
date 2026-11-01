import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES } from '@portal/app/core/errors/portal-errors';
import { PortalPetsApi } from '@portal/app/features/pets/portal-pets.api';
import { createSessionStub, PET_BONCUK, PET_PAMUK } from '@portal/app/testing/portal-fixtures';
import { buttonByText, problem, typeInto } from '@portal/app/testing/portal-testing';
import { PortalAppointmentRequestComponent } from './portal-appointment-request.component';
import { PortalBookingApi } from './portal-booking.api';
import { BOOKING_DAYS, BOOKING_PAGE, SLOT_MON_0900 } from './portal-booking.fixtures';

describe('PortalAppointmentRequestComponent (oturumlu talep)', () => {
    let fixture: ComponentFixture<PortalAppointmentRequestComponent>;
    let el: HTMLElement;
    let api: MockedObject<PortalBookingApi>;
    let pets: MockedObject<PortalPetsApi>;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    async function create(): Promise<void> {
        fixture = TestBed.createComponent(PortalAppointmentRequestComponent);
        el = fixture.nativeElement;
        await settle();
    }

    async function chooseReasonAndSlot(): Promise<void> {
        el.querySelector<HTMLInputElement>('input[name=request-reason][value=reason-1]')!.click();
        await settle();
        buttonByText(el, '09:00')!.click();
        await settle();
    }

    /** Hayvan seçeneği etiket metniyle bulunur (`[value]` bağlamasını form erişimcisi alır, DOM değerine yazılmaz). */
    function pick(label: string): void {
        Array.from(el.querySelectorAll<HTMLLabelElement>('label.portal-check'))
            .find((l) => l.querySelector('input[formcontrolname=pet]') && l.textContent?.includes(label))!
            .querySelector('input')!
            .click();
    }

    beforeEach(async () => {
        api = {
            linkPage: vi.fn().mockName('linkPage'),
            linkAvailability: vi.fn().mockName('linkAvailability'),
            createLinkRequest: vi.fn().mockName('createLinkRequest')
        } as unknown as MockedObject<PortalBookingApi>;
        pets = { pets: vi.fn().mockName('pets') } as unknown as MockedObject<PortalPetsApi>;
        api.linkPage.mockReturnValue(of(BOOKING_PAGE));
        api.linkAvailability.mockReturnValue(of(BOOKING_DAYS));
        api.createLinkRequest.mockReturnValue(of({ id: 'req-1', status: 'Pending', requestedStartUtc: SLOT_MON_0900 }));
        pets.pets.mockReturnValue(of([PET_PAMUK, PET_BONCUK]));
        await TestBed.configureTestingModule({
            imports: [PortalAppointmentRequestComponent],
            providers: [
                provideRouter([]),
                { provide: PortalBookingApi, useValue: api },
                { provide: PortalPetsApi, useValue: pets },
                { provide: PortalSessionService, useValue: createSessionStub() }
            ]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('kendi hayvanıyla talep gönderir; vefat eden hayvan listelenmez', async () => {
        await create();
        await chooseReasonAndSlot();

        expect(api.linkAvailability).toHaveBeenCalledWith('link-1', 'reason-1');
        expect(el.textContent).toContain('Pamuk');
        expect(el.textContent).not.toContain(PET_BONCUK.name);

        pick(PET_PAMUK.name);
        typeInto(el, '#request-note', 'Karma aşı');
        await settle();
        buttonByText(el, 'Talebi gönder')!.click();
        await settle();

        expect(api.createLinkRequest).toHaveBeenCalledWith('link-1', {
            petId: PET_PAMUK.petId,
            petName: null,
            petSpecies: null,
            petBreed: null,
            reasonId: 'reason-1',
            requestedStartUtc: SLOT_MON_0900,
            phone: null,
            note: 'Karma aşı'
        });
        expect(el.querySelector('[data-testid=request-done]')!.textContent).toContain('kesin randevu değildir');
    });

    it('"Listede yok" seçilince hayvan adı zorunlu ve serbest metinle gönderilir', async () => {
        await create();
        await chooseReasonAndSlot();
        pick('Listede yok');
        await settle();
        buttonByText(el, 'Talebi gönder')!.click();
        await settle();

        expect(api.createLinkRequest).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Hayvanınızın adını girin.');

        typeInto(el, '#request-pet-name', 'Minnoş');
        typeInto(el, '#request-pet-species', 'Kedi');
        await settle();
        buttonByText(el, 'Talebi gönder')!.click();
        await settle();

        expect(api.createLinkRequest).toHaveBeenCalledWith('link-1', expect.objectContaining({ petId: null, petName: 'Minnoş', petSpecies: 'Kedi', petBreed: null }));
    });

    it('hayvan seçilmeden gönderilmez', async () => {
        await create();
        await chooseReasonAndSlot();
        buttonByText(el, 'Talebi gönder')!.click();
        await settle();

        expect(api.createLinkRequest).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Talep hangi hayvan için?');
    });

    it('klinik online talep almıyorsa boş durum', async () => {
        api.linkPage.mockReturnValue(throwError(() => problem(404, PORTAL_ERROR_CODES.onlineBookingNotFound)));
        await create();

        expect(el.textContent).toContain('Kliniğiniz online randevu talebi almıyor');
        expect(buttonByText(el, 'Talebi gönder')).toBeUndefined();
    });

    it('bekleyen talep sınırı mesajı', async () => {
        api.createLinkRequest.mockReturnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.pendingLimitReached)));
        await create();
        await chooseReasonAndSlot();
        pick(PET_PAMUK.name);
        await settle();
        buttonByText(el, 'Talebi gönder')!.click();
        await settle();

        expect(el.textContent).toContain('en fazla 3 bekleyen talebiniz');
    });
});
