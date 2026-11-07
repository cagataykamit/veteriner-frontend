import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { siteRootUrl, type StoredSiteConfig } from '@site-engine';
import { draftClaims } from '@/app/features/clinic-site/builder/site-claims';
import { type DeviceKey, SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { defaultCopyLabels, publishWarnings, seoChecks } from '@/app/features/clinic-site/builder/site-checks';
import { SiteThumbComponent } from '@/app/features/clinic-site/builder/site-preview.component';
import { SiteShareComponent } from '@/app/features/clinic-site/builder/site-share.component';
import { WFieldComponent, WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';
import { CLINIC_SITE_MISSING_LABELS } from '@/app/features/clinic-site/models/clinic-site.model';
import { formatUtcToLocalDateTime } from '@/app/shared/utils/date.utils';
import { environment } from '@/environments/environment';

const DEVICES: readonly { readonly key: DeviceKey; readonly label: string; readonly width: number; readonly height: number }[] = [
    { key: 'masaustu', label: 'Masaüstü', width: 1280, height: 800 },
    { key: 'tablet', label: 'Tablet', width: 820, height: 1000 },
    { key: 'mobil', label: 'Mobil', width: 375, height: 720 }
];

/** 7. adım: son kontrol ve yayın. Zorunlu liste backend'den gelir (K9), kopyalanmaz; diğer eksikler ve K14 uyarıları engel değildir. */
@Component({
    selector: 'app-publish-step',
    standalone: true,
    imports: [SiteThumbComponent, WFieldComponent, SiteShareComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (store.isPublished()) {
            <app-site-share />
        }

        <section class="group">
            <h3 class="group-title">Cihaz önizlemeleri</h3>
            <div class="devices">
                @for (device of devices; track device.key) {
                    <button type="button" class="device" [attr.aria-pressed]="store.device() === device.key" (click)="store.device.set(device.key)">
                        <app-site-thumb [config]="store.renderConfig()" [logicalWidth]="device.width" [logicalHeight]="device.height" />
                        <span>{{ device.label }}</span>
                    </button>
                }
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Site adı ve adres</h3>
            <app-w-field label="Site adı" [claimCheck]="false" [value]="siteName()" [placeholder]="store.record().name" (valueChange)="setSiteName($event)" />
            <div class="address">
                <p class="hint">Siteniz Vetinity adresinde yayınlanır; kendi alan adı bu sürümde yok.</p>
                <p class="url">vetinity.com/k/{{ store.slug() }}</p>
                <button type="button" class="wbtn ghost small" (click)="store.step.set(5)">Adresi değiştir</button>
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Yayın için gerekenler</h3>
            <ul class="lines">
                @for (key of store.missingForPublish(); track key) {
                    <li class="must">
                        <span><i class="pi pi-times-circle" aria-hidden="true"></i>{{ missingLabels[key] }} eksik. Yayınlamak için gerekli.</span>
                        <button type="button" class="wbtn ghost small" (click)="store.step.set(0)">Düzelt</button>
                    </li>
                }
                @if (store.missingImageIds().length) {
                    <li class="must">
                        <span><i class="pi pi-times-circle" aria-hidden="true"></i>Taslak silinmiş {{ store.missingImageIds().length }} görsele başvuruyor. Yeni görsel seçin ya da alanı temizleyin.</span>
                        <button type="button" class="wbtn ghost small" (click)="store.step.set(4)">Düzelt</button>
                    </li>
                }
                @if (ready()) {
                    <li class="good"><span><i class="pi pi-check" aria-hidden="true"></i>Zorunlu bilgiler tamam.</span></li>
                }
                @if (store.recordDirty()) {
                    <li class="must">
                        <span><i class="pi pi-exclamation-triangle" aria-hidden="true"></i>Klinik bilgilerinde yazılmamış değişiklik var; yayın eski bilgiyi gösterir.</span>
                        <button type="button" class="wbtn ghost small" (click)="store.step.set(0)">Klinik bilgileri</button>
                    </li>
                }
            </ul>
            @if (warnings().length) {
                <h3 class="group-title">Eksikler (uyarı)</h3>
                <ul class="lines">
                    @for (item of warnings(); track item.text) {
                        <li>
                            <span><i class="pi pi-exclamation-triangle" aria-hidden="true"></i>{{ item.text }}</span>
                            <button type="button" class="wbtn ghost small" (click)="store.step.set(item.step)">Düzelt</button>
                        </li>
                    }
                </ul>
            }
            <h3 class="group-title">SEO</h3>
            <ul class="lines">
                @for (check of seo(); track check.label) {
                    <li [class.good]="check.ok">
                        <span><i class="pi" [class.pi-check]="check.ok" [class.pi-exclamation-triangle]="!check.ok" aria-hidden="true"></i>{{ check.label }}: {{ check.detail }}</span>
                    </li>
                }
            </ul>
        </section>

        <section class="group">
            <h3 class="group-title">İçerik uyarıları</h3>
            @if (defaultCopy().length) {
                <p class="warn"><i class="pi pi-info-circle" aria-hidden="true"></i><span>Şu metinleri yazmadınız, hazır genel cümleler kullanılıyor: {{ defaultCopy().join(', ') }}. Kendi metninizi yazmanızı öneririz.</span></p>
            }
            @for (claim of claims(); track claim.where + claim.term) {
                <p class="warn claim">
                    <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
                    <span><strong>{{ claim.where }}</strong>: "{{ claim.term }}". {{ claim.why }}</span>
                    <button type="button" class="wbtn ghost small" (click)="store.step.set(claim.step)">Düzelt</button>
                </p>
            }
            <p class="hint">Bu site veteriner hekimlik mevzuatındaki reklam sınırlarına uymak sizin sorumluluğunuzdadır; Vetinity hukuki görüş vermez. Fiyat, kampanya, müşteri yorumu ve önce/sonra görseli sunmayın. Bu uyarılar hukukçu görüşüne kadar taslaktır.</p>
        </section>

        <section class="group">
            <h3 class="group-title">Yayınlama</h3>
            @if (store.hasUnpublishedChanges() || !store.isPublished()) {
                <p class="hint">
                    @if (store.isPublished()) {
                        Taslakta yayınlanmamış değişiklik var.
                    } @else {
                        Site henüz yayınlanmadı.
                    }
                </p>
            } @else {
                <p class="ok"><i class="pi pi-check" aria-hidden="true"></i>Taslak, yayındaki sürümle aynı.</p>
            }
            @if (store.actionError(); as message) {
                <p class="bad-note" role="alert"><i class="pi pi-times-circle" aria-hidden="true"></i><span>{{ message }}</span></p>
            }
            @if (confirming()) {
                <div class="dialog" role="group" aria-label="Yayınlama onayı">
                    <p>Taslak <strong>vetinity.com/k/{{ store.slug() }}</strong> adresinde herkese açılır. Eski sürümler saklanır, istediğinizde taslağa alabilirsiniz.</p>
                    <div class="row">
                        <button type="button" class="wbtn main" [disabled]="store.actionBusy() || !store.canWrite()" (click)="publish()">
                            @if (store.actionBusy()) {
                                <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                            }
                            Yayınla
                        </button>
                        <button type="button" class="wbtn ghost" (click)="confirming.set(false)">Vazgeç</button>
                    </div>
                </div>
            } @else {
                <div class="row">
                    <button type="button" class="wbtn main pub" [disabled]="!store.canWrite() || !ready()" (click)="confirming.set(true)"><i class="pi pi-send" aria-hidden="true"></i>Yayınla</button>
                    @if (store.isPublished()) {
                        <a class="wbtn" [href]="publicUrl()" target="_blank" rel="noopener">Siteyi aç<i class="pi pi-external-link" aria-hidden="true"></i></a>
                    }
                </div>
            }
        </section>

        @if (store.isPublished()) {
            <section class="group">
                <h3 class="group-title">Geçici kapatma</h3>
                @if (store.isClosedBySubscription()) {
                    <p class="warn"><i class="pi pi-lock" aria-hidden="true"></i><span>Site abonelik nedeniyle kapalı. Ödeme yapılınca son yayınlanan sürüm kendiliğinden döner.</span></p>
                } @else if (store.site()?.isTemporarilyClosed) {
                    <p class="warn"><i class="pi pi-eye-slash" aria-hidden="true"></i><span>Site kapalı; ziyaretçi açıklayıcı bir sayfa görür. Verileriniz duruyor.</span></p>
                    <button type="button" class="wbtn pub" [disabled]="store.actionBusy() || !store.canWrite()" (click)="store.reopen()">Siteyi aç</button>
                } @else if (closing()) {
                    <div class="dialog" role="group" aria-label="Kapatma onayı">
                        <p>Ziyaretçi sitenin yayında olmadığını görür; adres ve içerik silinmez. İstediğinizde yeniden açarsınız.</p>
                        <div class="row">
                            <button type="button" class="wbtn main" [disabled]="store.actionBusy()" (click)="close()">Geçici kapat</button>
                            <button type="button" class="wbtn ghost" (click)="closing.set(false)">Vazgeç</button>
                        </div>
                    </div>
                } @else {
                    <p class="hint">Tatil ya da taşınma gibi durumlarda siteyi kapatıp açabilirsiniz.</p>
                    <button type="button" class="wbtn pub" [disabled]="!store.canWrite()" (click)="closing.set(true)">Geçici kapat</button>
                }
            </section>
        }

        <section class="group">
            <h3 class="group-title">Sürüm geçmişi</h3>
            <ol class="versions">
                @for (version of store.versions(); track version.versionNumber) {
                    <li>
                        <div class="v-top">
                            <strong>Sürüm {{ version.versionNumber }}</strong>
                            @if (version.isPublished) {
                                <span class="live">Yayında</span>
                            }
                        </div>
                        <p class="hint">{{ when(version.publishedAtUtc) }}@if (version.publishedByName) { · {{ version.publishedByName }}}</p>
                        @if (restoring() === version.versionNumber) {
                            <div class="row">
                                <button type="button" class="wbtn main small" [disabled]="store.actionBusy()" (click)="restore(version.versionNumber)">Taslağa al</button>
                                <button type="button" class="wbtn ghost small" (click)="restoring.set(null)">Vazgeç</button>
                            </div>
                            <p class="hint">Taslağınız bu sürümle değişir, yayın değişmez; üstteki Geri Al ile dönebilirsiniz.</p>
                        } @else {
                            <button type="button" class="wbtn small" [disabled]="!store.canWrite()" (click)="restoring.set(version.versionNumber)">Bu sürüme dön</button>
                        }
                    </li>
                } @empty {
                    <li class="hint">Henüz sürüm yok. İlk "Yayınla" ile burada görünür.</li>
                }
            </ol>
        </section>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .address {
                display: grid;
                gap: 4px;
                justify-items: start;
            }

            .url {
                font-size: 15px;
                font-weight: 600;
                overflow-wrap: anywhere;
            }

            .devices {
                display: grid;
                grid-template-columns: 5fr 3fr 2fr;
                align-items: start;
                gap: 8px;
            }

            .device {
                display: grid;
                gap: 6px;
                padding: 6px;
                border: 1px solid var(--w-line);
                border-radius: 10px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
            }

            .device[aria-pressed='true'] {
                border-color: var(--w-ink);
                box-shadow: inset 0 0 0 1px var(--w-ink);
            }

            .lines {
                display: grid;
                gap: 4px;
                font-size: 13px;
                line-height: 1.4;
            }

            .lines li {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                min-height: 36px;
            }

            .lines .pi {
                margin-right: 8px;
                color: var(--w-warn-ink);
                font-size: 12px;
            }

            .lines .good .pi {
                color: var(--w-ok-ink);
            }

            .lines .must {
                color: var(--w-bad);
                font-weight: 600;
            }

            .lines .must .pi {
                color: var(--w-bad);
            }
        `,
        `
            .claim {
                align-items: center;
            }

            .claim span {
                flex: 1;
            }

            .dialog {
                display: grid;
                gap: 12px;
                padding: 14px;
                border: 1px solid var(--w-ink);
                border-radius: 12px;
                font-size: 14px;
                line-height: 1.45;
            }

            .row {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .pub {
                justify-self: start;
            }

            .versions {
                display: grid;
                gap: 10px;
            }

            .versions li {
                display: grid;
                gap: 6px;
                justify-items: start;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--w-line);
            }

            .v-top {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }

            .live {
                padding: 2px 8px;
                border-radius: 999px;
                background: var(--w-ok-bg);
                color: var(--w-ok-ink);
                font-size: 12px;
                font-weight: 600;
            }
        `
    ]
})
export class PublishStepComponent {
    protected readonly store = inject(SiteBuilderStore);
    protected readonly devices = DEVICES;
    protected readonly missingLabels = CLINIC_SITE_MISSING_LABELS;

    protected readonly siteName = computed(() => this.store.stored().publish.siteName);
    protected readonly warnings = computed(() => publishWarnings(this.store.config()));
    protected readonly seo = computed(() => seoChecks(this.store.config()));
    protected readonly claims = computed(() => draftClaims(this.store.stored()));
    protected readonly defaultCopy = computed(() => defaultCopyLabels(this.store.stored()));
    protected readonly ready = computed(() => !this.store.missingForPublish().length && !this.store.missingImageIds().length);
    protected readonly publicUrl = computed(() => siteRootUrl(environment.siteBaseUrl, this.store.slug()));

    protected readonly confirming = signal(false);
    protected readonly closing = signal(false);
    protected readonly restoring = signal<number | null>(null);

    constructor() {
        this.store.refreshStatus();
        this.store.loadVersions();
    }

    protected when(iso: string): string {
        return formatUtcToLocalDateTime(iso);
    }

    protected setSiteName(value: string): void {
        this.store.patch((config: StoredSiteConfig) => ({ ...config, publish: { ...config.publish, siteName: value } }), 'publish.siteName');
    }

    protected async publish(): Promise<void> {
        if (await this.store.publish()) this.confirming.set(false);
    }

    protected async close(): Promise<void> {
        if (await this.store.close()) this.closing.set(false);
    }

    protected async restore(versionNumber: number): Promise<void> {
        if (await this.store.restoreVersion(versionNumber)) this.restoring.set(null);
    }
}
