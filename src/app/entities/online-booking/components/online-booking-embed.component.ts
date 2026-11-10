import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { BOOKING_BUTTON_STYLE, BOOKING_BUTTON_TEXT, bookingButtonHtml, bookingIframeHtml, EMBED_FALLBACK_HEIGHT } from '@/app/entities/online-booking/utils/online-booking-embed.utils';
import { copyTextToClipboard } from '@/app/shared/utils/clipboard.utils';

type SnippetKey = 'button' | 'iframe';

/**
 * "Sitenize ekleyin" (APPT-020/021): kliniğin kendi sitesine yapıştıracağı düğme ve gömme kodu, kopyala ve önizleme. Kodlar
 * `online-booking-embed.utils.ts`'te üretilir; buradaki düğme önizlemesi aynı metin ve stille çizilir. Gömme önizlemesi
 * gerçek talep sayfasını açtığından istenince yüklenir.
 */
@Component({
    selector: 'app-online-booking-embed',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, TextareaModule],
    template: `
        <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12 lg:col-span-6 flex flex-col gap-3" data-testid="embed-button">
                <h6 class="m-0">Randevu düğmesi</h6>
                <p class="text-sm text-muted-color m-0">Sitenizin herhangi bir yerine koyun; talep formu yeni sekmede açılır.</p>
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white p-4" aria-label="Düğme önizlemesi" role="group">
                    <a [href]="buttonPreviewUrl()" target="_blank" rel="noopener" [style]="buttonStyle" data-testid="embed-button-preview">{{ buttonText }}</a>
                </div>
                <textarea pTextarea readonly rows="4" class="w-full font-mono text-xs" [value]="buttonCode()" aria-label="Düğme HTML kodu" data-testid="embed-button-code" (focus)="$any($event.target).select()"></textarea>
                <div>
                    <button pButton type="button" severity="secondary" (click)="copy('button', buttonCode())" data-testid="embed-button-copy">
                        <i class="pi" [class.pi-copy]="copied() !== 'button'" [class.pi-check]="copied() === 'button'" aria-hidden="true"></i>{{ copied() === 'button' ? 'Kopyalandı' : 'Kodu kopyala' }}
                    </button>
                </div>
            </div>

            <div class="col-span-12 lg:col-span-6 flex flex-col gap-3" data-testid="embed-iframe">
                <h6 class="m-0">Sayfaya gömülü form</h6>
                <p class="text-sm text-muted-color m-0">Müşteri sitenizden çıkmadan talep gönderir; e-posta kodu da çerçevenin içinde çalışır. Yükseklik içeriğe göre ayarlanır.</p>
                <textarea pTextarea readonly rows="7" class="w-full font-mono text-xs" [value]="iframeCode()" aria-label="Gömme HTML kodu" data-testid="embed-iframe-code" (focus)="$any($event.target).select()"></textarea>
                <div class="flex flex-wrap gap-2">
                    <button pButton type="button" severity="secondary" (click)="copy('iframe', iframeCode())" data-testid="embed-iframe-copy">
                        <i class="pi" [class.pi-copy]="copied() !== 'iframe'" [class.pi-check]="copied() === 'iframe'" aria-hidden="true"></i>{{ copied() === 'iframe' ? 'Kopyalandı' : 'Kodu kopyala' }}
                    </button>
                    <button pButton type="button" severity="secondary" [outlined]="true" (click)="previewOpen.set(!previewOpen())" [attr.aria-expanded]="previewOpen()" data-testid="embed-iframe-toggle">
                        <i class="pi pi-eye" aria-hidden="true"></i>{{ previewOpen() ? 'Önizlemeyi kapat' : 'Önizle' }}
                    </button>
                </div>
                @if (previewOpen() && framePreviewUrl(); as src) {
                    <iframe [src]="src" [title]="clinicName() + ': online randevu talebi önizlemesi'" class="w-full rounded-lg border border-surface-200 dark:border-surface-700" [style.height.px]="previewHeight" data-testid="embed-iframe-preview"></iframe>
                }
            </div>
        </div>
        @if (copyFailed()) {
            <p class="text-sm text-amber-700 dark:text-amber-300 mt-3 mb-0" role="alert">Tarayıcı kopyalamaya izin vermedi; kodu seçip elle kopyalayın.</p>
        }
    `
})
export class OnlineBookingEmbedComponent {
    private readonly sanitizer = inject(DomSanitizer);

    /** Sunucunun verdiği kliniğe özel bağlantı (`bookingUrl`, sözleşme §3). */
    readonly bookingUrl = input.required<string>();
    readonly clinicName = input('');

    readonly buttonText = BOOKING_BUTTON_TEXT;
    readonly buttonStyle = BOOKING_BUTTON_STYLE;
    readonly previewHeight = EMBED_FALLBACK_HEIGHT;

    readonly copied = signal<SnippetKey | null>(null);
    readonly copyFailed = signal(false);
    readonly previewOpen = signal(false);

    readonly buttonCode = computed(() => bookingButtonHtml(this.bookingUrl()));
    readonly iframeCode = computed(() => bookingIframeHtml(this.bookingUrl(), this.clinicName()));
    /** Önizlemedeki tıklama klinik bağlantısı sayılır; dış site sayısı panelden şişmez. */
    readonly buttonPreviewUrl = computed(() => this.bookingUrl());
    /** Çerçeve adresi yalnız sunucudan gelen http(s) bağlantısıdır; başka şema önizlenmez. */
    readonly framePreviewUrl = computed<SafeResourceUrl | null>(() => {
        const url = this.bookingUrl();

        return /^https?:\/\//i.test(url) ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
    });

    copy(key: SnippetKey, text: string): void {
        void copyTextToClipboard(text).then((ok) => {
            this.copyFailed.set(!ok);
            this.copied.set(ok ? key : null);

            if (ok) {
                setTimeout(() => this.copied() === key && this.copied.set(null), 2000);
            }
        });
    }
}
