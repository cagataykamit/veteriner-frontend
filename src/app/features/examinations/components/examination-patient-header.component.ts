import { Component, computed, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientDetailVm } from '@/app/entities/client/models/client-vm.model';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { formatPetAgeTr } from '@/app/features/examinations/utils/pet-age.utils';
import type { PetDetailVm } from '@/app/entities/pet/models/pet-vm.model';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { speciesEmoji } from '@/app/shared/utils/species-icon.utils';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

const EM = '—';

/**
 * Hasta satırı (muayene kimlik kartının içinde; müşteri/hasta kartıyla aynı dil): hasta (tür simgesi, tür · ırk · yaş, uyarı rozetleri)
 * ve sahip (telefon, e-posta). Veri `GET /pets/{id}` ve `GET /clients/{id}` ile alınır; yüklenemeyen/olmayan alan `—` gösterilir.
 */
@Component({
    selector: 'app-examination-patient-header',
    standalone: true,
    host: { class: 'block' },
    imports: [RouterLink, PetAlertBadgesComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section aria-label="Hasta bilgileri" class="mt-3">
            <p class="m-0 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span class="min-w-0">
                    <span class="text-muted-color">Hasta:</span>
                    <span class="ml-1" [title]="speciesBreed()" aria-hidden="true">{{ speciesIcon() }}</span>
                    @if (petId()) {
                        <a [routerLink]="['/panel/pets', petId()]" class="text-primary font-semibold no-underline ml-1">{{ petName() }}</a>
                    } @else {
                        <span class="ml-1 font-medium">{{ petName() }}</span>
                    }
                    <span class="text-muted-color text-sm"> · {{ speciesBreed() }} · {{ age() }}</span>
                </span>
                <span class="min-w-0">
                    <span class="text-muted-color">Sahip:</span>
                    @if (clientId()) {
                        <a [routerLink]="['/panel/clients', clientId()]" class="text-primary font-medium no-underline ml-1">{{ clientName() }}</a>
                    } @else {
                        <span class="ml-1">{{ clientName() }}</span>
                    }
                    <span class="text-muted-color text-sm"> · {{ phone() }} · {{ email() }}</span>
                </span>
            </p>
            @if (petAlerts().flags.length > 0) {
                <app-pet-alert-badges class="block mt-2" [alerts]="petAlerts()" />
            }
            @if (loadError()) {
                <p class="field-empty mt-2 mb-0" role="status">{{ loadError() }}</p>
            }
        </section>
    `
})
export class ExaminationPatientHeaderComponent {
    private readonly petsService = inject(PetsService);
    private readonly clientsService = inject(ClientsService);

    readonly petId = input<string | null>(null);
    readonly clientId = input<string | null>(null);
    /** Muayene detayındaki ad (yüklenene kadar / hata halinde yedek). */
    readonly fallbackPetName = input<string | null>(null);
    readonly fallbackClientName = input<string | null>(null);

    private readonly pet = signal<PetDetailVm | null>(null);
    private readonly client = signal<ClientDetailVm | null>(null);
    readonly loadError = signal<string | null>(null);

    private petSeq = 0;
    private clientSeq = 0;

    readonly petName = computed(() => this.pet()?.name ?? (this.fallbackPetName()?.trim() || EM));
    readonly petAlerts = computed(() => this.pet()?.petAlerts ?? NO_PET_ALERTS);
    readonly speciesIcon = computed(() => speciesEmoji(this.pet()?.speciesName));
    readonly clientName = computed(() => this.client()?.fullName ?? (this.fallbackClientName()?.trim() || EM));
    readonly speciesBreed = computed(() => {
        const p = this.pet();

        if (!p) {
            return EM;
        }

        const parts = [p.speciesName, p.breed].filter((x) => x && x !== EM);

        return parts.length ? parts.join(' · ') : EM;
    });
    readonly age = computed(() => formatPetAgeTr(this.pet()?.birthDate) ?? EM);
    readonly phone = computed(() => formatClientPhoneForDisplay(this.client()?.phone ?? EM));
    readonly email = computed(() => this.client()?.email ?? EM);

    constructor() {
        effect(() => {
            const id = this.petId()?.trim() ?? '';
            const seq = ++this.petSeq;

            this.pet.set(null);

            if (!id) {
                return;
            }

            this.petsService.getPetById(id).subscribe({
                next: (p) => {
                    if (seq === this.petSeq) {
                        this.pet.set(p);
                    }
                },
                error: () => {
                    if (seq === this.petSeq) {
                        this.loadError.set('Hasta bilgileri tam yüklenemedi.');
                    }
                }
            });
        });
        effect(() => {
            const id = this.clientId()?.trim() ?? '';
            const seq = ++this.clientSeq;

            this.client.set(null);

            if (!id) {
                return;
            }

            this.clientsService.getClientById(id).subscribe({
                next: (c) => {
                    if (seq === this.clientSeq) {
                        this.client.set(c);
                    }
                },
                error: () => {
                    if (seq === this.clientSeq) {
                        this.loadError.set('Sahip bilgileri tam yüklenemedi.');
                    }
                }
            });
        });
    }
}
