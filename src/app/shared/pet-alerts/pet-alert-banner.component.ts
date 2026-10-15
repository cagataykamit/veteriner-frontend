import { Component, effect, inject, input, signal } from '@angular/core';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { NO_PET_ALERTS, type PetAlertsVm } from '@/app/shared/pet-alerts/pet-alerts.utils';

/**
 * Formlarda ve detaylarda seçili/ilgili hayvanın kritik uyarıları (alerji, risk): `GET /pets/{id}` ile okunur.
 * Uyarı yoksa veya hayvan yüklenemezse hiçbir şey çizmez; kayıt akışını engellemez.
 */
@Component({
    selector: 'app-pet-alert-banner',
    standalone: true,
    imports: [PetAlertBadgesComponent],
    template: `
        @if (alerts().flags.length > 0) {
            <div class="card mb-4" role="region" aria-label="Hasta uyarıları">
                <app-pet-alert-badges [alerts]="alerts()" />
                @if (alerts().note; as note) {
                    <p class="m-0 mt-2">{{ note }}</p>
                }
            </div>
        }
    `
})
export class PetAlertBannerComponent {
    private readonly petsService = inject(PetsService);

    readonly petId = input<string | null>(null);

    readonly alerts = signal<PetAlertsVm>(NO_PET_ALERTS);

    private seq = 0;

    constructor() {
        effect(() => {
            const id = this.petId()?.trim() ?? '';
            const seq = ++this.seq;

            this.alerts.set(NO_PET_ALERTS);

            if (!id) {
                return;
            }

            this.petsService.getPetById(id).subscribe({
                next: (p) => {
                    if (seq === this.seq) {
                        this.alerts.set(p.petAlerts ?? NO_PET_ALERTS);
                    }
                },
                error: () => undefined
            });
        });
    }
}
