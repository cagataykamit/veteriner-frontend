import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalCalendarDate, formatPortalDay } from '@portal/app/shared/format/portal-date';
import { genderLabel } from '@portal/app/shared/format/portal-labels';
import { formatPortalWeight } from '@portal/app/shared/format/portal-money';
import { PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { isDeceased, PortalPetDetail, PortalPetsApi, PortalPetVaccinations, PortalVaccinationHistoryItem } from './portal-pets.api';

interface PetInfoRow {
    readonly label: string;
    readonly value: string;
}

/**
 * Hayvan detayı: temel bilgiler, yaklaşan aşılar ve aşı geçmişi (sözleşme §6.2, §6.3).
 * Gecikmiş işareti sunucunun `isOverdue` alanıdır (ADR-028). Vefat eden hayvanda yaklaşan aşı bölümü ve gecikme
 * işareti gösterilmez; yalnız sade bir not ve geçmiş kalır.
 */
@Component({
    selector: 'portal-pet-detail',
    standalone: true,
    imports: [RouterLink, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-pet-detail.component.html'
})
export class PortalPetDetailComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalPetsApi);

    /** Rota parametresi (`pets/:petId`). */
    readonly petId = input.required<string>();

    readonly pet = portalLoad<PortalPetDetail>();
    readonly vaccinations = portalLoad<PortalPetVaccinations>();

    readonly deceased = computed(() => {
        const pet = this.pet.data();

        return pet ? isDeceased(pet) : false;
    });

    readonly infoRows = computed<PetInfoRow[]>(() => {
        const pet = this.pet.data();

        if (!pet) {
            return [];
        }

        const rows: PetInfoRow[] = [
            { label: 'Tür', value: pet.speciesName ?? '' },
            { label: 'Irk', value: pet.breedName ?? '' },
            { label: 'Cinsiyet', value: genderLabel(pet.gender) },
            { label: 'Doğum tarihi', value: formatPortalCalendarDate(pet.birthDate) },
            { label: 'Kısırlaştırılmış', value: pet.isNeutered ? 'Evet' : 'Hayır' },
            { label: 'Renk', value: pet.colorName ?? '' },
            { label: 'Mikroçip', value: pet.microchipNumber ?? '' },
            { label: 'Son kayıtlı kilo', value: formatPortalWeight(pet.weightKg) }
        ];

        return rows.filter((r) => r.value.trim() !== '');
    });

    constructor() {
        effect(() => {
            const link = this.session.activeLink();
            const petId = this.petId();

            untracked(() => {
                if (link) {
                    this.pet.run(() => this.api.pet(link.linkId, petId));
                    this.vaccinations.run(() => this.api.vaccinations(link.linkId, petId));
                }
            });
        });
    }

    day(utc: string | null): string {
        return formatPortalDay(utc);
    }

    historyDate(item: PortalVaccinationHistoryItem): string {
        return item.status === 'Applied' ? formatPortalDay(item.appliedAtUtc) : formatPortalDay(item.dueAtUtc);
    }
}
