import { HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import type { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { APPOINTMENT_REQUESTS_ROUTE, DATA_EXPORT_ROUTE, PORTAL_INBOX_ROUTE } from '@/app/core/routing/panel-navigation';
import { type PagedResultDto, type PagedVm, toPagedVm } from '@/app/entities/online-booking/models/online-booking.model';
import { toOnlineBookingError } from '@/app/entities/online-booking/utils/online-booking-error.utils';

/** Sunucu `UserNotificationType` (sözleşme §8). */
export enum UserNotificationType {
    AppointmentRequestCreated = 0,
    AppointmentRequestCancelled = 1,
    AppointmentAssigned = 2,
    /** Portaldan KVKK veri talebi (PORTAL-009; `PORTAL_API_CONTRACT.md` §11). */
    PortalDataRequestCreated = 3,
    /** Sahip randevuyu hatırlatma bağlantısından iptal etti (TIER-019; `APPOINTMENT_OWNER_LINK_API_CONTRACT.md` §3). */
    AppointmentCancelledByOwner = 4,
    /** Sahip bekleme listesi teklifini kabul etti, randevu oluştu (TIER-018; `WAITLIST_API_CONTRACT.md` §4). */
    WaitlistOfferAccepted = 5,
    /** Tüm veri dışa aktarma paketi hazır (`DATA_EXPORT_API_CONTRACT.md` §7); yalnız talep edene. */
    DataExportReady = 6,
    /** Tüm veri dışa aktarma paketi hazırlanamadı. */
    DataExportFailed = 7
}

export const USER_NOTIFICATION_TYPE_LABELS: Record<UserNotificationType, string> = {
    [UserNotificationType.AppointmentRequestCreated]: 'Yeni randevu talebi',
    [UserNotificationType.AppointmentRequestCancelled]: 'Talep iptali',
    [UserNotificationType.AppointmentAssigned]: 'Size atanan randevu',
    [UserNotificationType.PortalDataRequestCreated]: 'Portal veri talebi',
    [UserNotificationType.AppointmentCancelledByOwner]: 'Sahip randevuyu iptal etti',
    [UserNotificationType.WaitlistOfferAccepted]: 'Bekleme listesinden randevu',
    [UserNotificationType.DataExportReady]: 'Veri paketi hazır',
    [UserNotificationType.DataExportFailed]: 'Veri paketi hazırlanamadı'
};

export interface UserNotificationVm {
    id: string;
    type: UserNotificationType;
    title: string;
    body: string | null;
    targetType: string | null;
    targetId: string | null;
    clinicId: string | null;
    createdAtUtc: string;
    readAtUtc: string | null;
}

/** Bildirimin açtığı panel adresi; bilinmeyen hedefte yok. Talep kuyruğu ve portal gelen kutusu `?requestId=` ile talebi doğrudan açar. */
export function notificationTargetUrl(
    n: Pick<UserNotificationVm, 'targetType' | 'targetId'>
): { commands: string[]; queryParams?: Record<string, string> } | null {
    if (!n.targetId) {
        return null;
    }

    switch (n.targetType) {
        case 'AppointmentRequest':
            return { commands: [APPOINTMENT_REQUESTS_ROUTE], queryParams: { requestId: n.targetId } };
        case 'Appointment':
            return { commands: ['/panel/appointments', n.targetId] };
        case 'PortalDataRequest':
            return { commands: [PORTAL_INBOX_ROUTE], queryParams: { requestId: n.targetId } };
        case 'DataExport':
            return { commands: [DATA_EXPORT_ROUTE] };
        case 'EDocuments':
            return { commands: ['/panel/e-documents'], queryParams: { view: 'undocumented' } };
        default:
            return null;
    }
}

/**
 * Bildirim açma (bildirim merkezi ve zil paneli aynı kural): okunmamışsa okundu işaretlenir, sonra hedefe gidilir; işaretleme
 * başarısız olsa da gidilir. `onRead` okundu işaretlendiğinde çağrılır (liste satırını günceller).
 */
export function openNotification(service: Pick<NotificationService, 'markRead'>, router: Router, n: UserNotificationVm, onRead?: () => void): void {
    const target = notificationTargetUrl(n);

    const navigate = () => {
        if (target) {
            void router.navigate(target.commands, { queryParams: target.queryParams });
        }
    };

    if (n.readAtUtc) {
        navigate();

        return;
    }

    service.markRead(n.id).subscribe({
        next: () => {
            onRead?.();
            navigate();
        },
        error: () => navigate()
    });
}

/**
 * Bildirim merkezi (APPT-015, UX-008): kişiye yönelik olaylar. Okunmamış sayısı zil rozetinde paylaşılır; liste ve okundu
 * işaretleri sayacı günceller.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly api = inject(ApiClient);

    readonly unreadCount = signal(0);

    refreshUnreadCount(): Observable<number> {
        return this.api.get<{ count: number }>(ApiEndpoints.notifications.unreadCount()).pipe(
            map((r) => r?.count ?? 0),
            tap((count) => this.unreadCount.set(count)),
            toOnlineBookingError('Bildirim sayısı yüklenemedi.')
        );
    }

    list(type: UserNotificationType | null, unreadOnly: boolean, page = 1, pageSize = 20): Observable<PagedVm<UserNotificationVm>> {
        let params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize)).set('unreadOnly', String(unreadOnly));

        if (type !== null) {
            params = params.set('type', String(type));
        }

        return this.api.get<PagedResultDto<UserNotificationVm>>(ApiEndpoints.notifications.list(), params).pipe(
            map((r) => toPagedVm(r, page, pageSize)),
            toOnlineBookingError('Bildirimler yüklenemedi.')
        );
    }

    markRead(id: string): Observable<void> {
        return this.api.post<void>(ApiEndpoints.notifications.read(id), {}).pipe(
            tap(() => this.unreadCount.update((c) => Math.max(0, c - 1))),
            toOnlineBookingError('Bildirim güncellenemedi.')
        );
    }

    markAllRead(type: UserNotificationType | null): Observable<void> {
        const path = type === null ? ApiEndpoints.notifications.readAll() : `${ApiEndpoints.notifications.readAll()}?type=${type}`;

        return this.api.post<void>(path, {}).pipe(toOnlineBookingError('Bildirimler güncellenemedi.'));
    }
}
