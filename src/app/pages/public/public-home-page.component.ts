import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PUBLIC_HOME_FAQS } from '@/app/features/public/utils/public-faq-content.utils';
import {
    PUBLIC_HOME_AUDIENCE,
    PUBLIC_HOME_DAY_FLOW,
    PUBLIC_HOME_TRIAL_LINE
} from '@/app/features/public/utils/public-home-content.utils';
import {
    PUBLIC_MIGRATION_EXCLUDED,
    PUBLIC_MIGRATION_HOME_STEPS,
    PUBLIC_MIGRATION_INCLUDED
} from '@/app/features/public/utils/public-migration-content.utils';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import {
    PUBLIC_KVKK_NOTE,
    PUBLIC_KVKK_STEPS,
    PUBLIC_RECORD_SAFETY_ITEMS,
    PUBLIC_REGISTERS
} from '@/app/features/public/utils/public-registers-content.utils';
import { PUBLIC_HOME_PAGE_META, publicFaqPageJsonLd, publicOrganizationJsonLd, removePublicJsonLd, setPublicJsonLd, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { pricingTermsText } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicPlanCardsComponent } from './components/public-plan-cards.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicScreenshotComponent } from './components/public-screenshot.component';

const HOME_FAQ_JSON_LD_ID = 'home-faq';
const HOME_ORGANIZATION_JSON_LD_ID = 'home-organization';

/** Ana sayfa omurgası (tasarım belgesi 5.1, ADR-035): kahraman, kime göre, bir günün akışı, Türkiye'ye özgü, kayıt güvenliği, geçiş, paketler, SSS, çağrı. */
@Component({
    selector: 'app-public-home-page',
    standalone: true,
    imports: [RouterLink, PublicScreenshotComponent, PublicPlanCardsComponent, PublicFaqListComponent, PublicCtaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- 1 Kahraman: gradient kenardan kenara, sol metin, sağ ekran -->
        <section class="public-hero-gradient" aria-labelledby="public-home-hero-title">
            <div class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-12 pt-12 md:px-6 md:pt-16 lg:grid-cols-[45fr_55fr] lg:gap-14 lg:pb-16">
                <div>
                    <p class="public-eyebrow m-0 mb-4 !text-[var(--vetinity-soft-teal)]">Veteriner klinikleri için</p>
                    <h1 id="public-home-hero-title" class="public-h1 public-on-brand-text m-0">Veteriner kliniğinizin günü tek ekranda</h1>
                    <p class="m-0 mt-5 max-w-xl text-base leading-relaxed public-on-brand-muted md:text-lg">
                        Geliş, bekleme, muayene, tahsilat ve kayıt defterleri aynı yerde. Kâğıt, Excel ya da eski programdan yarım günde geçin.
                    </p>
                    <div class="mt-7 flex flex-col gap-3 sm:flex-row">
                        <a routerLink="/auth/signup" class="public-btn public-btn-on-dark w-full sm:w-auto">Ücretsiz dene</a>
                        <a [routerLink]="paths.contact" class="public-btn public-btn-outline-on-dark w-full sm:w-auto">Demo iste</a>
                    </div>
                    <p class="m-0 mt-4 text-sm public-on-brand-subtle">{{ trialLine }}</p>
                </div>
                <div class="lg:translate-y-12">
                    <app-public-screenshot shot="bugun" [eager]="true" />
                </div>
            </div>
        </section>

        <!-- 2 Kime göre -->
        <section class="mx-auto max-w-6xl px-4 pt-16 md:px-6 lg:pt-28" aria-labelledby="public-home-audience-title">
            <h2 id="public-home-audience-title" class="public-h2 m-0 text-center">Kime göre?</h2>
            <p class="public-lead m-0 mx-auto mt-3 max-w-2xl text-center">Türkiye'deki küçük klinik için; büyüyünce şube eklersiniz.</p>
            <div class="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                @for (item of audience; track item.title) {
                    <article class="public-card p-6">
                        <span class="public-step-badge" aria-hidden="true"><i [class]="item.icon"></i></span>
                        <h3 class="m-0 mt-4 text-lg font-semibold text-surface-900 dark:text-surface-0">{{ item.title }}</h3>
                        <p class="m-0 mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">{{ item.description }}</p>
                    </article>
                }
            </div>
        </section>

        <!-- 3 Bir günün akışı: 4 sekme, seçili adımın ekranı altta -->
        <section class="mx-auto max-w-6xl px-4 pt-20 md:px-6 lg:pt-28" aria-labelledby="public-home-flow-title">
            <h2 id="public-home-flow-title" class="public-h2 m-0 text-center">Bir günün akışı</h2>
            <p class="public-lead m-0 mx-auto mt-3 max-w-2xl text-center">Gelişten gün sonuna dört adım; her adımda tek ekran.</p>
            <div class="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4" role="tablist" aria-label="Günün adımları">
                @for (step of dayFlow; track step.id; let i = $index) {
                    <button
                        type="button"
                        role="tab"
                        [id]="'flow-tab-' + step.id"
                        [attr.aria-selected]="activeFlowId() === step.id"
                        [attr.aria-controls]="'flow-panel-' + step.id"
                        class="public-flow-tab"
                        [class.public-flow-tab--active]="activeFlowId() === step.id"
                        (click)="activeFlowId.set(step.id)"
                    >
                        <span class="text-xs font-semibold text-muted-color">{{ i + 1 }}</span>
                        <span class="text-base font-semibold">{{ step.title }}</span>
                        <span class="hidden text-sm text-surface-600 dark:text-surface-300 md:block">{{ step.description }}</span>
                    </button>
                }
            </div>
            <div role="tabpanel" [id]="'flow-panel-' + activeFlow().id" [attr.aria-labelledby]="'flow-tab-' + activeFlow().id" class="mt-6">
                <p class="m-0 mb-4 text-center text-sm text-surface-600 dark:text-surface-300 md:hidden">{{ activeFlow().description }}</p>
                <app-public-screenshot [shot]="activeFlow().screenshot" />
            </div>
            <p class="m-0 mt-6 text-center">
                <a [routerLink]="paths.features" class="public-brand-link inline-flex min-h-[44px] items-center">Tüm akışı görün</a>
            </p>
        </section>

        <!-- 4 Türkiye'ye özgü: açık teal yüzey, iki sütun -->
        <section class="public-soft-surface mt-20 lg:mt-28" aria-labelledby="public-home-tr-title">
            <div class="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-24">
                <h2 id="public-home-tr-title" class="public-h2 m-0">Türkiye'ye özgü</h2>
                <p class="public-lead m-0 mt-3 max-w-2xl">Kayıt defterleri her kayıtla kendiliğinden dolar; KVKK evrakı hazır.</p>
                <div class="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
                    <div>
                        <h3 class="m-0 text-xl font-semibold text-surface-900 dark:text-surface-0">Kayıt defterleri</h3>
                        <ul class="m-0 mt-4 list-none space-y-2 p-0">
                            @for (register of registers; track register.name) {
                                <li class="flex items-center gap-2.5 text-base text-surface-700 dark:text-surface-200">
                                    <i class="pi pi-book text-[var(--public-accent)]" aria-hidden="true"></i>{{ register.name }}
                                </li>
                            }
                        </ul>
                        <p class="m-0 mt-3 text-sm text-surface-600 dark:text-surface-300">Yazdırın, Excel'e alın.</p>
                        <div class="mt-5">
                            <app-public-screenshot shot="asiDefteri" />
                        </div>
                    </div>
                    <div>
                        <h3 class="m-0 text-xl font-semibold text-surface-900 dark:text-surface-0">KVKK evrakı</h3>
                        <ul class="m-0 mt-4 list-none space-y-2 p-0">
                            @for (step of kvkkSteps; track step.title) {
                                <li class="flex items-center gap-2.5 text-base text-surface-700 dark:text-surface-200">
                                    <i [class]="step.icon + ' text-[var(--public-accent)]'" aria-hidden="true"></i>{{ step.title }}
                                </li>
                            }
                        </ul>
                        <p class="m-0 mt-3 text-sm text-surface-600 dark:text-surface-300">Rıza kaydı ve metin sürümü müşteri kartında.</p>
                        <div class="mt-5">
                            <app-public-screenshot shot="kvkkFormu" />
                        </div>
                    </div>
                </div>
                <p class="public-note m-0 mt-8">{{ kvkkNote }}</p>
                <p class="m-0 mt-3">
                    <a [routerLink]="paths.registersAndKvkk" class="public-brand-link inline-flex min-h-[44px] items-center">Defterler ve KVKK sayfası</a>
                </p>
            </div>
        </section>

        <!-- 5 Kayıt güvenliği: sol ekran, sağ 4 madde -->
        <section class="mx-auto max-w-6xl px-4 pt-20 md:px-6 lg:pt-28" aria-labelledby="public-home-safety-title">
            <div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <app-public-screenshot shot="kesinlestirme" />
                <div>
                    <h2 id="public-home-safety-title" class="public-h2 m-0">Kayıtlarınız güvende ve dürüst</h2>
                    <ul class="m-0 mt-6 list-none space-y-4 p-0">
                        @for (item of safetyItems; track item.title) {
                            <li class="flex items-start gap-3">
                                <i class="pi pi-check-circle mt-1 shrink-0 text-[var(--public-accent)]" aria-hidden="true"></i>
                                <div>
                                    <p class="m-0 text-base font-semibold text-surface-900 dark:text-surface-0">{{ item.title }}</p>
                                    <p class="m-0 mt-0.5 text-sm text-surface-600 dark:text-surface-300">{{ item.description }}</p>
                                </div>
                            </li>
                        }
                    </ul>
                </div>
            </div>
        </section>

        <!-- 6 Geçiş: 3 adım + aktarılır/aktarılmaz -->
        <section class="mx-auto max-w-6xl px-4 pt-20 md:px-6 lg:pt-28" aria-labelledby="public-home-migration-title">
            <h2 id="public-home-migration-title" class="public-h2 m-0">Eski programdan geçiş yarım gün</h2>
            <ol class="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
                @for (step of migrationSteps; track step.title; let i = $index) {
                    <li class="public-card p-5">
                        <span class="public-timeline-marker" aria-hidden="true">{{ i + 1 }}</span>
                        <h3 class="m-0 mt-3 text-base font-semibold text-surface-900 dark:text-surface-0">{{ step.title }}</h3>
                        <p class="m-0 mt-1.5 text-sm text-surface-600 dark:text-surface-300">{{ step.description }}</p>
                    </li>
                }
            </ol>
            <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="public-card p-5">
                    <h3 class="m-0 text-sm font-semibold uppercase tracking-wide text-muted-color">Aktarılır</h3>
                    <ul class="m-0 mt-2 list-none space-y-1.5 p-0 text-sm text-surface-700 dark:text-surface-200">
                        @for (item of migrationIncluded; track item) {
                            <li class="flex items-center gap-2"><i class="pi pi-check text-[var(--public-accent)]" aria-hidden="true"></i>{{ item }}</li>
                        }
                    </ul>
                </div>
                <div class="public-card p-5">
                    <h3 class="m-0 text-sm font-semibold uppercase tracking-wide text-muted-color">Şimdilik aktarılmaz</h3>
                    <ul class="m-0 mt-2 list-none space-y-1.5 p-0 text-sm text-surface-700 dark:text-surface-200">
                        @for (item of migrationExcluded; track item) {
                            <li class="flex items-center gap-2"><i class="pi pi-minus text-surface-400" aria-hidden="true"></i>{{ item }}</li>
                        }
                    </ul>
                </div>
            </div>
            <p class="m-0 mt-4">
                <a [routerLink]="paths.migration" class="public-brand-link inline-flex min-h-[44px] items-center">Geçiş adımlarının tamamı</a>
            </p>
        </section>

        <!-- 7 Paketler: kartlar paket verisinden (ADR-035) -->
        <section class="public-soft-surface mt-20 lg:mt-28" aria-labelledby="public-home-packages-title">
            <div class="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-20">
                <h2 id="public-home-packages-title" class="public-h2 m-0 text-center">Paketler</h2>
                <p class="public-lead m-0 mx-auto mt-3 max-w-2xl text-center">
                    Kayıt defterleri ve KVKK araçları her pakette. {{ pricingTerms }}.
                </p>
                <div class="mt-10">
                    <app-public-plan-cards />
                </div>
                <p class="m-0 mt-6 text-center">
                    <a [routerLink]="paths.packages" class="public-brand-link inline-flex min-h-[44px] items-center">Paketleri karşılaştırın</a>
                </p>
            </div>
        </section>

        <!-- 8 SSS -->
        <section class="mx-auto max-w-[720px] px-4 pt-20 md:px-6 lg:pt-28" aria-labelledby="public-home-faq-title">
            <h2 id="public-home-faq-title" class="public-h2 m-0 text-center">Sık sorulan sorular</h2>
            <div class="mt-8">
                <app-public-faq-list [items]="faqs" idPrefix="home-faq" />
            </div>
            <p class="m-0 mt-6 text-center">
                <a [routerLink]="paths.faq" class="public-brand-link inline-flex min-h-[44px] items-center">Tüm sorular</a>
            </p>
        </section>

        <!-- 9 Çağrı -->
        <div class="pt-20 lg:pt-28">
            <app-public-cta />
        </div>
    `
})
export class PublicHomePageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);

    readonly paths = PUBLIC_PATHS;
    readonly trialLine = PUBLIC_HOME_TRIAL_LINE;
    readonly audience = PUBLIC_HOME_AUDIENCE;
    readonly dayFlow = PUBLIC_HOME_DAY_FLOW;
    readonly registers = PUBLIC_REGISTERS;
    readonly kvkkSteps = PUBLIC_KVKK_STEPS;
    readonly kvkkNote = PUBLIC_KVKK_NOTE;
    readonly safetyItems = PUBLIC_RECORD_SAFETY_ITEMS;
    readonly migrationSteps = PUBLIC_MIGRATION_HOME_STEPS;
    readonly migrationIncluded = PUBLIC_MIGRATION_INCLUDED;
    readonly migrationExcluded = PUBLIC_MIGRATION_EXCLUDED;
    readonly pricingTerms = pricingTermsText();
    readonly faqs = PUBLIC_HOME_FAQS;

    readonly activeFlowId = signal(PUBLIC_HOME_DAY_FLOW[0].id);
    readonly activeFlow = computed(() => this.dayFlow.find((s) => s.id === this.activeFlowId()) ?? this.dayFlow[0]);

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_HOME_PAGE_META, this.document);
        setPublicJsonLd(this.document, HOME_ORGANIZATION_JSON_LD_ID, publicOrganizationJsonLd());
        setPublicJsonLd(this.document, HOME_FAQ_JSON_LD_ID, publicFaqPageJsonLd(this.faqs));
        this.destroyRef.onDestroy(() => {
            removePublicJsonLd(this.document, HOME_ORGANIZATION_JSON_LD_ID);
            removePublicJsonLd(this.document, HOME_FAQ_JSON_LD_ID);
        });
    }
}
