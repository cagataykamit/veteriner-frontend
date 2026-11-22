import { appointmentStatusEnumLabel, appointmentStatusEnumSeverity } from '@/app/entities/appointment/utils/appointment-status.utils';
import {
    AppointmentRequestStatus,
    type AppointmentRequestDetailVm,
    type AppointmentRequestHistoryVm
} from '@/app/entities/online-booking/models/online-booking.model';
import {
    appointmentRequestActorLabel,
    appointmentRequestChannelLabel,
    appointmentRequestStatusLabel,
    appointmentRequestStatusSeverity,
    type TagSeverity
} from '@/app/entities/online-booking/utils/appointment-request-labels.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Talep geçmişinin bir olayı (APPT-024): ne oldu, hangi durumdan hangisine, kim, ne zaman, ayrıntı. */
export interface AppointmentRequestTimelineEvent {
    title: string;
    icon: string;
    severity: TagSeverity;
    /** Oluşturma olayında boş. */
    fromLabel: string | null;
    toLabel: string;
    atUtc: string;
    actor: string;
    details: string[];
}

/** Onaylı talepten oluşan randevu satırı; randevu onaydan sonra taşınmışsa `movedAfterApproval`. */
export interface AppointmentRequestTimelineAppointment {
    id: string;
    whenText: string | null;
    statusLabel: string | null;
    statusSeverity: StatusTagSeverity;
    movedAfterApproval: boolean;
}

const fmt = (utc: string | null): string => formatDateTimeDisplay(utc);

function eventTitle(h: AppointmentRequestHistoryVm, d: AppointmentRequestDetailVm): { title: string; icon: string } {
    if (h.fromStatus === null) {
        return { title: 'Talep alındı', icon: 'pi-inbox' };
    }

    switch (h.toStatus) {
        case AppointmentRequestStatus.Approved:
            return { title: d.wasRescheduled ? 'Farklı saatle onaylandı' : 'Onaylandı', icon: 'pi-check' };
        case AppointmentRequestStatus.Rejected:
            return { title: 'Reddedildi', icon: 'pi-times' };
        case AppointmentRequestStatus.Cancelled:
            return { title: 'Sahip vazgeçti', icon: 'pi-undo' };
        case AppointmentRequestStatus.Expired:
            return { title: 'Süresi doldu', icon: 'pi-clock' };
        default:
            return { title: appointmentRequestStatusLabel(h.toStatus), icon: 'pi-circle' };
    }
}

function eventDetails(h: AppointmentRequestHistoryVm, d: AppointmentRequestDetailVm): string[] {
    if (h.fromStatus === null) {
        return [`İstenen saat: ${fmt(d.summary.requestedStartUtc)}`, `Kaynak: ${appointmentRequestChannelLabel(d.summary.channel)}`];
    }

    switch (h.toStatus) {
        // Onay notu ("Farklı saatle onaylandı") başlıkta; saatler ayrıntıda.
        case AppointmentRequestStatus.Approved:
            return d.wasRescheduled
                ? [`Onaylanan saat: ${fmt(d.approvedStartUtc)}`, `İstenen saat: ${fmt(d.summary.requestedStartUtc)}`]
                : [`Onaylanan saat: ${fmt(d.approvedStartUtc)}`];
        case AppointmentRequestStatus.Rejected:
            return h.note ? [`Gerekçe: ${h.note}`] : [];
        case AppointmentRequestStatus.Expired:
            return ['İstenen saat karar verilmeden geçti.', ...(h.note ? [`Not: ${h.note}`] : [])];
        default:
            return h.note ? [`Not: ${h.note}`] : [];
    }
}

/** Talep geçmişi; sıra sunucunun (eskiden yeniye, sözleşme §17). */
export function appointmentRequestTimeline(d: AppointmentRequestDetailVm): AppointmentRequestTimelineEvent[] {
    return d.history.map((h) => ({
        ...eventTitle(h, d),
        severity: appointmentRequestStatusSeverity(h.toStatus),
        fromLabel: h.fromStatus === null ? null : appointmentRequestStatusLabel(h.fromStatus),
        toLabel: appointmentRequestStatusLabel(h.toStatus),
        atUtc: h.atUtc,
        actor: appointmentRequestActorLabel(h.actorKind, h.actorName, d.summary.contactName),
        details: eventDetails(h, d)
    }));
}

/** Talepten oluşan randevu; talep onaylı değilse `null`. Randevu bilgisi gelmediyse yalnız bağlantı kalır. */
export function appointmentRequestTimelineAppointment(d: AppointmentRequestDetailVm): AppointmentRequestTimelineAppointment | null {
    const id = d.appointment?.id ?? d.summary.appointmentId;

    if (!id) {
        return null;
    }

    const a = d.appointment;

    return {
        id,
        whenText: a ? `${fmt(a.scheduledAtUtc)} · ${a.durationMinutes} dk` : null,
        statusLabel: a ? appointmentStatusEnumLabel(a.status) : null,
        statusSeverity: a ? appointmentStatusEnumSeverity(a.status) : 'secondary',
        movedAfterApproval: !!a && !!d.approvedStartUtc && Date.parse(a.scheduledAtUtc) !== Date.parse(d.approvedStartUtc)
    };
}
