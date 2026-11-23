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
import { joinPresent } from '@/app/shared/utils/labels.utils';

const EM = '—';

/**
 * Hasta satırı (muayene kimlik kartının içinde; müşteri/hasta kartıyla aynı dil): hasta (tür simgesi, tür · ırk · yaş, uyarı rozetleri)
 * ve sahip (telefon, e-posta). Veri `GET /pets/{id}` ve `GET /clients/{id}` ile alınır; ad yoksa `—`, boş ikincil parça yazılmaz.
 */
@Component({
    selector: 'app-examination-patient-header',
    standalone: true,
    host: { class: 'block' },
    imports: [RouterLink, PetAlertBadgesComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section aria-label="Hasta bilgileri" class="mt-3">
            <p class="m-0 flex flex-wrap items-center gap-x-6 gap-y-2 wrap-anywhere">
                <span class="min-w-0">
                    <span class="text-muted-color">Hasta:</span>
                    <span class="ml-1" [title]="speciesBreed()" aria-hidden="true">{{ speciesIcon() }}</span>
                    @if (petId()) {
                        <a [routerLink]="['/panel/pets', petId()]" class="text-primary font-semibold no-underline ml-1">{{ petName() }}</a>
                    } @else {
                        <span class="ml-1 font-medium">{{ petName() }}</span>
                    }
                    @if (petMeta()) {
                        <span class="text-muted-color text-sm"> · {{ petMeta() }}</span>
                    }
                </span>
                <span class="min-w-0">
                    <span class="text-muted-color">Müşteri:</span>
                    @if (clientId()) {
                        <a [routerLink]="['/panel/clients', clientId()]" class="text-primary font-medium no-underline ml-1">{{ clientName() }}</a>
                    } @else {
                        <span class="ml-1">{{ clientName() }}</span>
                    }
                    @if (clientMeta()) {
                        <span class="text-muted-color text-sm"> · {{ clientMeta() }}</span>
                    }
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
    /** Ad yanındaki ikincil parçalar (tür · ırk · yaş, telefon · e-posta): boş parça ayırıcısıyla birlikte yazılmaz (G-05). */
    readonly petMeta = computed(() => {
        const p = this.pet();

        return joinPresent([p?.speciesName, p?.breed, formatPetAgeTr(p?.birthDate)], ' · ');
    });
    readonly clientMeta = computed(() => {
        const c = this.client();

        return joinPresent([formatClientPhoneForDisplay(c?.phone), c?.email], ' · ');
    });

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
                        this.loadError.set('Müşteri bilgileri tam yüklenemedi.');
                    }
                }
            });
        });
    }
}
