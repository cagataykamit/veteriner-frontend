import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { PublicLegalLinksComponent } from './public-legal-links.component';

/**
 * Giriş, kayıt, şifre, klinik seçimi ve davet sayfalarının ortak iskeleti (L-01, kullanıcı kararı A "Tanıtımın devamı"): krem
 * zeminde iki yumuşak renk lekesi, tanıtım üst çubuğu gibi yuvarlak beyaz şerit (logo + Ana sayfa), ortada 28 px köşeli kart,
 * kartın altında hukuki bağlantılar. Sayfa yalnız kart içeriğini verir. Görünüş `public-page-theme.scss`, renkler `public-site.scss`.
 */
@Component({
    selector: 'app-public-auth-shell',
    standalone: true,
    imports: [RouterLink, PublicLegalLinksComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="public-page public-site public-auth-page">
            <span class="ps-blob ps-tone-mint public-auth-blob public-auth-blob--a" aria-hidden="true"></span>
            <span class="ps-blob ps-tone-sun public-auth-blob public-auth-blob--b" aria-hidden="true"></span>

            <header class="public-auth-topbar">
                <a routerLink="/" class="public-auth-topbar-logo" aria-label="Vetinity ana sayfa">
                    <img [src]="brand.compactLockup" alt="" class="block dark:hidden" width="168" height="42" />
                    <img [src]="brand.compactLockupDark" alt="" class="hidden dark:block" width="168" height="42" />
                </a>
                <a routerLink="/" class="public-auth-topbar-home"><i class="pi pi-arrow-left" aria-hidden="true"></i>Ana sayfa</a>
            </header>

            <main class="public-auth-main">
                <div class="public-auth-card" [class.public-auth-card--wide]="wide()">
                    <ng-content />
                </div>
                <app-public-legal-links />
            </main>
        </div>
    `
})
export class PublicAuthShellComponent {
    readonly brand = VETINITY_BRAND_LOGOS;

    /** Kayıt sayfası: paket kartları ve iki sütunlu alanlar için geniş kart. */
    readonly wide = input(false);
}
