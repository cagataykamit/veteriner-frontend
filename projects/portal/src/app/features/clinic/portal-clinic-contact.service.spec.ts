import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { PORTAL_ERROR_CODES } from '@portal/app/core/errors/portal-errors';
import { PortalBookingApi } from '@portal/app/features/booking/portal-booking.api';
import { problem } from '@portal/app/testing/portal-testing';
import { PortalClinicApi } from './portal-clinic.api';
import { PortalClinicContactService } from './portal-clinic-contact.service';

describe('PortalClinicContactService (H7, H9)', () => {
    const setup = (phone: string | null, linkPage: Observable<unknown>) => {
        const clinic = vi.fn().mockReturnValue(of({ phone }));

        TestBed.configureTestingModule({
            providers: [
                { provide: PortalClinicApi, useValue: { clinic } },
                { provide: PortalBookingApi, useValue: { linkPage: () => linkPage } }
            ]
        });

        return { service: TestBed.inject(PortalClinicContactService), clinic };
    };

    it('talep açık ve telefon var; bağ başına bir kez okunur', async () => {
        const { service, clinic } = setup('0312 555 00 00', of({}));

        expect(await firstValueFrom(service.contact('link-1'))).toEqual({ phone: '0312 555 00 00', bookingOpen: true });
        await firstValueFrom(service.contact('link-1'));
        expect(clinic).toHaveBeenCalledTimes(1);
    });

    it('talep kapalı (OnlineBooking.NotFound) ve telefon yok', async () => {
        const { service } = setup(null, throwError(() => problem(404, PORTAL_ERROR_CODES.onlineBookingNotFound)));

        expect(await firstValueFrom(service.contact('link-1'))).toEqual({ phone: null, bookingOpen: false });
    });
});
