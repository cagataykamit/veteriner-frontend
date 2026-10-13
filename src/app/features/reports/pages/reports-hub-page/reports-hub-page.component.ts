import { Component, inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { REPORT_SECTIONS, visibleGroups } from '@/app/core/routing/panel-navigation';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { NavigationCardsComponent } from '@/app/shared/ui/navigation-cards/navigation-cards.component';

/** Rapor Merkezi: erişilebilen raporları gruplanmış kartlarla listeler (ADR-003). */
@Component({
    selector: 'app-reports-hub-page',
    standalone: true,
    imports: [AppPageHeaderComponent, NavigationCardsComponent],
    template: `
        <app-page-header title="Raporlar" description="Randevu, klinik ve para raporlarına buradan ulaşın." />

        @for (section of sections; track section.label) {
            <h5 class="mt-0 mb-3">{{ section.label }}</h5>
            <app-navigation-cards [entries]="section.entries" class="block mb-6" />
        }
    `
})
export class ReportsHubPageComponent {
    private readonly auth = inject(AuthService);

    readonly sections = visibleGroups(REPORT_SECTIONS, (claim) => this.auth.hasOperationClaim(claim));
}
