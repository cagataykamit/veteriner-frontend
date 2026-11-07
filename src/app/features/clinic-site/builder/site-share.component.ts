import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import qrcode from 'qrcode-generator';
import { siteRootUrl } from '@site-engine';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';
import { environment } from '@/environments/environment';

/** Yayın sonrası paylaşım (ADR-045 K9): bağlantı, QR, WhatsApp. Yalnız yayınlanmış sitede çizilir. QR tamamen tarayıcıda üretilir. */
@Component({
    selector: 'app-site-share',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="group share">
            <h3 class="group-title">Sitenizi paylaşın</h3>
            <div class="link-row">
                <input type="text" readonly [value]="url()" aria-label="Site bağlantısı" (focus)="$any($event.target).select()" />
                <button type="button" class="wbtn" (click)="copy()"><i class="pi" [class.pi-copy]="!copied()" [class.pi-check]="copied()" aria-hidden="true"></i>{{ copied() ? 'Kopyalandı' : 'Kopyala' }}</button>
            </div>
            @if (copyFailed()) {
                <p class="hint" role="alert">Tarayıcı kopyalamaya izin vermedi; bağlantıyı seçip elle kopyalayın.</p>
            }
            <div class="share-row">
                <a class="wbtn" [href]="whatsappHref()" target="_blank" rel="noopener"><i class="pi pi-whatsapp" aria-hidden="true"></i>WhatsApp'ta paylaş</a>
                <a class="wbtn" [href]="url()" target="_blank" rel="noopener">Siteyi aç<i class="pi pi-external-link" aria-hidden="true"></i></a>
            </div>
            <div class="qr-row">
                <img class="qr" [src]="qrSrc()" width="148" height="148" [attr.alt]="'Site adresinin QR kodu: ' + url()" />
                <div class="qr-text">
                    <p class="hint">Tabela, kartvizit ya da broşüre koyabilirsiniz. Adresi değiştirseniz de bu kod ve eski bağlantı çalışır, yeni adrese yönlenir.</p>
                    <a class="wbtn small" [href]="qrSrc()" [attr.download]="'qr-' + store.slug() + '.svg'"><i class="pi pi-download" aria-hidden="true"></i>QR indir</a>
                </div>
            </div>
        </section>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .share {
                padding-top: 0;
            }

            .link-row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 6px;
            }

            .link-row input {
                width: 100%;
                min-width: 0;
                min-height: 44px;
                padding: 0 12px;
                border: 1px solid var(--w-line-strong);
                border-radius: 10px;
                background: var(--w-soft);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 14px;
            }

            .share-row {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .qr-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 14px;
            }

            .qr {
                flex: none;
                padding: 8px;
                border: 1px solid var(--w-line);
                border-radius: 10px;
                background: #ffffff;
            }

            .qr-text {
                display: grid;
                flex: 1 1 180px;
                gap: 8px;
                justify-items: start;
            }
        `
    ]
})
export class SiteShareComponent {
    protected readonly store = inject(SiteBuilderStore);

    protected readonly copied = signal(false);
    protected readonly copyFailed = signal(false);
    protected readonly url = computed(() => siteRootUrl(environment.siteBaseUrl, this.store.slug()));
    protected readonly whatsappHref = computed(() => `https://wa.me/?text=${encodeURIComponent(`${this.store.record().name}: ${this.url()}`)}`);
    protected readonly qrSrc = computed(() => siteQrDataUrl(this.url()));

    protected copy(): void {
        this.copyFailed.set(false);
        navigator.clipboard?.writeText(this.url()).then(
            () => {
                this.copied.set(true);
                setTimeout(() => this.copied.set(false), 2000);
            },
            () => this.copyFailed.set(true)
        );
    }
}

/** SVG QR'ın adresi. Hata düzeltme "M": tabela ve baskıda küçük bozulmayı tolere eder. */
export function siteQrDataUrl(text: string): string {
    const qr = qrcode(0, 'M');

    qr.addData(text);
    qr.make();

    const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
