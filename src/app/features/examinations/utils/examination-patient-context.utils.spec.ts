import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import { contextWeight } from './examination-patient-context.utils';

const summary = (over: Partial<PetSummaryVm> = {}): PetSummaryVm => ({
    petId: 'p1',
    petAlerts: NO_PET_ALERTS,
    profileWeightKg: null,
    activeHospitalization: { state: 'Empty', data: null },
    vaccinations: { state: 'Empty', data: null },
    latestWeight: { state: 'Empty', data: null },
    lastVisit: { state: 'Empty', data: null },
    lastExamination: { state: 'Empty', data: null },
    ...over
});

describe('contextWeight', () => {
    it('muayenede ölçülen kilo profil kilosundan önce gelir', () => {
        const w = contextWeight(
            summary({
                profileWeightKg: 4.2,
                latestWeight: { state: 'Ok', data: { weightKg: 4.4, measuredAtUtc: '2026-10-10T08:00:00Z', examinationId: 'e0' } }
            })
        );
        expect(w).toEqual({ weightKg: 4.4, source: 'examination', measuredAtUtc: '2026-10-10T08:00:00Z' });
    });

    it('muayene ölçümü yoksa (veya yetki yoksa) tarihsiz profil kilosu kullanılır; ikisi de yoksa null', () => {
        expect(contextWeight(summary({ profileWeightKg: 4.2, latestWeight: { state: 'Forbidden', data: null } }))).toEqual({
            weightKg: 4.2,
            source: 'profile',
            measuredAtUtc: null
        });
        expect(contextWeight(summary())).toBeNull();
        expect(contextWeight(null)).toBeNull();
    });
});
