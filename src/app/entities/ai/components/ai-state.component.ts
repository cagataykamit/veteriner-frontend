import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * AI alanının yükleniyor / bilgi / sorun görünümü. Sorun amber simgeyle anlatılır; kırmızı ve "hata" sözcüğü yok.
 * `retryAvailableAt` gelecekteyse "Yeniden dene" geri sayımla pasif durur (429).
 */
@Component({
    selector: 'app-ai-state',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (loadingText(); as text) {
            <div aria-live="polite" data-testid="ai-state-loading">
                <div class="flex items-center gap-2.5 text-sm">
                    <i class="pi pi-spin pi-spinner text-ai" aria-hidden="true"></i>
                    <span>{{ text }}<br /><span class="text-muted-color text-xs">Genellikle birkaç saniye sürer. Bu sırada sayfada çalışmaya devam edebilirsiniz.</span></span>
                </div>
                <div class="flex flex-col gap-2.5 mt-4" aria-hidden="true">
                    @for (w of skeleton; track $index) {
                        <i class="block h-2.5 rounded-md bg-surface-200 dark:bg-surface-700 animate-pulse" [style.width.%]="w"></i>
                    }
                </div>
            </div>
        } @else {
            <div class="grid grid-cols-[2.5rem_1fr] gap-3 py-1" [attr.role]="tone() === 'warn' ? 'alert' : 'status'" data-testid="ai-state-message">
                <span class="grid place-items-center w-10 h-10 rounded-full" [class]="tone() === 'warn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-surface-100 text-muted-color dark:bg-surface-800'"
                    ><i [class]="'pi ' + icon()" aria-hidden="true"></i
                ></span>
                <div>
                    <b class="block font-semibold">{{ title() }}</b>
                    <p class="mt-1 mb-0 text-sm text-muted-color">{{ message() }}</p>
                    @if (retryLabel(); as label) {
                        <button pButton type="button" size="small" class="p-button-outlined p-button-secondary mt-3" [disabled]="remaining() > 0" (click)="retry.emit()" data-testid="ai-state-retry">
                            <i class="pi pi-refresh"></i>{{ label }}{{ remaining() > 0 ? ' · ' + countdown() : '' }}
                        </button>
                    }
                </div>
            </div>
        }
    `
})
export class AiStateComponent {
    /** Doluysa yükleniyor görünümü (iskelet satırlar); diğer girdiler yok sayılır. */
    readonly loadingText = input<string | null>(null);
    readonly icon = input('pi-info-circle');
    readonly tone = input<'neutral' | 'warn'>('neutral');
    readonly title = input('');
    readonly message = input('');
    /** Doluysa tekrar deneme düğmesi ("Tekrar dene", "Yeniden dene"). */
    readonly retryLabel = input<string | null>(null);
    /** `Date.now()` cinsinden; o ana kadar düğme pasif ve geri sayım yazılı. */
    readonly retryAvailableAt = input<number | null>(null);
    readonly retry = output<void>();

    protected readonly skeleton = [40, 92, 80, 30, 88, 70, 84];

    private readonly now = signal(Date.now());
    protected readonly remaining = computed(() => Math.max(0, Math.ceil(((this.retryAvailableAt() ?? 0) - this.now()) / 1000)));
    protected readonly countdown = computed(() => {
        const s = this.remaining();

        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    });

    constructor() {
        effect((onCleanup) => {
            const until = this.retryAvailableAt();

            this.now.set(Date.now());

            if (!until || until <= Date.now()) {
                return;
            }

            const id = setInterval(() => {
                this.now.set(Date.now());

                if (Date.now() >= until) {
                    clearInterval(id);
                }
            }, 1000);

            onCleanup(() => clearInterval(id));
        });
    }
}
