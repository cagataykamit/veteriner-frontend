import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';

/** Sayfa sonu çağrısı (tasarım belgesi 5.1 #9): lacivert kart, h2, "Ücretsiz dene" + "Demo iste", "Sorunuz mu var?" bağlantısı. */
@Component({
    selector: 'app-public-cta',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="mx-auto max-w-6xl px-4 md:px-6" [attr.aria-labelledby]="headingId()">
            <div class="public-cta-card px-6 py-10 text-center md:px-12 md:py-14">
                <h2 [id]="headingId()" class="public-h2 public-on-brand-text m-0">{{ title() }}</h2>
                @if (lead()) {
                    <p class="m-0 mt-3 text-base public-on-brand-muted md:text-lg">{{ lead() }}</p>
                }
                <div class="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <a routerLink="/auth/signup" class="public-btn public-btn-on-dark w-full sm:w-auto">Ücretsiz dene</a>
                    <a [routerLink]="paths.contact" class="public-btn public-btn-outline-on-dark w-full sm:w-auto">{{ secondaryLabel() }}</a>
                </div>
                <p class="m-0 mt-5 text-sm public-on-brand-subtle">
                    Sorunuz mu var?
                    <a [routerLink]="paths.contact" class="text-white underline underline-offset-2">Bize yazın</a>
                </p>
            </div>
        </section>
    `
})
export class PublicCtaComponent {
    readonly paths = PUBLIC_PATHS;
    readonly title = input<string>('14 gün ücretsiz deneyin');
    readonly lead = input<string>('Kart bilgisi istenmez, satış görüşmesi gerekmez.');
    readonly secondaryLabel = input<string>('Demo iste');
    readonly headingId = input<string>('public-cta-title');
}
