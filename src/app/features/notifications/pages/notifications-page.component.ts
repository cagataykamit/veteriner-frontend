import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { NotificationService, openNotification, USER_NOTIFICATION_TYPE_LABELS, UserNotificationType, type UserNotificationVm } from '@/app/entities/notification/notification.service';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

const PAGE_SIZE = 20;

/**
 * Bildirim merkezi (APPT-015, UX-008): oturumdaki kullanıcıya yönelik olaylar (yeni talep, talep iptali, atanan randevu).
 * Tür filtresi ve yalnız okunmamışlar; tıklanınca okundu işaretlenir ve ilgili kayıt açılır. Açık işler listesinin yerini almaz.
 */
@Component({
    selector: 'app-notifications-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, CheckboxModule, SelectModule, AppPageHeaderComponent, AppLoadingStateComponent, AppEmptyStateComponent, AppErrorStateComponent],
    template: `
        <app-page-header title="Bildirimler" description="Size yönelik olaylar: yeni online randevu talepleri, talep iptalleri, size atanan randevular ve portaldan gelen veri talepleri.">
            <button actions pButton type="button" severity="secondary" [disabled]="busy() || unread() === 0" (click)="markAllRead()" data-testid="notifications-read-all"><i class="pi pi-check-square"></i>Tümünü okundu say</button>
        </app-page-header>

        <div class="card">
            <div class="flex flex-col md:flex-row md:items-end gap-4 mb-4">
                <div class="flex flex-col gap-1 w-full md:max-w-xs">
                    <label for="notificationType" class="text-sm font-medium text-muted-color">Tür</label>
                    <p-select inputId="notificationType" [options]="typeOptions" optionLabel="label" optionValue="value" [ngModel]="type()" (ngModelChange)="onTypeChange($event)" class="w-full" />
                </div>
                <div class="flex items-center gap-2 md:mb-2">
                    <p-checkbox inputId="notificationUnread" [binary]="true" [ngModel]="unreadOnly()" (ngModelChange)="onUnreadChange($event)" />
                    <label for="notificationUnread" class="text-sm">Yalnız okunmamışlar</label>
                </div>
            </div>

            @if (loading()) {
                <app-loading-state message="Bildirimler yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (items().length === 0) {
                <app-empty-state message="Bildirim yok." />
            } @else {
                <ul class="list-none p-0 m-0 flex flex-col divide-y divide-surface-200 dark:divide-surface-700">
                    @for (n of items(); track n.id) {
                        <li>
                            <button type="button" class="w-full text-left bg-transparent border-none p-3 cursor-pointer flex gap-3 items-start hover:bg-surface-100 dark:hover:bg-surface-800 rounded" (click)="open(n)" data-testid="notification-item">
                                <span class="mt-1 w-2 h-2 rounded-full shrink-0" [class.bg-primary]="!n.readAtUtc" [class.bg-transparent]="!!n.readAtUtc" aria-hidden="true"></span>
                                <span class="flex-1 min-w-0">
                                    <span class="block" [class.font-semibold]="!n.readAtUtc">{{ n.title }}</span>
                                    @if (n.body) {
                                        <span class="block text-sm text-muted-color">{{ n.body }}</span>
                                    }
                                    <span class="block text-xs text-muted-color mt-1">{{ typeLabel(n.type) }} · {{ fmt(n.createdAtUtc) }}{{ n.readAtUtc ? '' : ' · okunmadı' }}</span>
                                </span>
                            </button>
                        </li>
                    }
                </ul>
                @if (totalPages() > 1) {
                    <div class="flex items-center justify-end gap-2 mt-3">
                        <button pButton type="button" severity="secondary" size="small" [disabled]="page() <= 1" (click)="goTo(page() - 1)" aria-label="Önceki sayfa"><i class="pi pi-chevron-left"></i></button>
                        <span class="text-sm text-muted-color">{{ page() }} / {{ totalPages() }}</span>
                        <button pButton type="button" severity="secondary" size="small" [disabled]="page() >= totalPages()" (click)="goTo(page() + 1)" aria-label="Sonraki sayfa"><i class="pi pi-chevron-right"></i></button>
                    </div>
                }
            }
        </div>
    `
})
export class NotificationsPageComponent implements OnInit {
    readonly typeOptions: { label: string; value: UserNotificationType | null }[] = [
        { label: 'Tüm türler', value: null },
        ...Object.values(UserNotificationType)
            .filter((v): v is UserNotificationType => typeof v === 'number')
            .map((value) => ({ label: USER_NOTIFICATION_TYPE_LABELS[value], value }))
    ];

    private readonly service = inject(NotificationService);
    private readonly router = inject(Router);

    readonly type = signal<UserNotificationType | null>(null);
    readonly unreadOnly = signal(false);
    readonly page = signal(1);
    readonly items = signal<UserNotificationVm[]>([]);
    readonly total = signal(0);
    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
    readonly unread = this.service.unreadCount;
    readonly loading = signal(true);
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    fmt = (utc: string) => formatDateTimeDisplay(utc);
    typeLabel = (t: UserNotificationType) => USER_NOTIFICATION_TYPE_LABELS[t] ?? 'Bildirim';

    private loadSeq = 0;

    ngOnInit(): void {
        this.load();
    }

    onTypeChange(type: UserNotificationType | null): void {
        this.type.set(type);
        this.page.set(1);
        this.load();
    }

    onUnreadChange(value: boolean): void {
        this.unreadOnly.set(value);
        this.page.set(1);
        this.load();
    }

    goTo(page: number): void {
        this.page.set(page);
        this.load();
    }

    open(n: UserNotificationVm): void {
        openNotification(this.service, this.router, n, () => this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, readAtUtc: new Date().toISOString() } : x))));
    }

    markAllRead(): void {
        this.busy.set(true);
        this.service.markAllRead(this.type()).subscribe({
            next: () => {
                this.busy.set(false);
                this.service.refreshUnreadCount().subscribe({ error: () => undefined });
                this.load();
            },
            error: (e: unknown) => {
                this.busy.set(false);
                this.error.set(e instanceof Error ? e.message : 'Bildirimler güncellenemedi.');
            }
        });
    }

    load(): void {
        const seq = ++this.loadSeq;

        this.loading.set(true);
        this.error.set(null);
        this.service.list(this.type(), this.unreadOnly(), this.page(), PAGE_SIZE).subscribe({
            next: (r) => {
                if (seq === this.loadSeq) {
                    this.items.set(r.items);
                    this.total.set(r.totalCount);
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
