import { HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import type { PagedVm } from '@/app/entities/online-booking/models/online-booking.model';
import { toOnlineBookingError } from '@/app/entities/online-booking/utils/online-booking-error.utils';

/** Sunucu `UserNotificationType` (sözleşme §8). */
export enum UserNotificationType {
    AppointmentRequestCreated = 0,
    AppointmentRequestCancelled = 1,
    AppointmentAssigned = 2
}

export const USER_NOTIFICATION_TYPE_LABELS: Record<UserNotificationType, string> = {
    [UserNotificationType.AppointmentRequestCreated]: 'Yeni randevu talebi',
    [UserNotificationType.AppointmentRequestCancelled]: 'Talep iptali',
    [UserNotificationType.AppointmentAssigned]: 'Size atanan randevu'
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

/** Bildirimin açtığı panel adresi; bilinmeyen hedefte yok. Talep kuyruğu `?requestId=` ile talebi doğrudan açar. */
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
        default:
            return null;
    }
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

        return this.api.get<PagedVm<UserNotificationVm>>(ApiEndpoints.notifications.list(), params).pipe(
            map((r) => ({ items: r?.items ?? [], totalCount: r?.totalCount ?? 0, page: r?.page ?? page, pageSize: r?.pageSize ?? pageSize })),
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
