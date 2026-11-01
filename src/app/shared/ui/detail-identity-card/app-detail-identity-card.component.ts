import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DETAIL_STATS_GRID_CLASS } from '@/app/shared/ui/detail.classes';

/**
 * Detay sayfası kimlik kartı kabuğu (müşteri/hasta kartlarıyla aynı dil): sol simge, başlık + rozetler (`[badges]`), alt başlık,
 * künye satırı, serbest içerik (bağlantılar, uyarılar), sağ üstte eylemler (`[actions]`), altta gösterge şeridi (`[stat]` maddeleri).
 * Alan adları ve izinler sayfanındır; kabuk yalnız düzen verir.
 */
@Component({
    selector: 'app-detail-identity-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="card mb-4 @container" [attr.aria-label]="ariaLabel()" [attr.data-testid]="testId()">
            <div class="flex flex-wrap items-start gap-x-5 gap-y-3">
                <div class="shrink-0 flex items-center justify-center w-11 h-11 text-lg @md:w-14 @md:h-14 @md:text-2xl rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200" aria-hidden="true">
                    <i [class]="icon()"></i>
                </div>
                <div class="min-w-0 flex-1 basis-56">
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h1 class="m-0 text-2xl font-semibold leading-tight text-surface-900 dark:text-surface-0 break-words">{{ title() }}</h1>
                        <ng-content select="[badges]" />
                    </div>
                    @if (subtitle()) {
                        <p class="m-0 mt-1 text-base font-medium text-surface-900 dark:text-surface-0 break-words">{{ subtitle() }}</p>
                    }
                    @if (meta()) {
                        <p class="m-0 mt-1 text-sm text-muted-color break-words">{{ meta() }}</p>
                    }
                    <ng-content />
                </div>
                <div class="flex flex-wrap gap-2 items-center w-full @md:w-auto @md:ml-auto">
                    <ng-content select="[actions]" />
                </div>
            </div>
            @if (stats()) {
                <dl [class]="statsClass">
                    <ng-content select="[stat]" />
                </dl>
            }
        </section>
    `
})
export class AppDetailIdentityCardComponent {
    /** primeicons sınıfı (ör. `pi pi-calendar`). */
    readonly icon = input.required<string>();
    readonly title = input.required<string>();
    /** Başlığın altında bir boy küçük, kalın (ör. tarih-saat). */
    readonly subtitle = input<string>();
    /** Soluk künye satırı (ör. "Oluşturulma: … · Güncellenme: …"). */
    readonly meta = input<string>();
    /** `[stat]` maddeleri yansıtılacaksa gösterge şeridi çizilir. */
    readonly stats = input(true);
    readonly ariaLabel = input<string>('Kimlik ve durum');
    readonly testId = input<string>('detail-identity-card');

    protected readonly statsClass = DETAIL_STATS_GRID_CLASS;
}
