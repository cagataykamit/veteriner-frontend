import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay } from 'rxjs';
import { isBookingClosed, PortalBookingApi } from '@portal/app/features/booking/portal-booking.api';
import { telHref } from '@portal/app/shared/format/portal-labels';
import { PortalClinicApi } from './portal-clinic.api';

/** Hasta sahibinin kliniğe ulaşma yolları: online talep açık mı, aranacak telefon var mı (H7, H9). */
export interface PortalClinicContact {
    readonly phone: string | null;
    readonly bookingOpen: boolean;
}

/**
 * "Randevu talep et" ve "Kliniği ara" eylemlerinin tek kaynağı. Bağ başına bir kez okunur (aynı ekranda birden çok kart kullanır).
 * Telefon yoksa "kliniği arayın" cümleleri gösterilmez; talep ucu başka bir hatayla dönerse açık sayılır, talep sayfası hatayı kendisi söyler.
 */
@Injectable({ providedIn: 'root' })
export class PortalClinicContactService {
    private readonly clinicApi = inject(PortalClinicApi);
    private readonly bookingApi = inject(PortalBookingApi);
    private readonly cache = new Map<string, Observable<PortalClinicContact>>();

    contact(linkId: string): Observable<PortalClinicContact> {
        let contact$ = this.cache.get(linkId);

        if (!contact$) {
            contact$ = forkJoin({
                phone: this.clinicApi.clinic(linkId).pipe(
                    map((c) => (telHref(c.phone) ? c.phone : null)),
                    catchError(() => of(null))
                ),
                bookingOpen: this.bookingApi.linkPage(linkId).pipe(
                    map(() => true),
                    catchError((err: unknown) => of(!isBookingClosed(err)))
                )
            }).pipe(shareReplay(1));
            this.cache.set(linkId, contact$);
        }

        return contact$;
    }
}
