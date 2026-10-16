import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { PortalEmptyState, PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { isDeceased, PortalPet, PortalPetsApi } from './portal-pets.api';

/** Hayvanlarım: bağın müşterisinin hayvanları (önce etkin, sonra ada göre; sıra sunucudan, sözleşme §6.2). */
@Component({
    selector: 'portal-pets',
    standalone: true,
    imports: [RouterLink, PortalEmptyState, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="portal-stack">
            <h1 class="portal-title">Hayvanlarım</h1>

            @if (session.activeLink()) {
                @switch (pets.state()) {
                    @case ('loading') {
                        <portal-skeleton [rows]="3" message="Hayvanlarınız yükleniyor…" />
                    }
                    @case ('error') {
                        <portal-error-state [message]="pets.error()" (retry)="pets.retry()" />
                    }
                    @default {
                        @if (pets.data()?.length) {
                            <ul class="portal-list" aria-label="Hayvanlarınız">
                                @for (pet of pets.data(); track pet.petId) {
                                    <li>
                                        <a class="portal-tile" [routerLink]="['/pets', pet.petId]">
                                            <span class="portal-tile-icon" aria-hidden="true"><i class="fa-solid fa-paw"></i></span>
                                            <span class="portal-tile-body">
                                                <span class="portal-tile-value">{{ pet.name }}</span>
                                                <span class="portal-muted">{{ speciesLine(pet) }}</span>
                                                @if (isDeceased(pet)) {
                                                    <span class="portal-memorial">Vefat etti</span>
                                                }
                                            </span>
                                            <i class="fa-solid fa-chevron-right portal-tile-chevron" aria-hidden="true"></i>
                                        </a>
                                    </li>
                                }
                            </ul>
                        } @else {
                            <portal-empty-state title="Kayıtlı hayvanınız yok" message="Kliniğinizde kaydı açıldığında hayvanlarınız burada görünür." />
                        }
                    }
                }
            } @else {
                <portal-empty-state title="Bağlı klinik yok" message="Kliniğinizden yeni bir portal daveti isteyebilirsiniz." icon="fa-hospital" />
            }
        </div>
    `
})
export class PortalPetsComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalPetsApi);

    readonly pets = portalLoad<PortalPet[]>();

    constructor() {
        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                if (link) {
                    this.pets.run(() => this.api.pets(link.linkId));
                }
            });
        });
    }

    isDeceased(pet: PortalPet): boolean {
        return isDeceased(pet);
    }

    /** "Kedi · Tekir"; tür yoksa nötr metin. */
    speciesLine(pet: PortalPet): string {
        return [pet.speciesName, pet.breedName].filter((s) => !!s?.trim()).join(' · ') || 'Tür belirtilmemiş';
    }
}
