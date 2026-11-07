import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { seoDescription, seoTitle, siteJsonLd, siteRobotsTxt, siteRootUrl, siteSitemapXml, stockSharePhoto, type StoredSiteConfig } from '@site-engine';
import { SiteAddressComponent } from '@/app/features/clinic-site/builder/site-address.component';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { auditPreview, contrastChecks, imageChecks, seoChecks, type SiteCheck } from '@/app/features/clinic-site/builder/site-checks';
import { WFieldComponent, WImageComponent, WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';
import { environment } from '@/environments/environment';

/** 6. adım: SEO ve teknik. Önizlemeler ve kontroller gerçekten hesaplanır; üretilen dosyalar sitenin sunucusunun yazdığı çıktıyla aynı kuraldır. */
@Component({
    selector: 'app-seo-step',
    standalone: true,
    imports: [WFieldComponent, WImageComponent, SiteAddressComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let s = seo();
        <section class="group">
            <app-w-field label="SEO başlığı" [limit]="60" [value]="s.title" [placeholder]="title()" (valueChange)="set('title', $event)" />
            <app-w-field label="Meta açıklama" [rows]="3" [limit]="160" [value]="s.description" [placeholder]="description()" (valueChange)="set('description', $event)" />
            <app-site-address />
            <div>
                <p class="mini">Paylaşım görseli (OG)</p>
                <app-w-image label="Paylaşım görseli yükle" [reference]="s.ogImage" emptyText="Boşsa hero fotoğrafı kullanılır." [stock]="shareStock()" (referenceChange)="set('ogImage', $event)" />
            </div>
            <div>
                <p class="mini">Site simgesi (favicon)</p>
                <app-w-image label="Favicon yükle" [reference]="s.favicon" [contain]="true" [maxSide]="256" emptyText="Boşsa logo kullanılır." (referenceChange)="set('favicon', $event)" />
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Google sonucu</h3>
            <div class="serp">
                <p class="s-url">vetinity.com › k › {{ store.slug() }}</p>
                <p class="s-title">{{ title() }}</p>
                <p class="s-desc">{{ description() }}</p>
            </div>
            <h3 class="group-title">Paylaşım kartı</h3>
            <div class="card">
                @if (ogPreview(); as image) {
                    <img [src]="image" alt="" />
                }
                <div>
                    <p class="c-host">vetinity.com</p>
                    <p class="c-title">{{ title() }}</p>
                    <p class="c-desc">{{ description() }}</p>
                </div>
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Kontroller</h3>
            <p class="hint">SEO, kontrast ve görsel satırları yapılandırmadan hesaplanır.</p>
            <ul class="checks">
                @for (check of staticChecks(); track check.label) {
                    <li [class.bad]="!check.ok"><i class="pi" [class.pi-check]="check.ok" [class.pi-exclamation-triangle]="!check.ok" aria-hidden="true"></i><span><strong>{{ check.label }}</strong> {{ check.detail }}</span></li>
                }
            </ul>
            <h4 class="group-title">Mobil uyum ve erişilebilirlik</h4>
            <p class="hint">Önizlemede açık olan sayfa ve cihaz ölçülür: {{ deviceLabel() }}, {{ store.previewPath() }}. Diğer sayfaları görmek için önizlemeyi değiştirip yeniden ölçün.</p>
            <ul class="checks">
                @for (check of audit(); track check.label) {
                    <li [class.bad]="!check.ok"><i class="pi" [class.pi-check]="check.ok" [class.pi-exclamation-triangle]="!check.ok" aria-hidden="true"></i><span><strong>{{ check.label }}</strong> {{ check.detail }}</span></li>
                } @empty {
                    <li>Henüz ölçülmedi.</li>
                }
            </ul>
            <button type="button" class="wbtn" (click)="runAudit()"><i class="pi pi-refresh" aria-hidden="true"></i>Yeniden ölç</button>
        </section>

        <section class="group">
            <h3 class="group-title">Üretilen dosyalar</h3>
            <p class="hint">Site yayındayken sunucu bunları aynı kuralla üretir. Adres: {{ origin() }}.</p>
            <details class="fold">
                <summary>sitemap.xml<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
                <pre tabindex="0">{{ sitemap() }}</pre>
            </details>
            <details class="fold">
                <summary>robots.txt<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
                <pre tabindex="0">{{ robots }}</pre>
            </details>
            <details class="fold">
                <summary>VeterinaryCare (JSON-LD)<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
                <pre tabindex="0">{{ jsonLd() }}</pre>
            </details>
        </section>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .mini {
                margin-bottom: 6px;
                font-size: 13px;
                font-weight: 600;
            }

            .serp {
                padding: 14px;
                border: 1px solid var(--w-line);
                border-radius: 12px;
                background: #ffffff;
                font-family: Arial, sans-serif;
            }

            .s-url {
                color: #4d5156;
                font-size: 13px;
            }

            .s-title {
                margin-top: 4px;
                overflow: hidden;
                color: #1a0dab;
                font-size: 19px;
                line-height: 1.3;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .s-desc {
                margin-top: 4px;
                display: -webkit-box;
                overflow: hidden;
                color: #4d5156;
                font-size: 14px;
                line-height: 1.45;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
            }

            .card {
                overflow: hidden;
                border: 1px solid var(--w-line);
                border-radius: 12px;
                background: #ffffff;
            }

            .card img {
                display: block;
                width: 100%;
                aspect-ratio: 1.91;
                object-fit: cover;
            }

            .card > div {
                padding: 10px 14px 12px;
                font-family: Arial, sans-serif;
            }
        `,
        `
            .c-host {
                color: #65676b;
                font-size: 12px;
                text-transform: uppercase;
            }

            .c-title {
                margin-top: 2px;
                color: #1c1e21;
                font-size: 15px;
                font-weight: 700;
            }

            .c-desc {
                margin-top: 2px;
                overflow: hidden;
                color: #65676b;
                font-size: 13px;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .checks {
                display: grid;
                gap: 8px;
                font-size: 13px;
                line-height: 1.4;
            }

            .checks li {
                display: flex;
                gap: 10px;
            }

            .checks .pi {
                margin-top: 2px;
                color: var(--w-ok-ink);
                font-size: 12px;
            }

            .checks .bad .pi {
                color: var(--w-warn-ink);
            }

            pre {
                margin: 0;
                padding: 12px 14px;
                overflow: auto;
                border-top: 1px solid var(--w-line);
                font-family: ui-monospace, Consolas, monospace;
                font-size: 12px;
                line-height: 1.5;
                white-space: pre;
            }
        `
    ]
})
export class SeoStepComponent {
    protected readonly store = inject(SiteBuilderStore);
    protected readonly robots = siteRobotsTxt();

    protected readonly seo = computed(() => this.store.stored().seo);
    protected readonly title = computed(() => seoTitle(this.store.config()));
    protected readonly description = computed(() => seoDescription(this.store.config()));
    protected readonly origin = computed(() => siteRootUrl(environment.siteBaseUrl, this.store.slug()));
    protected readonly sitemap = computed(() => siteSitemapXml(this.store.config(), environment.siteBaseUrl));
    protected readonly jsonLd = computed(() => siteJsonLd(this.store.config(), environment.siteBaseUrl, true));
    protected readonly staticChecks = computed(() => [...seoChecks(this.store.config()), ...contrastChecks(this.store.config()), ...imageChecks(this.store.config())]);
    protected readonly deviceLabel = computed(() => ({ masaustu: 'masaüstü', tablet: 'tablet', mobil: 'mobil' })[this.store.device()]);
    protected readonly audit = signal<readonly SiteCheck[]>([]);
    /** Klinik hero da yüklemediyse paylaşımda hazır fotoğraf görünür. */
    protected readonly shareStock = computed(() => (this.store.stored().content.heroImage ? null : stockSharePhoto(this.store.stored().design.conceptKey)));
    protected readonly ogPreview = computed(() => this.store.imageSrc(this.seo().ogImage ?? this.store.stored().content.heroImage?.src) ?? this.shareStock()?.src ?? null);

    constructor() {
        effect(() => {
            this.store.device();
            this.store.previewPath();
            this.store.renderConfig();
            untracked(() => setTimeout(() => this.runAudit(), 400));
        });
    }

    protected set<K extends keyof StoredSiteConfig['seo']>(key: K, value: StoredSiteConfig['seo'][K]): void {
        this.store.patch((config) => ({ ...config, seo: { ...config.seo, [key]: value } }), `seo.${key}`);
    }

    protected runAudit(): void {
        const root = this.store.previewRoot();

        if (root) this.audit.set(auditPreview(root));
    }
}
