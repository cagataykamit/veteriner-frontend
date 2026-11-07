import { ChangeDetectionStrategy, Component, computed, DOCUMENT, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGE_DEFS } from '@site-engine';
import { SETTINGS_ROUTE, SUBSCRIPTION_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { type DeviceKey, SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { SITE_BUILDER_BAR_STYLES, SITE_BUILDER_CANVAS_STYLES, SITE_BUILDER_LAYOUT_STYLES, SITE_BUILDER_NOTICE_STYLES, SITE_BUILDER_WIDE_STYLES } from '@/app/features/clinic-site/builder/site-builder-page.styles';
import { SitePreviewComponent } from '@/app/features/clinic-site/builder/site-preview.component';
import { BrandStepComponent } from '@/app/features/clinic-site/builder/steps/brand-step.component';
import { ClinicStepComponent } from '@/app/features/clinic-site/builder/steps/clinic-step.component';
import { ContentStepComponent } from '@/app/features/clinic-site/builder/steps/content-step.component';
import { DesignStepComponent } from '@/app/features/clinic-site/builder/steps/design-step.component';
import { PagesStepComponent } from '@/app/features/clinic-site/builder/steps/pages-step.component';
import { PublishStepComponent } from '@/app/features/clinic-site/builder/steps/publish-step.component';
import { SeoStepComponent } from '@/app/features/clinic-site/builder/steps/seo-step.component';
import { WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';

const STEPS: readonly { readonly short: string; readonly title: string; readonly text: string }[] = [
    { short: 'Klinik', title: 'Klinik bilgileri', text: 'Sitede görünecek temel bilgiler. Yazdıkça sağda güncellenir.' },
    { short: 'Marka', title: 'Marka kimliği', text: 'Renk, yazı ve biçim. İsterseniz kliniğinize uygun bir öneri alın.' },
    { short: 'Tasarım', title: 'Tasarım seçimi', text: 'Bir konseptle başlayın, bölümleri tek tek değiştirin.' },
    { short: 'Sayfalar', title: 'Sayfalar', text: 'Hangi sayfalar olsun, ana sayfada neler görünsün.' },
    { short: 'İçerik', title: 'İçerik', text: 'Metinler, fotoğraflar, hekimler, hizmetler. Boş bıraktığınız metinde konseptin genel cümlesi görünür.' },
    { short: 'SEO', title: 'SEO ve teknik', text: 'Adres, Google ve paylaşımlarda nasıl görüneceği, teknik kontroller.' },
    { short: 'Yayın', title: 'Son kontrol ve yayınlama', text: 'Eksikleri görün, yayınlayın, önceki sürüme dönün.' }
];

const DEVICES: readonly { readonly key: DeviceKey; readonly label: string; readonly icon: string }[] = [
    { key: 'masaustu', label: 'Masaüstü', icon: 'pi pi-desktop' },
    { key: 'tablet', label: 'Tablet', icon: 'pi pi-tablet' },
    { key: 'mobil', label: 'Mobil', icon: 'pi pi-mobile' }
];

const FONTS_LINK_ID = 'site-fonts-css';

/**
 * Web sayfam (ADR-045): solda sihirbaz, sağda kliniğin gerçek sitesi. Panel iskeletinin dışında tam ekrandır, panele dönüş bağlantısı
 * üst çubuktadır. Küçük ekranda düzenleme ile önizleme arasında geçilir. Yazma `Clinics.Update` ve abonelik durumuna bağlıdır.
 */
@Component({
    selector: 'app-site-builder-page',
    standalone: true,
    imports: [RouterLink, SitePreviewComponent, ClinicStepComponent, BrandStepComponent, DesignStepComponent, PagesStepComponent, ContentStepComponent, SeoStepComponent, PublishStepComponent],
    providers: [SiteBuilderStore],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="builder" [class.show-preview]="view() === 'onizleme'">
            <header class="top">
                <div class="brand">
                    <a class="back" [routerLink]="settingsRoute" title="Panele dön"><i class="pi pi-arrow-left" aria-hidden="true"></i><span>Panele dön</span></a>
                    <strong>Web sayfam</strong>
                    <span class="draft" [class.is-live]="statusLabel() === 'Yayında'">{{ statusLabel() }}</span>
                    @if (store.clinicOptions().length > 1) {
                        <label class="clinic">
                            <span class="sr">Klinik</span>
                            <select [value]="store.clinicId()" (change)="pickClinic($any($event.target).value)">
                                @for (option of store.clinicOptions(); track option.value) {
                                    <option [value]="option.value" [selected]="option.value === store.clinicId()">{{ option.label }}</option>
                                }
                            </select>
                        </label>
                    }
                </div>
                <ol class="stepper" aria-label="Adımlar">
                    @for (item of steps; track item.short; let i = $index) {
                        <li>
                            <button type="button" [class.is-on]="i === step()" [class.is-done]="i < step()" [attr.aria-current]="i === step() ? 'step' : null" (click)="go(i)">
                                <span class="n">{{ i + 1 }}</span>{{ item.short }}
                            </button>
                        </li>
                    }
                </ol>
                <div class="tools">
                    <span class="save" role="status" [class.is-bad]="store.saveState() === 'failed'">{{ saveLabel() }}</span>
                    <button type="button" class="icon" [disabled]="!store.canUndo() || !store.canWrite()" aria-label="Geri al" title="Geri al (Ctrl+Z)" (click)="store.undo()"><i class="pi pi-undo" aria-hidden="true"></i></button>
                    <button type="button" class="icon" [disabled]="!store.canRedo() || !store.canWrite()" aria-label="Yinele" title="Yinele (Ctrl+Y)" (click)="store.redo()"><i class="pi pi-refresh" aria-hidden="true"></i></button>
                </div>
                <div class="progress" role="progressbar" aria-label="İlerleme" [attr.aria-valuenow]="step() + 1" aria-valuemin="1" aria-valuemax="7"><span [style.width.%]="((step() + 1) / steps.length) * 100"></span></div>
            </header>

            @if (store.loadState() === 'ready') {
                <div class="notices">
                    @if (store.saveState() === 'conflict') {
                        <p class="notice bad" role="alert">
                            <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
                            <span>{{ store.saveError() }} Otomatik kayıt durdu; hangisinin kalacağını seçin.</span>
                            <button type="button" class="wbtn small" (click)="store.takeServerDraft()">Güncel taslağı yükle</button>
                            <button type="button" class="wbtn small" (click)="store.overwriteServerDraft()">Benimkini kaydet</button>
                        </p>
                    } @else if (store.saveState() === 'failed') {
                        <p class="notice bad" role="alert">
                            <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
                            <span>{{ store.saveError() }}</span>
                            <button type="button" class="wbtn small" (click)="store.flush()">Yeniden dene</button>
                        </p>
                    }
                    @if (store.isClosedBySubscription() || store.subscriptionBlocked()) {
                        <p class="notice warn" role="status">
                            <i class="pi pi-lock" aria-hidden="true"></i>
                            <span>Abonelik salt okunur: düzenleme kapalı{{ store.isClosedBySubscription() ? ', site ziyaretçilere kapalı' : '' }}. Ödeme yapılınca son yayınlanan sürüm kendiliğinden döner.</span>
                            <a class="wbtn small" [routerLink]="subscriptionRoute">Abonelik</a>
                        </p>
                    } @else if (!store.canManage) {
                        <p class="notice info" role="status"><i class="pi pi-info-circle" aria-hidden="true"></i><span>Yalnız görüntüleme: siteyi klinik yönetim yetkisi olan kullanıcı değiştirir.</span></p>
                    }
                    @if (store.site()?.isTemporarilyClosed && !store.isClosedBySubscription()) {
                        <p class="notice warn" role="status">
                            <i class="pi pi-eye-slash" aria-hidden="true"></i>
                            <span>Site geçici olarak kapalı; ziyaretçi açıklayıcı bir sayfa görür.</span>
                            <button type="button" class="wbtn small" [disabled]="store.actionBusy() || !store.canWrite()" (click)="store.reopen()">Siteyi aç</button>
                        </p>
                    }
                    @if (store.hasUnpublishedChanges()) {
                        <p class="notice info" role="status">
                            <i class="pi pi-pencil" aria-hidden="true"></i>
                            <span>Değişiklik var, yayında değil.</span>
                            <button type="button" class="wbtn small" (click)="go(steps.length - 1)">Yayın adımına git</button>
                        </p>
                    }
                </div>
            }

            <div class="split">
                <section class="panel" aria-label="Sihirbaz">
                    <div class="panel-scroll">
                        <header class="head">
                            <p class="count">Adım {{ step() + 1 }} / {{ steps.length }}</p>
                            <h1>{{ current().title }}</h1>
                            <p class="text">{{ current().text }}</p>
                        </header>
                        @switch (store.loadState()) {
                            @case ('loading') {
                                <p class="state" role="status"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Yükleniyor</p>
                            }
                            @case ('error') {
                                <div class="state" role="alert">
                                    <p>{{ store.loadError() }}</p>
                                    <button type="button" class="wbtn" (click)="store.reload()">Yeniden dene</button>
                                </div>
                            }
                            @default {
                                @if (step() === 6) {
                                    <app-publish-step />
                                } @else {
                                    <!-- Yetkisi olmayan adımları görür, alanları yazamaz: tek yerde kapatılır. -->
                                    <fieldset class="steps" [disabled]="!store.canWrite()">
                                        <legend class="sr">{{ current().title }}</legend>
                                        @switch (step()) {
                                            @case (0) {
                                                <app-clinic-step />
                                            }
                                            @case (1) {
                                                <app-brand-step />
                                            }
                                            @case (2) {
                                                <app-design-step />
                                            }
                                            @case (3) {
                                                <app-pages-step />
                                            }
                                            @case (4) {
                                                <app-content-step />
                                            }
                                            @case (5) {
                                                <app-seo-step />
                                            }
                                        }
                                    </fieldset>
                                }
                            }
                        }
                    </div>
                    <footer class="nav">
                        <button type="button" class="wbtn ghost" [disabled]="step() === 0" (click)="go(step() - 1)">Geri</button>
                        <button type="button" class="wbtn next main" [disabled]="step() === steps.length - 1" (click)="go(step() + 1)">Devam Et<i class="pi pi-arrow-right" aria-hidden="true"></i></button>
                    </footer>
                </section>

                <section class="canvas" aria-label="Canlı önizleme">
                    <div class="canvas-bar">
                        <div class="seg devices" role="group" aria-label="Cihaz">
                            @for (device of devices; track device.key) {
                                <button type="button" [attr.aria-pressed]="store.device() === device.key" [attr.aria-label]="device.label" [title]="device.label" (click)="store.device.set(device.key)"><i [class]="device.icon" aria-hidden="true"></i></button>
                            }
                        </div>
                        <label class="page-pick">
                            <span>Sayfa</span>
                            <select (change)="store.previewPath.set($any($event.target).value)">
                                @for (page of pages(); track page.path) {
                                    <option [value]="page.path" [selected]="page.path === store.previewPath()">{{ page.label }}</option>
                                }
                            </select>
                        </label>
                    </div>
                    <div class="stage">
                        @if (store.loadState() === 'ready') {
                            <app-site-preview [config]="store.renderConfig()" [device]="store.device()" [path]="store.previewPath()" [focus]="store.focusSection()" (pathChange)="store.previewPath.set($event)" (rootReady)="store.previewRoot.set($event)" />
                        }
                    </div>
                </section>
            </div>

            <div class="switch seg" role="group" aria-label="Görünüm">
                <button type="button" [attr.aria-pressed]="view() === 'duzenle'" (click)="view.set('duzenle')">Düzenle</button>
                <button type="button" [attr.aria-pressed]="view() === 'onizleme'" (click)="view.set('onizleme')">Önizle</button>
            </div>
        </div>
    `,
    styles: [...WIZARD_STYLES, SITE_BUILDER_LAYOUT_STYLES, SITE_BUILDER_BAR_STYLES, SITE_BUILDER_NOTICE_STYLES, SITE_BUILDER_CANVAS_STYLES, SITE_BUILDER_WIDE_STYLES]
})
export class SiteBuilderPageComponent implements OnInit {
    protected readonly store = inject(SiteBuilderStore);
    private readonly readOnly = inject(TenantReadOnlyContextService);
    private readonly document = inject(DOCUMENT);

    protected readonly settingsRoute = SETTINGS_ROUTE;
    protected readonly subscriptionRoute = SUBSCRIPTION_ROUTE;
    protected readonly steps = STEPS;
    protected readonly devices = DEVICES;
    protected readonly step = this.store.step;
    protected readonly current = computed(() => STEPS[this.step()]);
    protected readonly view = signal<'duzenle' | 'onizleme'>('duzenle');

    protected readonly pages = computed(() => {
        const { pages } = this.store.stored().structure;

        return [{ label: 'Ana Sayfa', path: '/' }, ...PAGE_DEFS.filter((page) => page.path && pages[page.key]).map((page) => ({ label: page.label, path: page.path! }))];
    });

    protected readonly statusLabel = computed(() => {
        const site = this.store.site();

        if (this.store.isClosedBySubscription() || site?.isTemporarilyClosed) return 'Kapalı';

        return site?.publishedVersionNumber ? 'Yayında' : 'Taslak';
    });

    protected readonly saveLabel = computed(() => {
        switch (this.store.saveState()) {
            case 'pending':
                return 'Kaydedilecek';
            case 'saving':
                return 'Kaydediliyor';
            case 'failed':
                return 'Kaydedilemedi';
            case 'conflict':
                return 'Kayıt durdu';
            case 'saved':
                return `Kaydedildi ${this.store.savedAt()?.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) ?? ''}`;
            default:
                return this.store.site() ? 'Taslak kayıtlı' : '';
        }
    });

    ngOnInit(): void {
        this.readOnly.ensurePanelTenantAccess().subscribe();
        this.loadFonts();
        this.store.start();

        if (window.innerWidth < 720) this.store.device.set('mobil');
    }

    protected pickClinic(clinicId: string): void {
        void this.store.selectClinic(clinicId);
    }

    protected go(index: number): void {
        const next = Math.max(0, Math.min(STEPS.length - 1, index));

        // K8: klinik kaydı açık bir eylemle yazılır; sonraki adıma geçmek de o eylemdir. Hata adımda değil üstte görünür: klinik adımına dönülür.
        if (this.step() === 0 && next !== 0 && this.store.recordDirty()) {
            void this.store.saveRecord().then((saved) => {
                if (!saved) this.step.set(0);
            });
        }

        this.step.set(next);
    }

    /** Sitenin yazı tipleri panel paketine girmez: yalnız bu sayfada, ayrı stil dosyasından yüklenir. */
    private loadFonts(): void {
        if (this.document.getElementById(FONTS_LINK_ID)) return;

        const link = this.document.createElement('link');

        link.id = FONTS_LINK_ID;
        link.rel = 'stylesheet';
        link.href = 'site-fonts.css';
        this.document.head.appendChild(link);
    }

    /** Yazı alanında tarayıcının kendi geri alması çalışsın. */
    @HostListener('document:keydown', ['$event'])
    protected onKey(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;

        if (!(event.ctrlKey || event.metaKey) || target.closest('input, textarea, select')) return;

        const key = event.key.toLowerCase();

        if (key === 'z' && !event.shiftKey) {
            event.preventDefault();
            this.store.undo();
        } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
            event.preventDefault();
            this.store.redo();
        }
    }

    /** Yazılmamış değişiklik varken sekme kapanırsa tarayıcı sorar; taslak yine de gönderilmeye çalışılır. */
    @HostListener('window:beforeunload', ['$event'])
    protected onLeave(event: BeforeUnloadEvent): void {
        if (this.store.isDraftDirty() || this.store.recordDirty()) {
            void this.store.flush();
            event.preventDefault();
        }
    }
}
