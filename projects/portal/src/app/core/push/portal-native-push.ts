import { effect, inject, Injectable, InjectionToken, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { PushNotifications, type PushNotificationsPlugin } from '@capacitor/push-notifications';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalPushRegistration } from './portal-push-registration';

/** Kullanılan eklenti yüzeyi; spec'lerde sahte nesneyle değiştirilir. */
export const PORTAL_PUSH_PLUGIN = new InjectionToken<Pick<PushNotificationsPlugin, 'addListener'>>('PORTAL_PUSH_PLUGIN', {
    factory: () => PushNotifications
});

/**
 * Bildirime dokununca açılan ekran. Yük yalnız `type` taşır (backend `OwnerNotificationType`, sözleşme §14.5); bilinmeyen
 * tür ana sayfaya gider. Hangi klinikten geldiği yükte yok: ekran seçili klinikle açılır.
 */
export function portalPushRoute(type: unknown): string {
    switch (type) {
        case 'AppointmentRequestReceived':
        case 'AppointmentRequestApproved':
        case 'AppointmentRequestRescheduled':
        case 'AppointmentRequestRejected':
            return '/appointments/requests';
        case 'AppointmentReminder':
        case 'FollowUpReminder':
            return '/appointments';
        case 'VaccinationReminder':
            return '/pets';
        case 'DebtReminder':
            return '/balance';
        case 'DataRequestAnswered':
            return '/account/data-requests';
        default:
            return '/';
    }
}

/**
 * Mağaza uygulamasında push davranışı (yalnız yerel platformda başlatılır, `PortalNativeShell`):
 * - oturum açıldığında bu cihazın jetonu sessizce yenilenir (izin sorulmaz; izin tercih ekranında istenir);
 * - bildirime dokununca ilgili ekran açılır (soğuk açılışta da: Capacitor olayı dinleyici eklenene dek saklar).
 */
@Injectable({ providedIn: 'root' })
export class PortalNativePush {
    private readonly plugin = inject(PORTAL_PUSH_PLUGIN);
    private readonly router = inject(Router);
    private readonly session = inject(PortalSessionService);
    private readonly registration = inject(PortalPushRegistration);
    private readonly injector = inject(Injector);
    private started = false;

    start(): void {
        if (this.started) {
            return;
        }

        this.started = true;
        this.plugin
            .addListener('pushNotificationActionPerformed', ({ notification }) => {
                void this.router.navigateByUrl(portalPushRoute(notification.data?.['type']));
            })
            .catch(() => undefined);

        effect(
            () => {
                if (this.session.isAuthenticated()) {
                    this.registration.syncThisDevice().subscribe();
                }
            },
            { injector: this.injector }
        );
    }
}
