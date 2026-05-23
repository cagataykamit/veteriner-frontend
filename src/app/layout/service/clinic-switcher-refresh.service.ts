import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Topbar clinic switcher `/me/clinics` listesini yenilemek için hafif olay hattı.
 * Klinik oluşturma gibi üyelik listesini değiştiren işlemler sonrası tetiklenir.
 */
@Injectable({ providedIn: 'root' })
export class ClinicSwitcherRefreshService {
    private readonly refreshRequested$ = new Subject<void>();

    readonly onRefreshRequested = this.refreshRequested$.asObservable();

    notifyClinicListChanged(): void {
        this.refreshRequested$.next();
    }
}
