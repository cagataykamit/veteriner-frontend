import { mapPetHistorySummaryDtoToVm } from '@/app/entities/pet/data/pet.mapper';
import { mapPetSummaryDtoToVm } from '@/app/entities/pet/data/pet-summary.mapper';
import type { PetSummaryDto } from '@/app/entities/pet/models/pet-summary-api.model';

const full: PetSummaryDto = {
    petId: 'p1',
    petAlerts: { flags: ['Allergy'], note: 'Penisiline alerji' },
    profileWeightKg: 4.2,
    activeHospitalization: {
        state: 'Ok',
        data: { id: 'h1', clinicName: 'Merkez', admittedAtUtc: '2026-10-10T08:00:00Z', plannedDischargeAtUtc: null, reason: 'Gözlem', examinationId: null }
    },
    vaccinations: {
        state: 'Ok',
        data: {
            lastApplied: { id: 'v1', vaccineName: 'Kuduz', appliedAtUtc: '2026-01-01T00:00:00Z' },
            nextDue: { id: 'v2', vaccineName: 'Karma', dueAtUtc: '2026-09-01T00:00:00Z', isOverdue: true }
        }
    },
    latestWeight: { state: 'Ok', data: { weightKg: 4.4, measuredAtUtc: '2026-10-01T00:00:00Z', source: 'Examination', examinationId: 'e1' } },
    lastVisit: { state: 'Ok', data: { id: 'vi1', arrivedAtUtc: '2026-10-11T08:30:00Z', careStatus: 'Completed', clinicName: 'Merkez' } },
    lastExamination: { state: 'Ok', data: { id: 'e1', examinedAtUtc: '2026-10-01T00:00:00Z', visitReason: 'Kontrol', clinicName: 'Merkez' } }
};

describe('mapPetSummaryDtoToVm', () => {
    it('dolu yanıtı bölümleriyle eşler ve uyarıları korur', () => {
        const vm = mapPetSummaryDtoToVm(full);

        expect(vm.petAlerts).toEqual({ flags: ['Allergy'], note: 'Penisiline alerji' });
        expect(vm.profileWeightKg).toBe(4.2);
        expect(vm.activeHospitalization.data?.reason).toBe('Gözlem');
        expect(vm.vaccinations.data?.nextDue?.isOverdue).toBe(true);
        expect(vm.latestWeight.data).toEqual({ weightKg: 4.4, measuredAtUtc: '2026-10-01T00:00:00Z', examinationId: 'e1' });
        expect(vm.lastVisit.data?.careStatus).toBe('Completed');
        expect(vm.lastExamination.data?.id).toBe('e1');
    });

    it('Empty, Forbidden ve Unavailable ayrı kalır; data null olur', () => {
        const vm = mapPetSummaryDtoToVm({
            ...full,
            activeHospitalization: { state: 'Empty', data: null },
            vaccinations: { state: 'Forbidden', data: null },
            latestWeight: { state: 'Unavailable', data: null }
        });

        expect(vm.activeHospitalization).toEqual({ state: 'Empty', data: null });
        expect(vm.vaccinations).toEqual({ state: 'Forbidden', data: null });
        expect(vm.latestWeight).toEqual({ state: 'Unavailable', data: null });
        expect(vm.lastVisit.state).toBe('Ok');
    });

    it('bölüm eksik, bilinmeyen state veya verisiz Ok "kayıt yok" sayılmaz; Unavailable olur', () => {
        const vm = mapPetSummaryDtoToVm({
            petId: 'p1',
            vaccinations: { state: 'Weird', data: null },
            latestWeight: { state: 'Ok', data: null },
            lastVisit: { state: 'Ok', data: { arrivedAtUtc: '2026-10-11T08:30:00Z' } }
        });

        expect(vm.activeHospitalization.state).toBe('Unavailable');
        expect(vm.vaccinations.state).toBe('Unavailable');
        expect(vm.latestWeight.state).toBe('Unavailable');
        expect(vm.lastVisit.state).toBe('Unavailable');
        expect(vm.lastExamination.state).toBe('Unavailable');
        expect(vm.petAlerts).toEqual({ flags: [], note: null });
        expect(vm.profileWeightKg).toBeNull();
    });

    it('aşı: yalnız biri doluysa Ok, diğeri null', () => {
        const vm = mapPetSummaryDtoToVm({
            petId: 'p1',
            vaccinations: { state: 'Ok', data: { lastApplied: null, nextDue: { id: 'v2', vaccineName: 'Karma', dueAtUtc: '2027-01-01T00:00:00Z', isOverdue: false } } }
        });

        expect(vm.vaccinations.state).toBe('Ok');
        expect(vm.vaccinations.data?.lastApplied).toBeNull();
        expect(vm.vaccinations.data?.nextDue?.isOverdue).toBe(false);
    });
});

describe('history-summary omittedBlocks', () => {
    it('bilinen blok adlarını sözleşme sırasıyla alır, bilinmeyeni yok sayar; yoksa boş', () => {
        expect(mapPetHistorySummaryDtoToVm({ petId: 'p1', omittedBlocks: ['Payments', 'Examinations', 'Bogus'] }).omittedBlocks).toEqual(['Examinations', 'Payments']);
        expect(mapPetHistorySummaryDtoToVm({ petId: 'p1' }).omittedBlocks).toEqual([]);
    });
});
