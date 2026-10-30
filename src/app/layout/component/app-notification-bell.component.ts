import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, merge, throttleTime, timer } from 'rxjs';
import { NOTIFICATIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import { NotificationService } from '@/app/entities/notification/notification.service';
import { menuBadgeLabel } from '@/app/layout/service/menu-badge.service';

const REFRESH_INTERVAL_MS = 60_000;
const MIN_GAP_MS = 15_000;

/**
 * Topbar zili (APPT-015, UX-008): okunmamış bildirim sayısı; tıklanınca bildirim merkezi açılır. Sayı aralıklı ve sayfa
 * geçişlerinde yenilenir; sekme gizliyken aralık tetiklemesi atlanır. Hata olursa son değer kalır.
 */
@Component({
    selector: 'app-notification-bell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <a class="layout-topbar-action relative" [routerLink]="route" [attr.aria-label]="ariaLabel()" data-testid="notification-bell">
            <i class="pi pi-bell"></i>
            @if (badge(); as b) {
                <span class="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs leading-5 text-center" aria-hidden="true">{{ b }}</span>
            }
        </a>
    `
})
export class AppNotificationBell implements OnInit {
    readonly route = NOTIFICATIONS_ROUTE;

    private readonly notifications = inject(NotificationService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly badge = computed(() => menuBadgeLabel(this.notifications.unreadCount()));
    readonly ariaLabel = computed(() => {
        const count = this.notifications.unreadCount();

        return count > 0 ? `Bildirimler, ${count} okunmamış` : 'Bildirimler';
    });

    ngOnInit(): void {
        merge(
            timer(0, REFRESH_INTERVAL_MS).pipe(filter(() => !document.hidden)),
            this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        )
            .pipe(throttleTime(MIN_GAP_MS, undefined, { leading: true, trailing: true }), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.notifications.refreshUnreadCount().subscribe({ error: () => undefined }));
    }
}
