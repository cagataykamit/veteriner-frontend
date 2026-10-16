import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalClock } from '@portal/app/shared/format/portal-date';
import { telHref, WEEK_DAYS } from '@portal/app/shared/format/portal-labels';
import { PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { PortalClinic, PortalClinicApi, PortalWorkingHours } from './portal-clinic.api';

interface HoursRow {
    readonly label: string;
    readonly hours: string;
    readonly breakText: string;
}

/** Klinik bilgisi (sözleşme §6.1): ad, telefon, e-posta, adres ve Pazartesi'den başlayan çalışma saatleri. */
@Component({
    selector: 'portal-clinic',
    standalone: true,
    imports: [RouterLink, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-clinic.component.html',
    styles: `
        .portal-hours {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9375rem;
        }
        .portal-hours th,
        .portal-hours td {
            padding: 0.625rem 0;
            border-bottom: 1px solid var(--portal-border);
            vertical-align: top;
        }
        .portal-hours tr:last-child th,
        .portal-hours tr:last-child td {
            border-bottom: 0;
        }
        .portal-hours th {
            text-align: left;
            font-weight: 500;
        }
        .portal-hours td {
            text-align: right;
        }
        .portal-hours .portal-muted {
            display: block;
            font-size: 0.8125rem;
        }
    `
})
export class PortalClinicComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalClinicApi);

    readonly clinic = portalLoad<PortalClinic>();

    readonly initial = computed(() => (this.clinic.data()?.name ?? '').trim().charAt(0).toLocaleUpperCase('tr-TR'));
    readonly phoneHref = computed(() => telHref(this.clinic.data()?.phone));

    /** Tanımlı günler, Pazartesi → Pazar; sunucu sırasına güvenilmez. Tanımsız gün satırı gösterilmez. */
    readonly hours = computed<HoursRow[]>(() => {
        const rows = this.clinic.data()?.workingHours ?? [];

        return WEEK_DAYS.flatMap(({ day, label }) => {
            const row = rows.find((r) => r.dayOfWeek === day);

            return row ? [toHoursRow(label, row)] : [];
        });
    });

    readonly hasContact = computed(() => {
        const c = this.clinic.data();

        return !!(c?.phone || c?.email || c?.address || c?.city);
    });

    constructor() {
        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                if (link) {
                    this.clinic.run(() => this.api.clinic(link.linkId));
                }
            });
        });
    }

    mailHref(email: string): string {
        return `mailto:${email.trim()}`;
    }
}

function toHoursRow(label: string, row: PortalWorkingHours): HoursRow {
    if (row.isClosed || !row.opensAt || !row.closesAt) {
        return { label, hours: 'Kapalı', breakText: '' };
    }

    const breakText = row.breakStartsAt && row.breakEndsAt ? `Ara ${formatPortalClock(row.breakStartsAt)}–${formatPortalClock(row.breakEndsAt)}` : '';

    return { label, hours: `${formatPortalClock(row.opensAt)}–${formatPortalClock(row.closesAt)}`, breakText };
}
