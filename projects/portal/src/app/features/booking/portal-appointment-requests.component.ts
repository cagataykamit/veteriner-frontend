import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, throwError } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalDay, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { appointmentRequestStatus } from '@portal/app/shared/format/portal-labels';
import { PortalEmptyState, PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { isBookingClosed } from './portal-appointment-request.component';
import { PortalAppointmentRequest, PortalBookingApi } from './portal-booking.api';

interface RequestsView {
    readonly bookingOpen: boolean;
    readonly requests: readonly PortalAppointmentRequest[];
}

/**
 * Randevu taleplerim (`/appointments/requests`, ADR-042 K4; sözleşme §6): durum, onaylanan saat ("saat değiştirildi"),
 * red gerekçesi; bekleyen talep onay sorusuyla iptal edilir. Klinik online talep almıyorsa yeni talep düğmesi gizlenir,
 * geçmiş talepler yine listelenir.
 */
@Component({
    selector: 'portal-appointment-requests',
    standalone: true,
    imports: [RouterLink, ButtonModule, PortalEmptyState, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-appointment-requests.component.html'
})
export class PortalAppointmentRequestsComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalBookingApi);

    readonly view = portalLoad<RequestsView>();
    readonly requests = signal<readonly PortalAppointmentRequest[]>([]);
    readonly confirmingId = signal<string | null>(null);
    readonly cancellingId = signal<string | null>(null);
    readonly cancelError = signal<string | null>(null);

    constructor() {
        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                if (link) {
                    this.load();
                }
            });
        });
    }

    load(): void {
        const linkId = this.session.activeLink()?.linkId;

        if (!linkId) {
            return;
        }

        this.confirmingId.set(null);
        this.cancelError.set(null);
        this.view.run(() =>
            forkJoin({
                bookingOpen: this.api.linkPage(linkId).pipe(
                    map(() => true),
                    catchError((err: unknown) => (isBookingClosed(err) ? of(false) : throwError(() => err)))
                ),
                requests: this.api.myRequests(linkId)
            }).pipe(
                map((view) => {
                    this.requests.set(view.requests);

                    return view;
                })
            )
        );
    }

    askCancel(request: PortalAppointmentRequest): void {
        this.cancelError.set(null);
        this.confirmingId.set(request.id);
    }

    keep(): void {
        this.confirmingId.set(null);
    }

    cancel(request: PortalAppointmentRequest): void {
        const linkId = this.session.activeLink()?.linkId;

        if (!linkId || this.cancellingId()) {
            return;
        }

        this.cancellingId.set(request.id);
        this.api.cancelRequest(linkId, request.id).subscribe({
            next: (updated) => {
                this.cancellingId.set(null);
                this.confirmingId.set(null);
                this.requests.update((list) => list.map((r) => (r.id === request.id ? { ...updated, petName: updated.petName ?? r.petName } : r)));
            },
            error: (err: unknown) => {
                this.cancellingId.set(null);
                this.cancelError.set(portalErrorMessage(err));
            }
        });
    }

    status(request: PortalAppointmentRequest) {
        return appointmentRequestStatus(request.status);
    }

    when(utc: string): string {
        return `${formatPortalWeekday(utc)}, ${formatPortalDay(utc)} · ${formatPortalTime(utc)}`;
    }

    detail(request: PortalAppointmentRequest): string {
        return [request.reasonName, request.petName, request.durationMinutes > 0 ? `${request.durationMinutes} dk` : ''].filter(Boolean).join(' · ');
    }
}
