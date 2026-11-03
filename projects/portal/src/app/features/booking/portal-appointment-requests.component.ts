import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, throwError } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalDateParts, formatPortalDay, formatPortalTime, formatPortalWeekday, PortalDateParts } from '@portal/app/shared/format/portal-date';
import { appointmentRequestStatus } from '@portal/app/shared/format/portal-labels';
import { PortalEmptyState, PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { isBookingClosed } from './portal-appointment-request.component';
import { PortalAppointmentRequest, PortalBookingApi } from './portal-booking.api';

interface RequestsView {
    readonly bookingOpen: boolean;
    readonly requests: readonly PortalAppointmentRequest[];
}

/**
 * Randevu taleplerim (`/appointments/requests`, ADR-042 K4; sözleşme §6): takvim kutucuğu, saat ve durum; onaylanan saat
 * ("saat değiştirildi"), red gerekçesi; bekleyen talep satır içinde onay sorusuyla iptal edilir. Klinik online talep almıyorsa
 * yeni talep düğmesi gizlenir, geçmiş talepler yine listelenir.
 */
@Component({
    selector: 'portal-appointment-requests',
    standalone: true,
    imports: [RouterLink, ButtonModule, PortalEmptyState, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-appointment-requests.component.html',
    styles: `
        .req-main {
            display: flex;
            gap: 0.875rem;
        }
        .req-date {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 0 0 3.5rem;
            padding: 0.375rem 0;
            border-radius: 0.75rem;
            background: var(--vetinity-bg-soft);
            color: var(--vetinity-navy);
            line-height: 1.15;
        }
        .req-date strong {
            font-size: 1.375rem;
        }
        .req-date small {
            font-size: 0.75rem;
        }
        .req-date--muted {
            background: #eef2f6;
            color: #475569;
        }
        .req-body {
            flex: 1 1 auto;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .req-time {
            font-size: 1.125rem;
            font-variant-numeric: tabular-nums;
        }
        .req-cancel {
            align-self: flex-start;
            padding-left: 0;
            color: #b42318;
        }
        .req-confirm {
            gap: 0.75rem;
            padding: 0.75rem;
            border-radius: 0.625rem;
            background: #fff5f2;
        }
        .req-confirm p {
            margin: 0;
        }
        .req-confirm-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
        }
        .req-confirm-actions .p-button {
            min-height: var(--portal-touch);
            justify-content: center;
        }
    `
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

    /** Gösterilen saat: onaylandıysa onaylanan, değilse istenen. */
    start(request: PortalAppointmentRequest): string {
        return request.approvedStartUtc ?? request.requestedStartUtc;
    }

    parts(request: PortalAppointmentRequest): PortalDateParts {
        return formatPortalDateParts(this.start(request));
    }

    time(utc: string): string {
        return formatPortalTime(utc);
    }

    when(utc: string): string {
        return `${formatPortalWeekday(utc)}, ${formatPortalDay(utc)} · ${formatPortalTime(utc)}`;
    }

    detail(request: PortalAppointmentRequest): string {
        return [request.reasonName, request.petName, request.durationMinutes > 0 ? `${request.durationMinutes} dk` : ''].filter(Boolean).join(' · ');
    }
}
