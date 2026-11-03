import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import type { PendingRequestPreviewVm } from '@/app/entities/online-booking/utils/pending-request-preview.utils';

/**
 * Bekleyen online talepler, "Açık işler" satırının ilk çipi (varsayılan görünüm): sayı ve en yakın istenen saat.
 * Tıklanınca açılır panelde ilk talepler; panelden kutucuk görünümüne geçilir. Son 30 dk içinde gelen talep varsa nabız noktası.
 */
@Component({
    selector: 'app-pending-appointment-requests-chip',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, ButtonModule, PopoverModule],
    styles: `
        @media (prefers-reduced-motion: no-preference) {
            .pending-pulse {
                animation: pending-pulse 1.8s ease-out infinite;
            }
        }
        @keyframes pending-pulse {
            0% {
                box-shadow: 0 0 0 0 color-mix(in srgb, var(--p-primary-color) 55%, transparent);
            }
            70%,
            100% {
                box-shadow: 0 0 0 6px transparent;
            }
        }
    `,
    template: `
        <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-border border px-2 py-0.5 text-sm font-medium cursor-pointer max-sm:min-h-(--touch-target) bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
            aria-haspopup="dialog"
            [attr.aria-expanded]="open()"
            (click)="panel.toggle($event)"
            data-testid="pending-requests-chip"
        >
            @if (hasNew()) {
                <span class="pending-pulse w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span><span class="sr-only">Yeni talep var.</span>
            } @else {
                <i class="pi pi-inbox" aria-hidden="true"></i>
            }
            Online talep: {{ total() }}
            @if (nearest(); as n) {
                <span class="font-normal opacity-80" data-testid="pending-requests-chip-nearest">· en yakını {{ n }}</span>
            }
            <i class="pi text-[0.65rem]" [class]="open() ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true"></i>
        </button>

        <p-popover #panel styleClass="w-[26rem] max-w-[calc(100vw-2rem)]" (onShow)="open.set(true)" (onHide)="open.set(false)">
            <div role="dialog" aria-labelledby="pendingRequestsPanelTitle" data-testid="pending-requests-panel">
                <div class="flex items-center justify-between gap-2 mb-1">
                    <span id="pendingRequestsPanelTitle" class="font-semibold">Onay bekleyen online talepler</span>
                    <span class="text-xs text-muted-color">{{ total() }} talep</span>
                </div>
                <ul class="list-none m-0 p-0 flex flex-col divide-y divide-surface-200 dark:divide-surface-700">
                    @for (r of rows(); track r.id) {
                        <li class="flex items-center gap-3 py-2" data-testid="pending-request-row">
                            <span class="w-20 shrink-0 leading-tight">
                                <span class="block text-xs" [class]="r.soon ? 'text-amber-700 dark:text-amber-300' : 'text-muted-color'">{{ r.dayLabel }}</span>
                                <span class="font-semibold">{{ r.time }}</span>
                            </span>
                            <span class="flex-1 min-w-0 text-sm leading-tight">
                                <span class="block truncate font-medium">{{ r.contactName }} · {{ r.petLabel }}</span>
                                <span class="block truncate text-xs text-muted-color">{{ r.reasonName }} · {{ r.receivedAgo }}</span>
                            </span>
                            <a pButton size="small" [text]="true" [routerLink]="requestsRoute" [queryParams]="{ requestId: r.id }" (click)="panel.hide()" data-testid="pending-request-open">İncele</a>
                        </li>
                    }
                </ul>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1 border-t border-surface-200 dark:border-surface-700">
                    <button pButton type="button" size="small" [text]="true" severity="secondary" (click)="panel.hide(); showTiles.emit()" data-testid="pending-requests-show-tiles">
                        <i class="pi pi-th-large" aria-hidden="true"></i>Kutucuklarla göster
                    </button>
                    <a [routerLink]="requestsRoute" class="text-sm font-medium" (click)="panel.hide()">Tümünü gör<i class="pi pi-angle-right ml-1 text-xs" aria-hidden="true"></i></a>
                </div>
            </div>
        </p-popover>
    `
})
export class PendingAppointmentRequestsChipComponent {
    readonly rows = input.required<PendingRequestPreviewVm[]>();
    readonly total = input.required<number>();
    /** Kullanıcı kutucuk görünümünü seçti (tercih üst katmanda saklanır). */
    readonly showTiles = output<void>();

    readonly requestsRoute = APPOINTMENT_REQUESTS_ROUTE;
    readonly open = signal(false);
    readonly hasNew = computed(() => this.rows().some((r) => r.isNew));
    /** İlk satır (sunucu istenen saate göre sıralar): "yarın 17:30" ya da "5 Kas Per 10:00". */
    readonly nearest = computed(() => {
        const r = this.rows()[0];

        return r ? `${r.soon ? r.dayLabel.toLocaleLowerCase('tr-TR') : r.dayLabel} ${r.time}` : null;
    });
}
