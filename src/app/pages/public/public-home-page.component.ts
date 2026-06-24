import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import {
    PUBLIC_HOME_FAQS,
    PUBLIC_HOME_FEATURES,
    PUBLIC_HOME_MODULES,
    PUBLIC_HOME_PREVIEW_METRICS,
    PUBLIC_HOME_PREVIEW_TASKS,
    PUBLIC_HOME_STATS,
    PUBLIC_HOME_WHY
} from '@/app/features/public/utils/public-home-content.utils';
import { PublicFooterComponent } from './components/public-footer.component';
import { PublicTopbarComponent } from './components/public-topbar.component';
import { PUBLIC_HOME_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';

@Component({
    selector: 'app-public-home-page',
    standalone: true,
    imports: [
        RouterLink,
        ButtonModule,
        RippleModule,
        PublicTopbarComponent,
        PublicFooterComponent
    ],
    template: `
        <div class="public-page bg-surface-50 dark:bg-surface-950 min-h-screen overflow-x-hidden">
            <app-public-topbar />

            <main class="relative">
                <!-- Hero — Genesis SaaS gradient container -->
                <section class="pt-3 md:pt-6" aria-labelledby="public-home-hero-title">
                    <div class="max-w-6xl mx-auto px-4">
                        <div
                            class="relative overflow-hidden rounded-3xl lg:rounded-[2rem] public-theme-gradient-hero dark:shadow-black/40"
                        >
                            <div
                                class="pointer-events-none absolute inset-0 overflow-hidden"
                                aria-hidden="true"
                            >
                                <div
                                    class="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[min(720px,130%)] h-72 rounded-full border border-cyan-200/50 dark:border-white/10 opacity-40"
                                ></div>
                                <div
                                    class="absolute top-8 right-8 w-40 h-40 rounded-full public-hero-glow-spot blur-2xl"
                                ></div>
                                <div
                                    class="absolute -top-12 -left-12 w-56 h-56 rounded-full public-hero-glow-spot-soft blur-3xl"
                                ></div>
                            </div>

                            <div class="relative px-5 md:px-6 lg:px-12 pt-8 pb-8 lg:pt-14 lg:pb-12">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-12 items-center">
                                    <div class="public-hero text-center lg:text-left">
                                        <span
                                            class="public-hero-badge inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-4 md:mb-6"
                                        >
                                            <i class="pi pi-star-fill text-[10px]" aria-hidden="true"></i>
                                            Veteriner klinikleri için
                                        </span>
                                        <h1
                                            id="public-home-hero-title"
                                            class="public-hero-title text-[1.625rem] md:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold m-0 mb-4 md:mb-5 leading-[1.14] md:leading-[1.12] tracking-tight"
                                        >
                                            Veteriner klinikleri için modern yönetim platformu
                                        </h1>
                                        <p class="public-hero-lead text-[0.9375rem] md:text-lg m-0 mb-6 md:mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                            Randevu, hasta kayıtları, muayene, tedavi, aşı, ödeme, stok ve rapor süreçlerini
                                            tek panelden yönetin.
                                        </p>
                                        <div
                                            class="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3"
                                        >
                                            <div class="public-hero-cta-primary w-full sm:w-auto">
                                                <a
                                                    routerLink="/auth/signup"
                                                    pButton
                                                    pRipple
                                                    label="Ücretsiz başla"
                                                    class="w-full"
                                                ></a>
                                            </div>
                                            <div class="public-hero-cta-secondary w-full sm:w-auto">
                                                <a
                                                    routerLink="/auth/login"
                                                    pButton
                                                    pRipple
                                                    label="Giriş yap"
                                                    class="w-full"
                                                ></a>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Mock dashboard — HTML/CSS, temsilî -->
                                    <div class="pointer-events-none relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
                                        <div
                                            class="rounded-2xl lg:rounded-3xl border border-surface-200/60 dark:border-surface-700/60 bg-surface-0/95 dark:bg-surface-900/95 backdrop-blur-sm shadow-2xl p-4 md:p-5"
                                        >
                                            <div
                                                class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-surface-200 dark:border-surface-700"
                                            >
                                                <div class="flex items-center gap-2">
                                                    <span class="w-2.5 h-2.5 rounded-full bg-red-400/80"></span>
                                                    <span class="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
                                                    <span class="w-2.5 h-2.5 rounded-full public-theme-dot"></span>
                                                </div>
                                                <span class="text-muted-color text-xs font-medium">Panel önizleme</span>
                                            </div>

                                            <div class="grid grid-cols-2 gap-3 mb-4">
                                                @for (metric of previewMetrics; track metric.label) {
                                                    <div
                                                        class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-950 p-3"
                                                    >
                                                        <div class="flex items-center gap-2 mb-2">
                                                            <i [class]="metric.icon + ' public-theme-text text-xs'" aria-hidden="true"></i>
                                                            <p class="text-muted-color text-[10px] m-0 leading-tight">{{ metric.label }}</p>
                                                        </div>
                                                        <p class="text-surface-900 dark:text-surface-0 text-xs font-semibold m-0 mb-2">
                                                            {{ metric.hint }}
                                                        </p>
                                                        <div class="flex gap-1 h-1" aria-hidden="true">
                                                            <span class="flex-[3] rounded-full public-theme-bar-40"></span>
                                                            <span class="flex-[2] rounded-full public-theme-bar-25"></span>
                                                            <span class="flex-1 rounded-full public-theme-bar-15"></span>
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div
                                                class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-950 p-3"
                                            >
                                                <div class="flex items-center justify-between mb-3">
                                                    <span class="text-surface-900 dark:text-surface-0 text-xs font-semibold"
                                                        >Yaklaşan işlemler</span
                                                    >
                                                    <span class="public-theme-text text-[10px] font-medium">Bugün</span>
                                                </div>
                                                <ul class="list-none p-0 m-0 space-y-2">
                                                    @for (task of previewTasks; track task.label) {
                                                        <li
                                                            class="flex items-center gap-2 text-[11px] rounded-lg bg-surface-0 dark:bg-surface-900 px-2 py-1.5 border border-surface-200/60 dark:border-surface-700/60"
                                                        >
                                                            <span class="w-9 text-center text-muted-color font-medium shrink-0">{{
                                                                task.time
                                                            }}</span>
                                                            <span class="text-surface-800 dark:text-surface-100 truncate">{{
                                                                task.label
                                                            }}</span>
                                                        </li>
                                                    }
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Stats strip — Genesis static-customers hissi -->
                <section class="max-w-6xl mx-auto px-4 py-10 md:py-14" aria-label="Platform yetenekleri">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        @for (stat of stats; track stat.title) {
                            <article
                                class="rounded-3xl border border-surface-200 dark:border-surface-700/80 bg-surface-0 dark:bg-surface-900 py-5 px-4 flex flex-col items-center text-center gap-2 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <span
                                    class="inline-flex items-center justify-center w-11 h-11 rounded-2xl public-theme-icon-box public-theme-icon-shadow-sm"
                                    aria-hidden="true"
                                >
                                    <i [class]="stat.icon"></i>
                                </span>
                                <h3 class="text-surface-900 dark:text-surface-0 text-sm font-semibold m-0">{{ stat.title }}</h3>
                                <p class="text-muted-color text-xs m-0">{{ stat.subtitle }}</p>
                            </article>
                        }
                    </div>
                </section>

                <!-- Özellikler -->
                <section
                    id="features"
                    class="max-w-6xl mx-auto px-4 mb-20 md:mb-28 scroll-mt-24"
                    aria-labelledby="public-home-features-title"
                >
                    <div class="public-home-section-header mb-12 md:mb-14">
                        <span
                            class="public-home-section-header-icon inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl public-theme-icon-box public-theme-icon-shadow"
                            aria-hidden="true"
                        >
                            <i class="pi pi-th-large text-xl lg:text-2xl"></i>
                        </span>
                        <h2
                            id="public-home-features-title"
                            class="text-surface-900 dark:text-surface-0 text-2xl md:text-4xl font-bold text-center max-w-lg"
                        >
                            Özellikler
                        </h2>
                        <p class="text-muted-color max-w-xl text-center text-base md:text-lg">
                            Klinik operasyonlarınızı uçtan uca destekleyen modüller.
                        </p>
                    </div>
                    <div class="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                        @for (feature of features; track feature.title) {
                            <article
                                class="group public-theme-feature-card flex h-full min-h-[220px] flex-col rounded-3xl border border-surface-200 bg-surface-0 p-6 transition-all duration-200 md:min-h-[240px] md:p-7 lg:min-h-[260px] dark:border-surface-700 dark:bg-surface-900 dark:hover:shadow-black/25"
                            >
                                <span
                                    class="inline-flex items-center justify-center w-12 h-12 rounded-2xl public-theme-soft-gradient mb-5 transition-transform group-hover:scale-105"
                                    aria-hidden="true"
                                >
                                    <i [class]="feature.icon + ' text-xl'"></i>
                                </span>
                                <h3 class="text-surface-900 dark:text-surface-0 text-lg font-semibold m-0 mb-2">{{ feature.title }}</h3>
                                <p class="text-muted-color text-sm m-0 leading-relaxed">{{ feature.description }}</p>
                            </article>
                        }
                    </div>
                </section>

                <!-- Neden bu SaaS? — Genesis streamline düzeni -->
                <section class="public-home-why max-w-6xl mx-auto px-4 mb-20 md:mb-28" aria-labelledby="public-home-why-title">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                        <div>
                            <span
                                class="inline-block px-3.5 py-1 rounded-full border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm font-medium shadow-sm mb-4"
                            >
                                Neden Vetinity?
                            </span>
                            <h2
                                id="public-home-why-title"
                                class="text-surface-900 dark:text-surface-0 text-2xl md:text-4xl font-bold m-0 mb-4 leading-tight"
                            >
                                Büyüyen klinikler için güvenli yönetim altyapısı
                            </h2>
                            <p class="public-why-lead text-muted-color m-0 leading-relaxed text-base md:text-lg">
                                Birden fazla kliniği, kullanıcı rollerini ve operasyon süreçlerini tek panelden yönetin.
                                Klinik ekipleri güvenli erişimle çalışır, randevu ve hasta süreçleri daha düzenli takip edilir.
                            </p>
                        </div>

                        <div
                            class="public-why-card rounded-3xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-6 md:p-8 shadow-xl shadow-surface-900/5 dark:shadow-black/25"
                        >
                            <div
                                class="public-why-card-header flex items-center gap-3 mb-6 pb-4 border-b border-surface-200 dark:border-surface-700"
                            >
                                <span
                                    class="inline-flex items-center justify-center w-11 h-11 rounded-2xl public-theme-soft-bg"
                                    aria-hidden="true"
                                >
                                    <i class="pi pi-shield text-xl"></i>
                                </span>
                                <div>
                                    <p class="text-surface-900 dark:text-surface-0 font-semibold m-0 text-sm">Güvenli altyapı</p>
                                    <p class="public-why-card-subtitle text-muted-color text-xs m-0">Klinik, kullanıcı ve yetki yönetimi</p>
                                </div>
                            </div>
                            <ul class="list-none p-0 m-0 space-y-3.5">
                                @for (item of whyItems; track item.text) {
                                    <li class="flex items-start gap-3 text-surface-700 dark:text-surface-200 text-sm md:text-base">
                                        <i class="pi pi-check-circle public-why-check mt-0.5 shrink-0" aria-hidden="true"></i>
                                        <span>{{ item.text }}</span>
                                    </li>
                                }
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Modül vitrini -->
                <section
                    id="modules"
                    class="max-w-6xl mx-auto px-4 mb-20 md:mb-28 scroll-mt-24"
                    aria-labelledby="public-home-modules-title"
                >
                    <div class="public-home-section-header mb-12 md:mb-14">
                        <span
                            class="public-home-section-header-icon inline-flex items-center justify-center w-14 h-14 rounded-2xl public-theme-icon-box public-theme-icon-shadow"
                            aria-hidden="true"
                        >
                            <i class="pi pi-box text-xl"></i>
                        </span>
                        <h2
                            id="public-home-modules-title"
                            class="text-surface-900 dark:text-surface-0 text-2xl md:text-4xl font-bold text-center"
                        >
                            Modül vitrini
                        </h2>
                        <p class="text-muted-color text-center">Panelde kullanılabilen temel modüller.</p>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                        @for (mod of modules; track mod.title) {
                            <div
                                class="group public-theme-module-card rounded-3xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 py-5 px-3 flex flex-col items-center text-center gap-2.5 transition-all"
                            >
                                <span
                                    class="public-theme-module-icon inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 transition-colors"
                                    aria-hidden="true"
                                >
                                    <i [class]="mod.icon"></i>
                                </span>
                                <span class="text-surface-900 dark:text-surface-0 text-xs md:text-sm font-medium leading-tight">{{
                                    mod.title
                                }}</span>
                            </div>
                        }
                    </div>
                </section>

                <!-- CTA — Genesis gradient kart -->
                <section class="max-w-6xl mx-auto px-4 mb-12 md:mb-16" aria-labelledby="public-home-cta-title">
                    <div
                        class="public-final-cta-card relative overflow-hidden rounded-3xl lg:rounded-[2rem] public-theme-gradient-cta p-8 md:p-14 text-center"
                    >
                        <div
                            class="public-final-cta-card-glow pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_55%)]"
                            aria-hidden="true"
                        ></div>
                        <div class="relative max-w-2xl mx-auto">
                            <h2
                                id="public-home-cta-title"
                                class="public-cta-title text-2xl md:text-4xl font-bold m-0 mb-4 leading-tight"
                            >
                                Kliniğinizi dijital olarak yönetmeye başlayın
                            </h2>
                            <p class="public-cta-lead m-0 mb-8 text-base md:text-lg">
                                Ücretsiz deneme ile kayıt olun veya paketleri inceleyerek size uygun planı seçin.
                            </p>
                            <div class="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
                                <div class="public-hero-cta-primary w-full sm:w-auto">
                                    <a
                                        routerLink="/auth/signup"
                                        pButton
                                        pRipple
                                        label="Hemen başla"
                                        class="w-full"
                                    ></a>
                                </div>
                                <div class="public-hero-cta-secondary public-home-cta-secondary w-full sm:w-auto">
                                    <a
                                        routerLink="/pricing"
                                        pButton
                                        pRipple
                                        label="Paketleri gör"
                                        class="w-full"
                                    ></a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- SSS — Genesis ölçü: 784×66.5px kart -->
                <section id="faq" class="scroll-mt-24">
                    <div class="mx-auto w-full max-w-[784px] px-4 md:px-0 mt-14 lg:mt-36 pb-16 lg:pb-24">
                        <div
                            class="w-14 h-14 lg:w-20 lg:h-20 flex items-center justify-center mx-auto rounded-2xl lg:rounded-3xl public-theme-icon-box public-theme-icon-shadow"
                            aria-hidden="true"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 40 40"
                                fill="none"
                                class="w-9 h-9 lg:w-11 lg:h-11"
                            >
                                <path
                                    d="M1.6975 25.8594H11.7969C18.2582 25.8594 23.5156 20.602 23.5156 14.1406C23.5156 7.6793 18.2582 2.42188 11.7969 2.42188C5.33555 2.42188 0 7.6793 0 14.1406C0 17.2294 1.29578 20.1774 3.44609 22.362L1.6975 25.8594ZM12.9688 21.1719H10.625V18.8281H12.9688V21.1719ZM11.7969 7.10938C14.3821 7.10938 16.4844 9.21164 16.4844 11.7969C16.4844 13.5478 15.5196 15.1409 13.9666 15.9522C13.351 16.2749 12.9688 16.9627 12.9688 17.6562H10.625C10.625 16.0289 11.4891 14.603 12.8795 13.8762C13.6577 13.4688 14.1406 12.6723 14.1406 11.7969C14.1406 10.5048 13.0889 9.45312 11.7969 9.45312C10.5048 9.45312 9.45312 10.5048 9.45312 11.7969H7.10938C7.10938 9.21164 9.21164 7.10938 11.7969 7.10938Z"
                                    fill="url(#public-home-faq-icon-a)"
                                />
                                <path
                                    d="M25.8469 14.3862C25.7433 20.3324 21.9345 25.3776 16.6328 27.3284C17.3649 33.0912 22.2447 37.5781 28.203 37.5781H38.3024L36.5538 34.0808C38.7041 31.8962 39.9999 28.9481 39.9999 25.8594C39.9999 19.3873 34.6751 14.1406 28.203 14.1406C27.3966 14.1406 26.6088 14.2257 25.8469 14.3862ZM34.0624 29.375H24.6874V27.0312H34.0624V29.375ZM34.0624 24.6875H24.6874V22.3438H34.0624V24.6875Z"
                                    fill="url(#public-home-faq-icon-b)"
                                />
                                <defs>
                                    <linearGradient id="public-home-faq-icon-a" x1="11.7578" y1="2.71499" x2="11.7578" y2="25.8594" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="white" />
                                        <stop offset="1" stop-color="white" stop-opacity="0" />
                                    </linearGradient>
                                    <linearGradient id="public-home-faq-icon-b" x1="28.3164" y1="14.4337" x2="28.3164" y2="37.5781" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="white" />
                                        <stop offset="1" stop-color="white" stop-opacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <h2
                            id="public-home-faq-title"
                            class="mt-8 text-center text-xl lg:text-3xl font-semibold text-surface-950 dark:text-surface-0 leading-tight m-0"
                        >
                            Sık sorulan<br />sorular
                        </h2>
                        <p class="mx-auto mt-4 max-w-[640px] text-center text-base text-surface-500 dark:text-white/64 m-0">
                            Vetinity platformu hakkında merak edilen konulara kısa yanıtlar.
                        </p>

                        <div class="mt-12 flex w-full flex-col gap-3">
                            @for (faq of faqs; track faq.question; let i = $index) {
                                <article
                                    class="w-full overflow-hidden rounded-[22px] border border-surface-200 bg-surface-0 shadow-none dark:border-surface-700 dark:bg-surface-900"
                                >
                                    <button
                                        type="button"
                                        class="flex h-[66px] w-full items-center justify-between border-0 bg-surface-0 px-8 md:px-10 text-left cursor-pointer dark:bg-surface-900"
                                        [attr.aria-expanded]="isFaqOpen(i)"
                                        [attr.aria-controls]="'faq-answer-' + i"
                                        (click)="toggleFaq(i)"
                                    >
                                        <span
                                            class="text-[15px] md:text-[17px] font-semibold leading-[1.2] text-surface-950 dark:text-surface-0"
                                        >
                                            {{ faq.question }}
                                        </span>
                                        <i
                                            class="pi ml-6 shrink-0 text-[22px] text-surface-500"
                                            [class.pi-plus]="!isFaqOpen(i)"
                                            [class.pi-minus]="isFaqOpen(i)"
                                            aria-hidden="true"
                                        ></i>
                                    </button>
                                    @if (isFaqOpen(i)) {
                                        <div [id]="'faq-answer-' + i" class="px-8 md:px-10 pb-5">
                                            <p class="m-0 text-base font-medium text-surface-500 dark:text-white/64">
                                                {{ faq.answer }}
                                            </p>
                                        </div>
                                    }
                                </article>
                            }
                        </div>
                    </div>
                </section>
            </main>

            <app-public-footer />
        </div>
    `,
})
export class PublicHomePageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly features = PUBLIC_HOME_FEATURES;
    readonly stats = PUBLIC_HOME_STATS;
    readonly whyItems = PUBLIC_HOME_WHY;
    readonly modules = PUBLIC_HOME_MODULES;
    readonly faqs = PUBLIC_HOME_FAQS;
    readonly previewMetrics = PUBLIC_HOME_PREVIEW_METRICS;
    readonly previewTasks = PUBLIC_HOME_PREVIEW_TASKS;

    openFaqIndex: number | null = null;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_HOME_PAGE_META, this.document);
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
    }

    toggleFaq(index: number): void {
        this.openFaqIndex = this.openFaqIndex === index ? null : index;
    }

    isFaqOpen(index: number): boolean {
        return this.openFaqIndex === index;
    }
}
