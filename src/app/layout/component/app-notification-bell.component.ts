import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Popover, PopoverModule } from 'primeng/popover';
import { filter, merge, throttleTime, timer } from 'rxjs';
import { NOTIFICATIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import { NotificationService, openNotification, UserNotificationType, type UserNotificationVm } from '@/app/entities/notification/notification.service';
import { appointmentRequestAgoLabel, appointmentRequestDayOffset } from '@/app/entities/online-booking/utils/appointment-request-time.utils';
import { menuBadgeLabel } from '@/app/layout/service/menu-badge.service';
import { AppAppointmentRequestAlertComponent } from './app-appointment-request-alert.component';

const REFRESH_INTERVAL_MS = 60_000;
const MIN_GAP_MS = 15_000;
/** Panelde gösterilen en çok bildirim; fazlası bildirim merkezinde. */
const PANEL_PAGE_SIZE = 20;

export type NotificationDay = 'Bugün' | 'Dün' | 'Daha önce';

const NOTIFICATION_DAYS: readonly NotificationDay[] = ['Bugün', 'Dün', 'Daha önce'];

const TYPE_ICONS: Record<UserNotificationType, { icon: string; tone: string }> = {
    [UserNotificationType.AppointmentRequestCreated]: { icon: 'pi pi-calendar-plus', tone: 'text-primary bg-primary-50 dark:bg-primary-950/40' },
    [UserNotificationType.AppointmentRequestCancelled]: { icon: 'pi pi-calendar-times', tone: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40' },
    [UserNotificationType.AppointmentAssigned]: { icon: 'pi pi-user-plus', tone: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/40' },
    [UserNotificationType.PortalDataRequestCreated]: { icon: 'pi pi-file', tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40' },
    [UserNotificationType.AppointmentCancelledByOwner]: { icon: 'pi pi-calendar-times', tone: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40' },
    [UserNotificationType.WaitlistOfferAccepted]: { icon: 'pi pi-calendar-plus', tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40' },
    [UserNotificationType.DataExportReady]: { icon: 'pi pi-download', tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40' },
    [UserNotificationType.DataExportFailed]: { icon: 'pi pi-exclamation-triangle', tone: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40' }
};
const FALLBACK_ICON = { icon: 'pi pi-bell', tone: 'text-muted-color bg-surface-100 dark:bg-surface-800' };

export interface NotificationRowVm {
    n: UserNotificationVm;
    icon: string;
    tone: string;
    unread: boolean;
    /** "Ayşe Yılmaz · Pamuk · 12 dk önce". */
    meta: string;
}

/** Bildirimler oluşturulma gününe göre (Europe/Istanbul) gruplanır; sunucu sırası (en yeni önce) korunur. */
export function groupNotificationsByDay(items: readonly UserNotificationVm[], now: Date): { day: NotificationDay; rows: NotificationRowVm[] }[] {
    const byDay = new Map<NotificationDay, NotificationRowVm[]>();

    for (const n of items) {
        const offset = appointmentRequestDayOffset(n.createdAtUtc, now);
        const day: NotificationDay = offset === 0 ? 'Bugün' : offset === -1 ? 'Dün' : 'Daha önce';
        const { icon, tone } = TYPE_ICONS[n.type] ?? FALLBACK_ICON;
        const meta = [n.body, appointmentRequestAgoLabel(n.createdAtUtc, now)].filter(Boolean).join(' · ');

        byDay.set(day, [...(byDay.get(day) ?? []), { n, icon, tone, unread: !n.readAtUtc, meta }]);
    }

    return NOTIFICATION_DAYS.filter((day) => byDay.has(day)).map((day) => ({ day, rows: byDay.get(day)! }));
}

/**
 * Topbar zili (APPT-015, UX-008; taslak C): okunmamış bildirim sayısı; tıklanınca yanında panel açılır ("Okunmamış · Tümü"
 * sekmeleri, satırlar Bugün / Dün / Daha önce gruplu, altta bildirim merkezi). Satıra tıklama bildirim merkezindeki kuralı
 * uygular (`openNotification`). Sayı aralıklı ve sayfa geçişlerinde yenilenir; sekme gizliyken aralık tetiklemesi atlanır.
 * Hata olursa son değer kalır. Yeni online talep balonu zilin altında çizilir.
 */
@Component({
    selector: 'app-notification-bell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, PopoverModule, AppAppointmentRequestAlertComponent],
    host: { class: 'relative' },
    template: `
        <button
            #trigger
            type="button"
            class="layout-topbar-action relative"
            [class.bg-surface-hover]="open()"
            aria-haspopup="dialog"
            [attr.aria-expanded]="open()"
            [attr.aria-label]="ariaLabel()"
            (click)="panel.toggle($event)"
            data-testid="notification-bell"
        >
            <i class="pi pi-bell"></i>
            @if (badge(); as b) {
                <span class="block! absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs! leading-5 text-center" aria-hidden="true">{{ b }}</span>
            }
        </button>

        <app-appointment-request-alert (showNotifications)="showPanel()" />

        <p-popover #panel styleClass="layout-topbar-panel layout-topbar-panel--wide" ariaLabel="Bildirimler" (onShow)="onShow()">
            <div (keydown.escape)="closeAndFocusTrigger()" data-testid="notification-panel">
                <div class="px-4 pt-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-semibold">Bildirimler</span>
                        @if (unreadCount() > 0) {
                            <button type="button" class="p-0 bg-transparent border-0 cursor-pointer text-xs text-muted-color hover:text-color" [disabled]="busy()" (click)="markAllRead()" data-testid="notification-panel-read-all">
                                Tümünü okundu say
                            </button>
                        }
                    </div>
                    <div class="flex gap-4 mt-2 text-sm border-b border-surface-200 dark:border-surface-700" role="tablist" aria-label="Bildirim listesi">
                        <button
                            #tabUnread
                            type="button"
                            role="tab"
                            autofocus
                            class="pb-2 -mb-px p-0 bg-transparent border-0 border-b-2 cursor-pointer"
                            [class]="tab() === 'unread' ? 'border-primary font-medium text-color' : 'border-transparent text-muted-color'"
                            [attr.aria-selected]="tab() === 'unread'"
                            (click)="selectTab('unread')"
                            (keydown.arrowRight)="selectTab('all'); tabAll.focus()"
                            data-testid="notification-tab-unread"
                        >
                            Okunmamış <span class="text-xs text-muted-color">{{ unreadCount() }}</span>
                        </button>
                        <button
                            #tabAll
                            type="button"
                            role="tab"
                            class="pb-2 -mb-px p-0 bg-transparent border-0 border-b-2 cursor-pointer"
                            [class]="tab() === 'all' ? 'border-primary font-medium text-color' : 'border-transparent text-muted-color'"
                            [attr.aria-selected]="tab() === 'all'"
                            (click)="selectTab('all')"
                            (keydown.arrowLeft)="selectTab('unread'); tabUnread.focus()"
                            data-testid="notification-tab-all"
                        >
                            Tümü
                        </button>
                    </div>
                </div>

                @if (loading() && items().length === 0) {
                    <div class="px-4 py-8 text-center text-sm text-muted-color">Yükleniyor…</div>
                } @else if (error()) {
                    <div class="px-4 py-8 text-center text-sm text-muted-color" role="alert">{{ error() }}</div>
                } @else if (groups().length === 0) {
                    <div class="px-4 py-8 text-center text-sm text-muted-color" data-testid="notification-panel-empty">{{ tab() === 'unread' ? 'Okunmamış bildirim yok' : 'Bildirim yok' }}</div>
                } @else {
                    <div class="max-h-[22rem] overflow-y-auto pb-1" role="tabpanel">
                        @for (g of groups(); track g.day) {
                            <div class="layout-topbar-panel-group" [id]="'notification-day-' + $index">{{ g.day }}</div>
                            <ul class="list-none m-0 p-0" [attr.aria-labelledby]="'notification-day-' + $index">
                                @for (r of g.rows; track r.n.id) {
                                    <li>
                                        <button type="button" class="layout-topbar-panel-row items-start!" (click)="openRow(r.n)" data-testid="notification-panel-item">
                                            <span class="mt-0.5 w-7 h-7 rounded-full shrink-0 inline-flex items-center justify-center text-sm" [class]="r.tone" aria-hidden="true"><i [class]="r.icon"></i></span>
                                            <span class="flex-1 min-w-0">
                                                <span class="block truncate" [class.font-semibold]="r.unread">{{ r.n.title }}</span>
                                                <span class="block text-xs text-muted-color truncate">{{ r.meta }}</span>
                                            </span>
                                            @if (r.unread) {
                                                <span class="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden="true"></span><span class="sr-only">okunmadı</span>
                                            }
                                        </button>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                }

                <a
                    class="block text-center text-sm font-medium py-2.5 border-t border-surface-200 dark:border-surface-700 text-color hover:bg-surface-100 dark:hover:bg-surface-800"
                    [routerLink]="route"
                    (click)="panel.hide()"
                    data-testid="notification-panel-all"
                >
                    Bildirim merkezine git<i class="pi pi-angle-right ml-1 text-xs" aria-hidden="true"></i>
                </a>
            </div>
        </p-popover>
    `
})
export class AppNotificationBell implements OnInit {
    readonly route = NOTIFICATIONS_ROUTE;

    private readonly notifications = inject(NotificationService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly panelRef = viewChild.required<Popover>('panel');
    private readonly triggerEl = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
    private readonly requestAlert = viewChild.required(AppAppointmentRequestAlertComponent);

    readonly unreadCount = this.notifications.unreadCount;
    readonly badge = computed(() => menuBadgeLabel(this.unreadCount()));
    readonly ariaLabel = computed(() => {
        const count = this.unreadCount();

        return count > 0 ? `Bildirimler, ${count} okunmamış` : 'Bildirimler';
    });

    /** Panel açık (popover anında; kapanış animasyonunu beklemez). */
    readonly open = computed(() => this.panelRef().overlayVisible());
    readonly tab = signal<'unread' | 'all'>('unread');
    readonly items = signal<UserNotificationVm[]>([]);
    readonly loading = signal(false);
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly groups = computed(() => groupNotificationsByDay(this.items(), new Date()));

    private loadSeq = 0;

    ngOnInit(): void {
        merge(timer(0, REFRESH_INTERVAL_MS).pipe(filter(() => !document.hidden)), this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)))
            .pipe(throttleTime(MIN_GAP_MS, undefined, { leading: true, trailing: true }), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.notifications.refreshUnreadCount().subscribe({ error: () => undefined }));
    }

    /** Balondaki "Bildirimler" düğmesi: panel zilin altında açılır. */
    showPanel(): void {
        this.panelRef().show(null, this.triggerEl().nativeElement);
    }

    onShow(): void {
        // Panel açılınca balonun işi biter; panel kapanınca geri gelmesin.
        this.requestAlert().dismiss();
        this.tab.set('unread');
        this.items.set([]);
        this.load();
    }

    selectTab(tab: 'unread' | 'all'): void {
        if (tab === this.tab()) {
            return;
        }

        this.tab.set(tab);
        this.items.set([]);
        this.load();
    }

    openRow(n: UserNotificationVm): void {
        this.panelRef().hide();
        openNotification(this.notifications, this.router, n);
    }

    markAllRead(): void {
        this.busy.set(true);
        this.notifications.markAllRead(null).subscribe({
            next: () => {
                this.busy.set(false);
                this.notifications.refreshUnreadCount().subscribe({ error: () => undefined });
                this.load();
            },
            error: (e: unknown) => {
                this.busy.set(false);
                this.error.set(e instanceof Error ? e.message : 'Bildirimler güncellenemedi.');
            }
        });
    }

    /** Escape: panel kapanır, odak zile döner (PrimeNG popover odak geri vermez). */
    closeAndFocusTrigger(): void {
        this.panelRef().hide();
        this.triggerEl().nativeElement.focus();
    }

    private load(): void {
        const seq = ++this.loadSeq;

        this.loading.set(true);
        this.error.set(null);
        this.notifications.list(null, this.tab() === 'unread', 1, PANEL_PAGE_SIZE).subscribe({
            next: (r) => {
                if (seq === this.loadSeq) {
                    this.items.set(r.items);
                    this.loading.set(false);
                }
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Bildirimler yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
    }
}
