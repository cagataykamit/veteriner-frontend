import { Component, computed, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { formatPetAgeTr } from '@/app/features/examinations/utils/pet-age.utils';
import type { PetDetailVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

const EM = '—';

/**
 * Hasta başlığı: hasta, sahip, tür/ırk, yaş, iletişim.
 * Veri `GET /pets/{id}` ve `GET /clients/{id}` ile alınır; yüklenemeyen/olmayan alan `—` gösterilir.
 * `card` sınıfı host'tadır: iç öğede olsaydı tek çocuk olduğu için `.card:last-child` alt boşluğu sıfırlar,
 * kart alttaki alana yapışırdı. Host'ta kartlar arası standart `.card` boşluğu sayfadaki kardeşine uygulanır.
 */
@Component({
    selector: 'app-examination-patient-header',
    standalone: true,
    host: { class: 'card block' },
    imports: [RouterLink, PetAlertBadgesComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <section aria-label="Hasta bilgileri">
            <dl class="m-0 grid grid-cols-12 gap-x-4 gap-y-3">
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                    <dt class="text-sm text-muted-color">Hasta</dt>
                    <dd class="m-0 font-medium">
                        @if (petId()) {
                            <a [routerLink]="['/panel/pets', petId()]" class="text-primary no-underline">{{ petName() }}</a>
                        } @else {
                            {{ petName() }}
                        }
                        <app-pet-alert-badges class="block mt-1" [alerts]="petAlerts()" />
                    </dd>
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                    <dt class="text-sm text-muted-color">Tür / ırk</dt>
                    <dd class="m-0">{{ speciesBreed() }}</dd>
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                    <dt class="text-sm text-muted-color">Yaş</dt>
                    <dd class="m-0">{{ age() }}</dd>
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                    <dt class="text-sm text-muted-color">Sahip</dt>
                    <dd class="m-0 font-medium">
                        @if (clientId()) {
                            <a [routerLink]="['/panel/clients', clientId()]" class="text-primary no-underline">{{ clientName() }}</a>
                        } @else {
                            {{ clientName() }}
                        }
                    </dd>
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                    <dt class="text-sm text-muted-color">Telefon</dt>
                    <dd class="m-0">{{ phone() }}</dd>
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                    <dt class="text-sm text-muted-color">E-posta</dt>
                    <dd class="m-0 break-all">{{ email() }}</dd>
                </div>
            </dl>
            @if (loadError()) {
                <p class="text-sm text-muted-color mt-3 mb-0" role="status">{{ loadError() }}</p>
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
