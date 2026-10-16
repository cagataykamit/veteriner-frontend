import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
    PUBLIC_CONTACT_CARD_ROWS,
    PUBLIC_CONTACT_MAIL_BODY,
    PUBLIC_CONTACT_PENDING_LABEL,
    publicContactMailto
} from '@/app/features/public/utils/public-contact-content.utils';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_CONTACT_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicPageHeaderComponent } from './components/public-page-header.component';

/**
 * İletişim ve demo (tasarım belgesi 5.7): form yerine `mailto:` + telefon (backend ucu yok). İletişim bilgileri AK-6
 * kararına kadar açıkça işaretli yer tutucudur; harita yok.
 */
@Component({
    selector: 'app-public-contact-page',
    standalone: true,
    imports: [RouterLink, PublicPageHeaderComponent],
    template: `
        <app-public-page-header
            eyebrow="İletişim"
            title="Demo isteyin ya da bize yazın"
            lead="Demo, pilot dönemi fiyatı ya da geçiş dosyanız için tek adres. Bir iş günü içinde dönmeyi hedefliyoruz."
        />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <div class="public-section grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
                <section class="public-card p-6 md:p-8" aria-labelledby="contact-write-title">
                    <h2 id="contact-write-title" class="public-h2 m-0">E-posta ile yazın</h2>
                    <p class="public-lead m-0 mt-3">Aşağıdaki bilgileri e-postanıza ekleyin; demo istiyorsanız belirtin, uygun saati birlikte seçelim.</p>
                    <pre class="public-mail-template m-0 mt-5 whitespace-pre-wrap text-sm">{{ mailBody }}</pre>
                    <div class="mt-6">
                        @if (mailto) {
                            <a [href]="mailto" class="public-btn public-btn-primary w-full sm:w-auto">E-posta yaz</a>
                        } @else {
                            <p class="public-pending-placeholder m-0 text-sm" role="note">E-posta adresi: {{ pendingLabel }}</p>
                        }
                    </div>
                    <p class="m-0 mt-5 text-sm text-muted-color">
                        Hemen denemek isterseniz:
                        <a routerLink="/auth/signup" class="public-brand-link">14 gün ücretsiz başlayın</a>, kart gerekmez.
                    </p>
                </section>

                <section class="public-card p-6 md:p-8" aria-labelledby="contact-card-title">
                    <h2 id="contact-card-title" class="public-h2 m-0">İletişim bilgileri</h2>
                    <dl class="m-0 mt-5 grid grid-cols-1 gap-4">
                        @for (row of rows; track row.label) {
                            <div class="flex items-start gap-3">
                                <span class="public-step-badge shrink-0" aria-hidden="true"><i [class]="row.icon"></i></span>
                                <div>
                                    <dt class="text-xs font-semibold uppercase tracking-wide text-muted-color">{{ row.label }}</dt>
                                    <dd class="m-0 mt-0.5 text-base text-surface-900 dark:text-surface-0">
                                        @if (row.value) {
                                            {{ row.value }}
                                        } @else {
                                            <span class="public-pending-placeholder">{{ pendingLabel }}</span>
                                        }
                                    </dd>
                                </div>
                            </div>
                        }
                    </dl>
                    <p class="m-0 mt-6 text-sm text-muted-color">
                        Yanıtlar <a [routerLink]="paths.faq" class="public-brand-link">sık sorulan sorularda</a> da olabilir.
                    </p>
                </section>
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
    readonly mailto = publicContactMailto();
    readonly mailBody = PUBLIC_CONTACT_MAIL_BODY;
    readonly pendingLabel = PUBLIC_CONTACT_PENDING_LABEL;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_CONTACT_PAGE_META, this.document);
    }
}
