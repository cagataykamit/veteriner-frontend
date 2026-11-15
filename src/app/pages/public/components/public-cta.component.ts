import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';

/** Sayfa sonu çağrısı (tasarım belgesi 5.1 #9): her iki temada lacivert yuvarlak kart, h2, "Ücretsiz dene" + "Demo iste", "Sorunuz mu var?" bağlantısı. */
@Component({
    selector: 'app-public-cta',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="ps-section" [attr.aria-labelledby]="headingId()">
            <div class="ps-wrap">
                <div class="ps-cta">
                    <span class="ps-blob ps-blob--a ps-tone-mint" aria-hidden="true"></span>
                    <span class="ps-blob ps-blob--b ps-tone-sun" aria-hidden="true"></span>
                    <h2 [id]="headingId()" class="public-h2">{{ title() }}</h2>
                    @if (lead()) {
                        <p>{{ lead() }}</p>
                    }
                    <div class="ps-actions ps-actions--center">
                        <a routerLink="/auth/signup" class="public-btn public-btn-primary">Ücretsiz dene</a>
                        <a [routerLink]="paths.contact" class="public-btn public-btn-secondary">{{ secondaryLabel() }}</a>
                    </div>
                    <p class="ps-cta-q">
                        Sorunuz mu var?
                        <a [routerLink]="paths.contact">Bize yazın</a>
                    </p>
                </div>
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
