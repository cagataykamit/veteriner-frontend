import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { NO_PET_ALERTS, petAlertDefinitions, petAlertsSummary, type PetAlertsVm } from '@/app/shared/pet-alerts/pet-alerts.utils';

/**
 * Hayvan uyarı rozetleri: renge ek olarak ikon + metin etiketi; not `title` ve ekran okuyucu metninde.
 * Uyarı yoksa hiçbir şey çizmez.
 */
@Component({
    selector: 'app-pet-alert-badges',
    standalone: true,
    imports: [TagModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (definitions().length > 0) {
            <span class="inline-flex flex-wrap gap-1 align-middle" role="group" [attr.title]="summary()" [attr.aria-label]="'Hasta uyarıları: ' + summary()">
                @for (d of definitions(); track d.value) {
                    <p-tag [severity]="d.severity" [icon]="'pi ' + d.icon" [value]="d.label" />
                }
                @if (alerts().note; as note) {
                    <span class="sr-only">{{ note }}</span>
                }
            </span>
        }
    `
})
export class PetAlertBadgesComponent {
    readonly alerts = input<PetAlertsVm>(NO_PET_ALERTS);
    protected readonly definitions = computed(() => petAlertDefinitions(this.alerts()));
    protected readonly summary = computed(() => petAlertsSummary(this.alerts()));
}
