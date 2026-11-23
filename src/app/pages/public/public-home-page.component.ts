import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PUBLIC_HOME_FAQS } from '@/app/features/public/utils/public-faq-content.utils';
import { PUBLIC_HOME_AUDIENCE, PUBLIC_HOME_DAY_FLOW, PUBLIC_HOME_TRIAL_LINE, PUBLIC_HOME_TRUST } from '@/app/features/public/utils/public-home-content.utils';
import { PUBLIC_MIGRATION_HOME_STEPS, PUBLIC_MIGRATION_INCLUDED } from '@/app/features/public/utils/public-migration-content.utils';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_FEATURE_VISUALS } from '@/app/features/public/utils/public-screenshot-crops.utils';
import { publicSiteToneClass } from '@/app/features/public/utils/public-site-tone.utils';
import {
    PUBLIC_KVKK_NOTE,
    PUBLIC_KVKK_STEPS,
    PUBLIC_RECORD_SAFETY_ITEMS,
    PUBLIC_REGISTERS
} from '@/app/features/public/utils/public-registers-content.utils';
import { PUBLIC_HOME_PAGE_META, publicFaqPageJsonLd, publicOrganizationJsonLd, removePublicJsonLd, setPublicJsonLd, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { pricingTermsText } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { PublicPlanCatalogService } from '@/app/features/public/services/public-plan-catalog.service';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicPlanCardsComponent } from './components/public-plan-cards.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicScreenshotComponent } from './components/public-screenshot.component';
import { PublicSiteShowcaseComponent } from './components/public-site-showcase.component';

const HOME_FAQ_JSON_LD_ID = 'home-faq';
const HOME_ORGANIZATION_JSON_LD_ID = 'home-organization';

/**
 * Ana sayfa omurgası (tasarım belgesi 5.1, ADR-035): kahraman, güven satırı, kime göre, bir günün akışı, Türkiye'ye özgü, kayıt
 * güvenliği, klinik web sitesi, geçiş, paketler, SSS, çağrı. Görünüş "Sıcak klinik" (`public-site.scss`): günün dört adımı dört
 * tonla ayrışır; ekranlar panel menüsü kırpılmış, büyük ve yakın çekimli; telefonda dar parça gösterilir.
 */
@Component({
    selector: 'app-public-home-page',
    standalone: true,
    imports: [RouterLink, PublicScreenshotComponent, PublicSiteShowcaseComponent, PublicPlanCardsComponent, PublicFaqListComponent, PublicCtaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- 1 Kahraman: solda metin ("tek ekranda" fosforlu), sağda kalın çerçevede ekran ve yapışkan not; altında günün dört durağı -->
        <section class="ps-hero" aria-labelledby="public-home-hero-title">
            <span class="ps-blob ps-blob--a ps-tone-mint" aria-hidden="true"></span>
            <span class="ps-blob ps-blob--b ps-tone-sun" aria-hidden="true"></span>
            <div class="ps-wrap ps-hero-grid">
                <div>
                    <p class="ps-chip ps-tone-mint"><i class="pi pi-heart-fill" aria-hidden="true"></i>Veteriner klinikleri için</p>
                    <h1 id="public-home-hero-title" class="public-h1">Veteriner kliniğinizin günü <em class="ps-marker">tek ekranda</em></h1>
                    <p class="ps-hero-lead">Geliş, bekleme, muayene, tahsilat ve kayıt defterleri aynı yerde. Kâğıt, Excel ya da eski programdaki kayıtlarınızı da getirin.</p>
                    <div class="ps-actions">
                        <a routerLink="/auth/signup" class="public-btn public-btn-primary">Ücretsiz dene</a>
                        <a [routerLink]="paths.contact" class="public-btn public-btn-secondary">Demo iste</a>
                    </div>
                    <ul class="ps-list ps-ticks" [attr.aria-label]="trialLine">
                        @for (part of trialParts; track part) {
                            <li><i class="pi pi-check" aria-hidden="true"></i>{{ part }}</li>
                        }
                    </ul>
                </div>
                <div class="ps-stage">
                    <div class="ps-stage-main ps-not-phone">
                        <app-public-screenshot crop="bugunIcerik" [eager]="true" />
                    </div>
                    <!-- Telefonda masaüstü ekranı yerine gerçek telefon ekranı -->
                    <div class="ps-only-phone" data-hero-phone>
                        <app-public-screenshot crop="telefonKart" />
                    </div>
                    <div class="ps-stage-sticker ps-not-phone">
                        <app-public-screenshot crop="bugunAcil" [sticker]="true" [caption]="heroStickerCaption" />
                    </div>
                </div>
            </div>
            <ol class="ps-list ps-wrap ps-path" aria-label="Günün durakları">
                @for (step of dayFlow; track step.id; let i = $index) {
                    <li [class]="toneOf(i)">
                        <span class="ps-bubble" aria-hidden="true">{{ i + 1 }}</span>
                        <strong>{{ step.title }}</strong>
                    </li>
                }
            </ol>
        </section>

        <!-- Güven satırı -->
        <div class="ps-trust">
            <ul class="ps-list ps-wrap" aria-label="Kısaca">
                @for (item of trust; track item.text) {
                    <li><i [class]="item.icon" aria-hidden="true"></i>{{ item.text }}</li>
                }
            </ul>
        </div>

        <!-- 2 Kime göre: üç tonlu kart -->
        <section class="ps-section" aria-labelledby="public-home-audience-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="public-home-audience-title" class="public-h2">Kime göre?</h2>
                    <p class="public-lead">Tek hekimli klinikten çok şubeli işletmeye; büyüdükçe şube eklersiniz.</p>
                </header>
                <div class="ps-cards3">
                    @for (item of audience; track item.title; let i = $index) {
                        <article [class]="'ps-card ' + toneOf(i)">
                            <span class="ps-round" aria-hidden="true"><i [class]="item.icon"></i></span>
                            <h3 class="ps-h3">{{ item.title }}</h3>
                            <p>{{ item.description }}</p>
                        </article>
                    }
                </div>
            </div>
        </section>

        <!-- 3 Bir günün akışı: renkli sekmeler; panel seçili adımın rengine bürünür -->
        <section class="ps-section ps-section--tight" aria-labelledby="public-home-flow-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="public-home-flow-title" class="public-h2">Bir günün akışı</h2>
                    <p class="public-lead">Gelişten gün sonuna dört adım; her adımda tek ekran.</p>
                </header>
                <div class="ps-tabs" role="tablist" aria-label="Günün adımları">
                    @for (step of dayFlow; track step.id; let i = $index) {
                        <button
                            type="button"
                            role="tab"
                            [id]="'flow-tab-' + step.id"
                            [attr.aria-selected]="activeFlowId() === step.id"
                            [attr.aria-controls]="'flow-panel-' + step.id"
                            [class]="'ps-tab ' + toneOf(i)"
                            [class.ps-tab--active]="activeFlowId() === step.id"
                            (click)="activeFlowId.set(step.id)"
                        >
                            <span class="ps-bubble" aria-hidden="true">{{ i + 1 }}</span><span>{{ step.title }}</span>
                        </button>
                    }
                </div>
                <div role="tabpanel" [id]="'flow-panel-' + activeFlow().id" [attr.aria-labelledby]="'flow-tab-' + activeFlow().id" [class]="'ps-stagepanel ' + toneOf(activeFlowIndex())">
                    <p class="ps-stagepanel-text">{{ activeFlow().description }}</p>
                    <app-public-screenshot [crop]="activeVisual().main" [phoneCrop]="activeVisual().phone" />
                    <div class="ps-zooms ps-not-phone" [class.ps-zooms--single]="activeVisual().details.length === 1">
                        @for (detail of activeVisual().details; track detail.crop) {
                            <div>
                                <app-public-screenshot [crop]="detail.crop" />
                                <p class="ps-zoom-label"><i class="pi pi-search-plus" aria-hidden="true"></i>{{ detail.label }}</p>
                            </div>
                        }
                    </div>
                </div>
                <p class="ps-more ps-center">
                    <a [routerLink]="paths.features" class="public-btn public-btn-secondary">Tüm akışı görün<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                </p>
            </div>
        </section>

        <!-- 4 Türkiye'ye özgü: iki büyük kart, altında defter satırları -->
        <section class="ps-section ps-section--band" aria-labelledby="public-home-tr-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="public-home-tr-title" class="public-h2">Türkiye'ye özgü</h2>
                    <p class="public-lead">Kayıt defterleri her kayıtla kendiliğinden dolar; KVKK evrakı hazır.</p>
                </header>
                <div class="ps-duo">
                    <article class="ps-card ps-card--plain">
                        <h3 class="ps-h3">Kayıt defterleri</h3>
                        <ul class="ps-list ps-rows ps-tone-mint">
                            @for (register of registers; track register.name) {
                                <li>
                                    <span class="ps-round ps-round--small" aria-hidden="true"><i class="pi pi-book"></i></span>
                                    <div>
                                        <strong>{{ register.name }}</strong>
                                        <p>{{ register.fills }}</p>
                                    </div>
                                </li>
                            }
                        </ul>
                        <p class="ps-small">Yazdırın, Excel'e alın.</p>
                        <div class="ps-card-shot"><app-public-screenshot crop="defterCikti" /></div>
                    </article>
                    <article class="ps-card ps-card--plain">
                        <h3 class="ps-h3">KVKK evrakı</h3>
                        <ul class="ps-list ps-rows ps-tone-lilac">
                            @for (step of kvkkSteps; track step.title) {
                                <li>
                                    <span class="ps-round ps-round--small" aria-hidden="true"><i [class]="step.icon"></i></span>
                                    <div>
                                        <strong>{{ step.title }}</strong>
                                        <p>{{ step.description }}</p>
                                    </div>
                                </li>
                            }
                        </ul>
                        <p class="ps-small">Rıza kaydı ve metin sürümü müşteri kartında.</p>
                        <div class="ps-card-shot"><app-public-screenshot shot="kvkkFormu" /></div>
                    </article>
                </div>
                <div class="mt-5"><app-public-screenshot crop="defterSatirlar" phoneCrop="defterDar" /></div>
                <p class="public-note">{{ kvkkNote }}</p>
                <p class="ps-more ps-center">
                    <a [routerLink]="paths.registersAndKvkk" class="public-btn public-btn-secondary">Defterler ve KVKK sayfası<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                </p>
            </div>
        </section>

        <!-- 5 Kayıt güvenliği: leylak panel, solda dört madde, sağda kesinleştirme ekranı ve yakın çekimi -->
        <section class="ps-section" aria-labelledby="public-home-safety-title">
            <div class="ps-wrap">
                <div class="ps-panel ps-tone-lilac ps-split">
                    <div>
                        <h2 id="public-home-safety-title" class="public-h2">Kayıtlarınız güvende ve dürüst</h2>
                        <ul class="ps-list ps-minis">
                            @for (item of safetyItems; track item.title) {
                                <li>
                                    <span class="ps-round ps-round--small" aria-hidden="true"><i [class]="item.icon"></i></span>
                                    <strong>{{ item.title }}</strong>
                                    <p>{{ item.description }}</p>
                                </li>
                            }
                        </ul>
                    </div>
                    <div class="ps-overlap">
                        <app-public-screenshot shot="kesinlestirme" />
                        <div class="ps-overlap-zoom ps-not-phone"><app-public-screenshot crop="kesinlestirmeKontrol" /></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Klinik web sitesi: dört tasarım fotoğraf kartı gibi; ayrıntısı Özellikler'de -->
        <section class="ps-section ps-section--tight" aria-labelledby="public-home-site-title">
            <div class="ps-wrap">
                <app-public-site-showcase [compact]="true" headingId="public-home-site-title" />
            </div>
        </section>

        <!-- 6 Geçiş: noktalı yolda üç adım, aktarılanlar -->
        <section class="ps-section ps-section--band" aria-labelledby="public-home-migration-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="public-home-migration-title" class="public-h2">Eski programdan kayıtlarınızla geçin</h2>
                </header>
                <ol class="ps-list ps-trail ps-tone-sun">
                    @for (step of migrationSteps; track step.title; let i = $index) {
                        <li>
                            <span class="ps-bubble ps-bubble--big" aria-hidden="true">{{ i + 1 }}</span>
                            <h3 class="ps-h3">{{ step.title }}</h3>
                            <p>{{ step.description }}</p>
                        </li>
                    }
                </ol>
                <div class="ps-card ps-card--plain ps-tone-mint ps-transfer">
                    <h3 class="ps-h3"><span class="ps-round ps-round--small" aria-hidden="true"><i class="pi pi-check"></i></span>Aktarılır</h3>
                    <ul class="ps-list ps-ticklist ps-ticklist--two" data-migration-included>
                        @for (item of migrationIncluded; track item) {
                            <li><i class="pi pi-check" aria-hidden="true"></i><span>{{ item }}</span></li>
                        }
                    </ul>
                </div>
                <p class="ps-more ps-center">
                    <a [routerLink]="paths.migration" class="public-btn public-btn-secondary">Geçiş adımlarının tamamı<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                </p>
            </div>
        </section>

        <!-- 7 Paketler: kart metni paket verisinden (ADR-035), fiyat ve sınır backend kataloğundan (WEB-007) -->
        <section class="ps-section" aria-labelledby="public-home-packages-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="public-home-packages-title" class="public-h2">Paketler</h2>
                    <p class="public-lead">Kayıt defterleri ve KVKK araçları her pakette. {{ pricingTerms }}.</p>
                </header>
                <app-public-plan-cards [pricing]="pricing()" />
                <p class="ps-more ps-center">
                    <a [routerLink]="paths.packages" class="public-btn public-btn-secondary">Paketleri karşılaştırın<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                </p>
            </div>
        </section>

        <!-- 8 SSS -->
        <section class="ps-section ps-section--band" aria-labelledby="public-home-faq-title">
            <div class="ps-wrap ps-narrow">
                <header class="ps-head ps-head--center">
                    <h2 id="public-home-faq-title" class="public-h2">Sık sorulan sorular</h2>
                </header>
                <app-public-faq-list [items]="faqs" idPrefix="home-faq" />
                <p class="ps-more ps-center">
                    <a [routerLink]="paths.faq" class="public-btn public-btn-secondary">Tüm sorular<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                </p>
            </div>
        </section>

        <!-- 9 Çağrı -->
        <app-public-cta />
    `
})
export class PublicHomePageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly planCatalog = inject(PublicPlanCatalogService);

    readonly paths = PUBLIC_PATHS;
    readonly trialLine = PUBLIC_HOME_TRIAL_LINE;
    readonly trialParts = PUBLIC_HOME_TRIAL_LINE.split(' · ');
    readonly trust = PUBLIC_HOME_TRUST;
    readonly toneOf = publicSiteToneClass;
    /** Kahramandaki yakın çekimin notu: geliş bölümünün ilk yakın çekim altyazısı. */
    readonly heroStickerCaption = PUBLIC_FEATURE_VISUALS['gelis'].details[0].label;
    readonly audience = PUBLIC_HOME_AUDIENCE;
    readonly dayFlow = PUBLIC_HOME_DAY_FLOW;
    readonly registers = PUBLIC_REGISTERS;
    readonly kvkkSteps = PUBLIC_KVKK_STEPS;
    readonly kvkkNote = PUBLIC_KVKK_NOTE;
    readonly safetyItems = PUBLIC_RECORD_SAFETY_ITEMS;
    readonly migrationSteps = PUBLIC_MIGRATION_HOME_STEPS;
    readonly migrationIncluded = PUBLIC_MIGRATION_INCLUDED;
    readonly pricingTerms = pricingTermsText();
    readonly faqs = PUBLIC_HOME_FAQS;
    readonly pricing = this.planCatalog.state;

    readonly activeFlowId = signal(PUBLIC_HOME_DAY_FLOW[0].id);
    readonly activeFlow = computed(() => this.dayFlow.find((s) => s.id === this.activeFlowId()) ?? this.dayFlow[0]);
    readonly activeFlowIndex = computed(() => this.dayFlow.indexOf(this.activeFlow()));
    readonly activeVisual = computed(() => PUBLIC_FEATURE_VISUALS[this.activeFlow().id]);

    ngOnInit(): void {
        this.planCatalog.ensureLoaded();
        setPublicPageMeta(this.title, this.meta, PUBLIC_HOME_PAGE_META, this.document);
        setPublicJsonLd(this.document, HOME_ORGANIZATION_JSON_LD_ID, publicOrganizationJsonLd());
        setPublicJsonLd(this.document, HOME_FAQ_JSON_LD_ID, publicFaqPageJsonLd(this.faqs));
        this.destroyRef.onDestroy(() => {
            removePublicJsonLd(this.document, HOME_ORGANIZATION_JSON_LD_ID);
            removePublicJsonLd(this.document, HOME_FAQ_JSON_LD_ID);
        });
    }
}
