import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { PUBLIC_HOME_FAQS, PUBLIC_HOME_FEATURES } from '@/app/features/public/utils/public-home-content.utils';
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

            <main id="icerik" class="relative">
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
                                <div class="grid grid-cols-1 items-center">
                                    <div class="public-hero mx-auto max-w-3xl text-center">
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
                                            Veteriner kliniğinizin günü tek ekranda
                                        </h1>
                                        <p class="public-hero-lead text-[0.9375rem] md:text-lg m-0 mb-6 md:mb-8 max-w-xl mx-auto leading-relaxed">
                                            Geliş, bekleme, muayene, tahsilat ve kayıt defterleri aynı yerde. 14 gün ücretsiz, kart
                                            gerekmez.
                                        </p>
                                        <div
                                            class="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 sm:gap-3"
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

                                </div>
                            </div>
                        </div>
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
                            Kliniğinizin günlük işleri için hazır olanlar.
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
                                14 gün ücretsiz deneyin
                            </h2>
                            <p class="public-cta-lead m-0 mb-8 text-base md:text-lg">
                                Kart bilgisi istenmez. Paketleri inceleyebilir veya hemen başlayabilirsiniz.
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
                            Vetinity hakkında merak edilenlere kısa yanıtlar.
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
    readonly faqs = PUBLIC_HOME_FAQS;

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
