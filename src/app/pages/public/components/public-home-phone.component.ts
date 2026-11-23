import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    PUBLIC_HOME_AUDIENCE,
    PUBLIC_HOME_DAY_FLOW,
    PUBLIC_HOME_HERO,
    PUBLIC_HOME_PHONE_HERO_CHIP,
    PUBLIC_HOME_SECTIONS,
    PUBLIC_HOME_TIMELINE_MARKS,
    PUBLIC_HOME_TRIAL_LINE,
    PUBLIC_HOME_TRUST
} from '@/app/features/public/utils/public-home-content.utils';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_HOME_TIMELINE_VISUALS, type PublicTimelineVisual } from '@/app/features/public/utils/public-screenshot-crops.utils';
import { PUBLIC_KVKK_NOTE, PUBLIC_KVKK_STEPS, PUBLIC_RECORD_SAFETY_ITEMS, PUBLIC_REGISTERS } from '@/app/features/public/utils/public-registers-content.utils';
import { PUBLIC_SITE_DESIGN_SIZE, PUBLIC_SITE_DESIGNS, PUBLIC_SITE_SHOWCASE, publicSiteDesignSrc } from '@/app/features/public/utils/public-site-showcase-content.utils';
import { publicSiteToneClass } from '@/app/features/public/utils/public-site-tone.utils';
import { PublicScreenshotComponent } from './public-screenshot.component';

/**
 * Ana sayfanın telefon düzeni (T-03 B "Günün saatleri", 768 px altı). Sayfa bir klinik günü gibi okunur: kahraman ve güven kartı,
 * soldaki çizgide 09:00 geliş · 09:20 muayene · 09:50 tahsilat · 19:00 gün sonu; defterler, KVKK, kayıt güvenliği ve klinik web
 * sitesi aynı çizgide saatsiz duraklar. Ardından "Kime göre". Geçiş, paketler, SSS ve çağrı ana sayfayla ortaktır. Metinler masaüstü
 * bölümleriyle aynı sabitlerden okunur; görünüş `public-site.scss` içindeki `ps-ph-` sınıfları.
 */
@Component({
    selector: 'app-public-home-phone',
    standalone: true,
    imports: [RouterLink, PublicScreenshotComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="ps-ph-hero ps-tone-sun" aria-labelledby="public-home-hero-title">
            <div class="ps-wrap">
                <p class="ps-ph-clock"><i class="pi pi-clock" aria-hidden="true"></i>{{ heroChip }}</p>
                <h1 id="public-home-hero-title" class="public-h1">{{ hero.title }} <em class="ps-marker">{{ hero.marker }}</em></h1>
                <p class="ps-ph-lead">{{ hero.lead }}</p>
                <div class="ps-ph-actions">
                    <a routerLink="/auth/signup" class="public-btn public-btn-primary">Ücretsiz dene</a>
                    <a [routerLink]="paths.contact" class="public-btn public-btn-secondary">Demo iste</a>
                </div>
                <ul class="ps-list ps-ph-ticks" [attr.aria-label]="trialLine">
                    @for (part of trialParts; track part) {
                        <li><i class="pi pi-check" aria-hidden="true"></i>{{ part }}</li>
                    }
                </ul>
                <ul class="ps-list ps-ph-trust" aria-label="Kısaca">
                    @for (item of trust; track item.text) {
                        <li><i [class]="item.icon" aria-hidden="true"></i>{{ item.text }}</li>
                    }
                </ul>
            </div>
        </section>

        <section class="ps-ph-section" aria-labelledby="public-home-flow-title">
            <div class="ps-wrap">
                <header class="ps-ph-head">
                    <h2 id="public-home-flow-title" class="public-h2">{{ sections.flow.title }}</h2>
                    <p class="ps-ph-lead">{{ sections.flow.lead }}</p>
                </header>
                <ol class="ps-list ps-ph-line" data-home-timeline>
                    @for (step of dayFlow.slice(0, 3); track step.id; let i = $index) {
                        <li [class]="toneOf(i)" [attr.data-step]="step.id">
                            <span class="ps-ph-time">{{ step.time }}</span>
                            <h3 class="ps-h3">{{ step.title }}</h3>
                            <p class="ps-ph-text">{{ step.description }}</p>
                            @if (visualOf(step.id); as v) {
                                <div [class]="v.device ? 'ps-ph-device' : 'ps-ph-shot'"><app-public-screenshot [crop]="v.crop" /></div>
                            }
                        </li>
                    }

                    <li class="ps-tone-mint" data-step="defterler">
                        <span class="ps-ph-time ps-ph-time--soft">{{ marks.turkey }}</span>
                        <h2 id="public-home-tr-title" class="public-h2">{{ sections.turkey.title }}</h2>
                        <p class="ps-ph-text ps-ph-muted">{{ sections.turkey.lead }}</p>
                        <article class="ps-ph-card ps-tone-mint">
                            <h3 class="ps-h3"><i class="pi pi-book" aria-hidden="true"></i>{{ sections.registers.title }}</h3>
                            <ul class="ps-list ps-ph-rows">
                                @for (register of registers; track register.name) {
                                    <li>
                                        <strong>{{ register.name }}</strong><span>{{ register.fills }}</span>
                                    </li>
                                }
                            </ul>
                            <div class="ps-ph-cardshot"><app-public-screenshot crop="defterCikti" /></div>
                            <p class="ps-ph-small">{{ sections.registers.note }}</p>
                        </article>
                        <article class="ps-ph-card ps-tone-lilac">
                            <h3 class="ps-h3"><i class="pi pi-shield" aria-hidden="true"></i>{{ sections.kvkk.title }}</h3>
                            <ul class="ps-list ps-ph-rows">
                                @for (item of kvkkSteps; track item.title) {
                                    <li>
                                        <strong>{{ item.title }}</strong><span>{{ item.description }}</span>
                                    </li>
                                }
                            </ul>
                            <p class="ps-ph-small">{{ sections.kvkk.note }}</p>
                        </article>
                        <p class="ps-ph-note">{{ kvkkNote }}</p>
                        <a [routerLink]="paths.registersAndKvkk" class="ps-ph-link">{{ sections.turkey.link }}<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                    </li>

                    <li class="ps-tone-lilac" data-step="guvenlik">
                        <span class="ps-ph-time ps-ph-time--soft">{{ marks.safety }}</span>
                        <h2 id="public-home-safety-title" class="public-h2">{{ sections.safety.title }}</h2>
                        <div class="ps-ph-card ps-tone-lilac">
                            <ul class="ps-list ps-ph-rows">
                                @for (item of safetyItems; track item.title) {
                                    <li>
                                        <strong>{{ item.title }}</strong><span>{{ item.description }}</span>
                                    </li>
                                }
                            </ul>
                        </div>
                    </li>

                    @for (step of dayFlow.slice(3); track step.id) {
                        <li class="ps-tone-lilac" [attr.data-step]="step.id">
                            <span class="ps-ph-time">{{ step.time }}</span>
                            <h3 class="ps-h3">{{ step.title }}</h3>
                            <p class="ps-ph-text">{{ step.description }}</p>
                            @if (visualOf(step.id); as v) {
                                <div [class]="v.device ? 'ps-ph-device' : 'ps-ph-shot'"><app-public-screenshot [crop]="v.crop" /></div>
                            }
                            <a [routerLink]="paths.features" class="ps-ph-link">{{ sections.flow.link }}<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                        </li>
                    }

                    <li class="ps-tone-sun" data-step="web-sitesi">
                        <span class="ps-ph-time ps-ph-time--soft">{{ marks.site }}</span>
                        <h2 id="public-home-site-title" class="public-h2">{{ site.homeTitle }}</h2>
                        <p class="ps-ph-text ps-ph-muted">{{ site.homeLead }}</p>
                        <figure class="ps-ph-site" data-site-preview>
                            <img [src]="siteSrc()" [alt]="activeDesign().alt" [attr.width]="siteSize.width" [attr.height]="siteSize.height" loading="lazy" decoding="async" />
                        </figure>
                        <div class="ps-ph-seg" role="group" aria-label="Tasarım seçin">
                            @for (design of designs; track design.key) {
                                <button type="button" [attr.aria-pressed]="design.key === activeDesign().key" (click)="designKey.set(design.key)">{{ design.name }}</button>
                            }
                        </div>
                        <p class="ps-ph-sitenote" aria-live="polite">
                            <strong>{{ activeDesign().name }}:</strong> {{ activeDesign().note }}
                        </p>
                        <a [routerLink]="paths.features" [fragment]="site.id" class="ps-ph-link">{{ site.homeLinkLabel }}<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                    </li>
                </ol>
            </div>
        </section>

        <section class="ps-ph-section ps-section--band" aria-labelledby="public-home-audience-title">
            <div class="ps-wrap">
                <header class="ps-ph-head">
                    <h2 id="public-home-audience-title" class="public-h2">{{ sections.audience.title }}</h2>
                    <p class="ps-ph-lead">{{ sections.audience.lead }}</p>
                </header>
                <ul class="ps-list ps-ph-who">
                    @for (item of audience; track item.title; let i = $index) {
                        <li [class]="toneOf(i)">
                            <h3 class="ps-h3"><i [class]="item.icon" aria-hidden="true"></i>{{ item.title }}</h3>
                            <p>{{ item.description }}</p>
                        </li>
                    }
                </ul>
            </div>
        </section>

    `
})
export class PublicHomePhoneComponent {
    readonly paths = PUBLIC_PATHS;
    readonly hero = PUBLIC_HOME_HERO;
    readonly heroChip = PUBLIC_HOME_PHONE_HERO_CHIP;
    readonly trialLine = PUBLIC_HOME_TRIAL_LINE;
    readonly trialParts = PUBLIC_HOME_TRIAL_LINE.split(' · ');
    readonly trust = PUBLIC_HOME_TRUST;
    readonly sections = PUBLIC_HOME_SECTIONS;
    readonly marks = PUBLIC_HOME_TIMELINE_MARKS;
    readonly dayFlow = PUBLIC_HOME_DAY_FLOW;
    readonly registers = PUBLIC_REGISTERS;
    readonly kvkkSteps = PUBLIC_KVKK_STEPS;
    readonly kvkkNote = PUBLIC_KVKK_NOTE;
    readonly safetyItems = PUBLIC_RECORD_SAFETY_ITEMS;
    readonly audience = PUBLIC_HOME_AUDIENCE;
    readonly site = PUBLIC_SITE_SHOWCASE;
    readonly designs = PUBLIC_SITE_DESIGNS;
    readonly siteSize = PUBLIC_SITE_DESIGN_SIZE;
    readonly toneOf = publicSiteToneClass;

    readonly designKey = signal(PUBLIC_SITE_DESIGNS[0].key);
    readonly activeDesign = computed(() => PUBLIC_SITE_DESIGNS.find((d) => d.key === this.designKey()) ?? PUBLIC_SITE_DESIGNS[0]);
    readonly siteSrc = computed(() => publicSiteDesignSrc(this.activeDesign()));

    visualOf(stepId: string): PublicTimelineVisual | null {
        return PUBLIC_HOME_TIMELINE_VISUALS[stepId] ?? null;
    }
}
