import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import { contextWeight, followUpTreatments } from './examination-patient-context.utils';

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

const treatment = (id: string, followUpDateUtc: string | null): TreatmentListItemVm => ({
    id,
    clinicId: null,
    petId: 'p1',
    petName: 'Pamuk',
    clientId: null,
    clientName: 'Ali',
    treatmentDateUtc: '2026-10-01T09:00:00Z',
    title: `Tedavi ${id}`,
    examinationId: null,
    followUpDateUtc
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

describe('followUpTreatments', () => {
    const now = new Date(2026, 9, 14, 15, 0);

    it('takip tarihi bugün veya ileride olanları en yakın önce döner; geçmiş ve takipsiz olanlar dışarıda', () => {
        const rows = followUpTreatments(
            [
                treatment('past', new Date(2026, 9, 13, 12, 0).toISOString()),
                treatment('none', null),
                treatment('later', new Date(2026, 9, 20, 9, 0).toISOString()),
                treatment('today', new Date(2026, 9, 14, 9, 0).toISOString())
            ],
            now
        );
        expect(rows.map((r) => r.id)).toEqual(['today', 'later']);
    });
});
