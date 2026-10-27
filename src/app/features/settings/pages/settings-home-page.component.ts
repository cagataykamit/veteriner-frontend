import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { SETTINGS_SECTIONS, visibleGroups } from '@/app/core/routing/panel-navigation';
import { NavigationCardsComponent } from '@/app/shared/ui/navigation-cards/navigation-cards.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-settings-home-page',
    standalone: true,
    imports: [AppPageHeaderComponent, NavigationCardsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="Ayarlar" description="Hesap, klinik, iletişim ve tanım ayarları." />

        @for (section of sections; track section.label) {
            <h5 class="mt-0 mb-3">{{ section.label }}</h5>
            <app-navigation-cards [entries]="section.entries" class="block mb-6" />
        }
    `
})
export class SettingsHomePageComponent {
    private readonly auth = inject(AuthService);

    readonly sections = visibleGroups(SETTINGS_SECTIONS, (claim) => this.auth.hasOperationClaim(claim));
}
