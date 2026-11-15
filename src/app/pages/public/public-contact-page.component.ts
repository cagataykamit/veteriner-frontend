import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { publicSiteToneClass } from '@/app/features/public/utils/public-site-tone.utils';
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

        <div class="ps-wrap">
            <div class="ps-section ps-section--tight ps-contact">
                <app-public-demo-request-form />

                <div class="ps-contact-side">
                    <section class="ps-panel ps-tone-mint" aria-labelledby="contact-try-title">
                        <h2 id="contact-try-title" class="public-h2 ps-h2--small">Kendi verinizle deneyin</h2>
                        <p class="public-lead">Hesabınızı birkaç dakikada açın; 14 gün ücretsiz, kart bilgisi istenmez. Eski programınızdan geçiş dosyanızı aynı gün yükleyebilirsiniz.</p>
                        <div class="ps-actions">
                            <a routerLink="/auth/signup" class="public-btn public-btn-primary">Ücretsiz dene</a>
                            <a [routerLink]="paths.packages" class="public-btn public-btn-secondary">Paketleri inceleyin</a>
                        </div>
                        <p class="ps-small">Yanıtlar <a [routerLink]="paths.faq" class="ps-inline-link">sık sorulan sorularda</a> da olabilir.</p>
                    </section>

                    @if (rows.length > 0) {
                        <section class="ps-card ps-card--plain" aria-labelledby="contact-card-title">
                            <h2 id="contact-card-title" class="public-h2 ps-h2--small">İletişim bilgileri</h2>
                            <dl class="ps-contact-rows">
                                @for (row of rows; track row.label; let i = $index) {
                                    <div [class]="toneOf(i)">
                                        <span class="ps-round ps-round--small" aria-hidden="true"><i [class]="row.icon"></i></span>
                                        <div>
                                            <dt>{{ row.label }}</dt>
                                            <dd>
                                                @if (row.href) {
                                                    <a
                                                        [href]="row.href"
                                                        [attr.target]="row.external ? '_blank' : null"
                                                        [attr.rel]="row.external ? 'noopener noreferrer' : null"
                                                        class="ps-inline-link break-all"
                                                        >{{ row.value }}</a
                                                    >
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

    readonly toneOf = publicSiteToneClass;

    readonly paths = PUBLIC_PATHS;
    readonly rows = PUBLIC_CONTACT_CARD_ROWS;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_CONTACT_PAGE_META, this.document);
    }
}
