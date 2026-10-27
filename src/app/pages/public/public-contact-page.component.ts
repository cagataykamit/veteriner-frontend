import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PUBLIC_CONTACT_CARD_ROWS } from '@/app/features/public/utils/public-contact-content.utils';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_CONTACT_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicDemoRequestFormComponent } from './components/public-demo-request-form.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';

/**
 * İletişim ve demo (tasarım belgesi 5.7, TRIAL-005): solda canlı demo talep formu (`POST /public/demo-requests`), sağda
 * deneme kartı ve yalnız değeri girilmiş iletişim satırları (AK-6); harita yok.
 */
@Component({
    selector: 'app-public-contact-page',
    standalone: true,
    imports: [RouterLink, PublicPageHeaderComponent, PublicDemoRequestFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-page-header
            eyebrow="İletişim"
            title="Demo isteyin ya da hemen deneyin"
            lead="20 dakikalık görüntülü bir görüşmede Vetinity'yi birlikte gezelim ya da hesabınızı açıp kendiniz deneyin. Bir iş günü içinde dönmeyi hedefliyoruz."
        />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <div class="public-section grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14">
                <app-public-demo-request-form />

                <div class="flex flex-col gap-8">
                    <section class="public-card p-6 md:p-8" aria-labelledby="contact-try-title">
                        <h2 id="contact-try-title" class="public-h2 m-0">Kendi verinizle deneyin</h2>
                        <p class="public-lead m-0 mt-3">
                            Hesabınızı birkaç dakikada açın; 14 gün ücretsiz, kart bilgisi istenmez. Eski programınızdan geçiş dosyanızı aynı gün yükleyebilirsiniz.
                        </p>
                        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
                            <a routerLink="/auth/signup" class="public-btn public-btn-primary w-full sm:w-auto">Ücretsiz dene</a>
                            <a [routerLink]="paths.packages" class="public-btn public-btn-secondary w-full sm:w-auto">Paketleri inceleyin</a>
                        </div>
                        <p class="m-0 mt-5 text-sm text-muted-color">
                            Yanıtlar <a [routerLink]="paths.faq" class="public-brand-link">sık sorulan sorularda</a> da olabilir.
                        </p>
                    </section>

                    @if (rows.length > 0) {
                        <section class="public-card p-6 md:p-8" aria-labelledby="contact-card-title">
                            <h2 id="contact-card-title" class="public-h2 m-0">İletişim bilgileri</h2>
                            <dl class="m-0 mt-5 grid grid-cols-1 gap-4">
                                @for (row of rows; track row.label) {
                                    <div class="flex items-start gap-3">
                                        <span class="public-step-badge shrink-0" aria-hidden="true"><i [class]="row.icon"></i></span>
                                        <div>
                                            <dt class="text-xs font-semibold uppercase tracking-wide text-muted-color">{{ row.label }}</dt>
                                            <dd class="m-0 mt-0.5 text-base text-surface-900 dark:text-surface-0">
                                                @if (row.href) {
                                                    <a [href]="row.href" class="public-brand-link break-all">{{ row.value }}</a>
                                                } @else {
                                                    {{ row.value }}
                                                }
                                            </dd>
                                        </div>
                                    </div>
                                }
                            </dl>
                        </section>
                    }
                </div>
            </div>
        </div>
    `
})
export class PublicContactPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly paths = PUBLIC_PATHS;
    readonly rows = PUBLIC_CONTACT_CARD_ROWS;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_CONTACT_PAGE_META, this.document);
    }
}
