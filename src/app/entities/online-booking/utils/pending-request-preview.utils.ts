import { AppointmentRequestSource, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { appointmentRequestDayLabel, appointmentRequestDayOffset, appointmentRequestAgoLabel, isNewAppointmentRequest } from '@/app/entities/online-booking/utils/appointment-request-time.utils';
import { appointmentRequestSourceLabel } from '@/app/entities/online-booking/utils/appointment-request-labels.utils';
import { formatTimeDisplay } from '@/app/shared/utils/date.utils';

/** Bugün ekranı talep satırı (çip paneli ve kutucuk ortak); etiketler `now` anına göre hesaplanmış. */
export interface PendingRequestPreviewVm {
    id: string;
    /** "Bugün", "Yarın" ya da "5 Kas Per". */
    dayLabel: string;
    time: string;
    /** İstenen gün bugün ya da yarın: gün etiketi vurgulanır. */
    soon: boolean;
    /** Son 30 dk içinde geldi. */
    isNew: boolean;
    /** "12 dk önce". */
    receivedAgo: string;
    contactName: string;
    petLabel: string;
    reasonName: string;
    durationMinutes: number;
    sourceLabel: string;
    sourceIcon: string;
}

export function toPendingRequestPreview(r: AppointmentRequestListItemVm, now: Date): PendingRequestPreviewVm {
    const offset = appointmentRequestDayOffset(r.requestedStartUtc, now);

    return {
        id: r.id,
        dayLabel: appointmentRequestDayLabel(r.requestedStartUtc, now),
        time: formatTimeDisplay(r.requestedStartUtc),
        soon: offset === 0 || offset === 1,
        isNew: isNewAppointmentRequest(r.createdAtUtc, now),
        receivedAgo: appointmentRequestAgoLabel(r.createdAtUtc, now),
        contactName: r.contactName,
        petLabel: r.petName ?? 'Hayvan belirtilmedi',
        reasonName: r.reasonName,
        durationMinutes: r.durationMinutes,
        sourceLabel: appointmentRequestSourceLabel(r.source),
        sourceIcon: r.source === AppointmentRequestSource.Portal ? 'pi pi-user' : 'pi pi-link'
    };
}
