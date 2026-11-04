import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import type { PendingRequestPreviewVm } from '@/app/entities/online-booking/utils/pending-request-preview.utils';

/**
 * Bekleyen online talepler, Bugün ekranının başında kutucuklar (varsayılan görünüm): istenen saat iri, gün etiketi
 * bugün/yarın için vurgulu, altta kaynak ve ne zaman geldiği. Kutucuk talebi `openRequest` ile açtırır (pencere Bugün ekranında).
 * Bölümün eylemleri sıranın sonundaki kesikli kutucukta: "+N talep daha" / "Tümünü gör" kuyruğa gider,
 * "Açık işlerde göster" çip görünümüne döner. Dar ekranda kutucuklar yatay kayar.
 */
@Component({
    selector: 'app-pending-appointment-requests-tiles',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    styles: `
        .pending-tiles {
            scroll-snap-type: x mandatory;
            scrollbar-width: thin;
        }
        .pending-tiles > * {
            scroll-snap-align: start;
        }
    `,
    template: `
        <section class="mb-4" aria-labelledby="pendingRequestsTitle" data-testid="pending-requests-tiles">
            <h2 id="pendingRequestsTitle" class="m-0 mb-2 text-base font-semibold flex items-center gap-2">
                <i class="pi pi-inbox text-primary" aria-hidden="true"></i>Online talepler
                <span class="text-xs rounded-full px-2 py-0.5 bg-primary text-primary-contrast font-semibold" data-testid="pending-requests-count">{{ total() }}</span>
                <span class="text-sm font-normal text-muted-color max-sm:hidden">onay bekliyor</span>
            </h2>
            <div class="pending-tiles flex gap-3 overflow-x-auto pb-1">
                @for (r of rows(); track r.id) {
                    <button
                        type="button"
                        (click)="openRequest.emit(r.id)"
                        class="group shrink-0 flex-1 min-w-[12.5rem] max-w-[18rem] max-sm:min-w-[78%] flex flex-col gap-1 text-left cursor-pointer rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-3 text-color hover:border-primary transition-colors"
                        [class]="r.isNew ? 'border-t-4 border-t-primary!' : ''"
                        [attr.aria-label]="r.dayLabel + ' ' + r.time + ', ' + r.contactName + ', ' + r.petLabel + (r.isNew ? ', yeni' : '')"
                        data-testid="pending-request-tile"
                    >
                        <span class="flex items-baseline justify-between gap-2">
                            <span>
                                <span class="text-xs uppercase tracking-wide font-semibold" [class]="r.soon ? 'text-amber-700 dark:text-amber-300' : 'text-muted-color'" data-testid="pending-request-day">{{ r.dayLabel }}</span>
                                <span class="block text-2xl font-semibold leading-tight">{{ r.time }}</span>
                            </span>
                            <span class="text-xs text-muted-color whitespace-nowrap">{{ r.durationMinutes }} dk</span>
                        </span>
                        <span class="font-medium truncate">{{ r.contactName }}</span>
                        <span class="text-sm text-muted-color truncate">{{ r.petLabel }} · {{ r.reasonName }}</span>
                        <span class="mt-1 pt-2 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between gap-2 text-xs text-muted-color">
                            <span class="inline-flex items-center gap-1 min-w-0 truncate"><i [class]="r.sourceIcon" aria-hidden="true"></i>{{ r.sourceLabel }} · {{ r.receivedAgo }}</span>
                            <span class="font-medium text-primary group-hover:underline">İncele</span>
                        </span>
                    </button>
                }
                <div class="shrink-0 w-40 flex flex-col rounded-border border border-dashed border-surface-300 dark:border-surface-600 text-sm" data-testid="pending-requests-actions-tile">
                    <a [routerLink]="requestsRoute" class="flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2 no-underline text-muted-color hover:text-primary" data-testid="pending-requests-all">
                        @if (more() > 0) {
                            <span class="text-2xl font-semibold leading-none" data-testid="pending-requests-more">+{{ more() }}</span>
                            <span>talep daha</span>
                        }
                        <span class="inline-flex items-center gap-1 font-medium text-primary">Tümünü gör<i class="pi pi-angle-right text-xs" aria-hidden="true"></i></span>
                    </a>
                    <button
                        type="button"
                        class="flex items-center justify-center gap-1.5 whitespace-nowrap px-3 pt-2 pb-3 bg-transparent border-0 border-t border-dashed border-surface-300 dark:border-surface-600 cursor-pointer text-xs text-muted-color hover:text-color"
                        title="Talepleri Açık işler satırında tek satır olarak göster"
                        (click)="showChip.emit()"
                        data-testid="pending-requests-show-chip"
                    >
                        <i class="pi pi-window-minimize text-xs! leading-none!" aria-hidden="true"></i>Açık işlerde göster
                    </button>
                </div>
            </div>
        </section>
    `
})
export class PendingAppointmentRequestsTilesComponent {
    readonly rows = input.required<PendingRequestPreviewVm[]>();
    readonly total = input.required<number>();
    /** Kullanıcı çip görünümüne döndü (tercih üst katmanda saklanır). */
    readonly showChip = output<void>();
    /** Talep sayfadan ayrılmadan açılsın (pencereyi üst sayfa çizer). */
    readonly openRequest = output<string>();

    readonly requestsRoute = APPOINTMENT_REQUESTS_ROUTE;
    readonly more = computed(() => this.total() - this.rows().length);
}
