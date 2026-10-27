import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { DEFINITION_ENTRIES, SETTINGS_ROUTE, visibleEntries } from '@/app/core/routing/panel-navigation';
import { NavigationCardsComponent } from '@/app/shared/ui/navigation-cards/navigation-cards.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-definitions-page',
    standalone: true,
    imports: [AppPageHeaderComponent, NavigationCardsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header [categoryLink]="settingsRoute" categoryLinkLabel="Ayarlar" title="Tanımlar" description="Tür, ırk, ürün kategorisi, tanı/şikâyet sözlüğü, muayene şablonları ve yatış konumları gibi referans kayıtlarını yönetin." />
        <app-navigation-cards [entries]="entries" />
    `
})
export class DefinitionsPageComponent {
    private readonly auth = inject(AuthService);

    readonly settingsRoute = SETTINGS_ROUTE;
    readonly entries = visibleEntries(DEFINITION_ENTRIES, (claim) => this.auth.hasOperationClaim(claim));
}
