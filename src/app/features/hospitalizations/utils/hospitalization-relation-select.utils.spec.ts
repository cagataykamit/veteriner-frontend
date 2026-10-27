import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import type { TodayItemVm } from '@/app/entities/visit/models/visit-vm.model';
import { FINALIZED_EXAMINATION_OPTION_HINT, hospitalizationExaminationOption, hospitalizationVisitOptions } from '@/app/features/hospitalizations/utils/hospitalization-relation-select.utils';

function exam(status: ExaminationListItemVm['status']): ExaminationListItemVm {
    return {
        id: 'e1',
        status,
        clinicId: 'c',
        clinicName: null,
        examinedAtUtc: '2026-10-10T08:00:00Z',
        clientId: 'cl',
        clientName: 'Ayşe',
        petId: 'p1',
        petName: 'Pamuk',
        appointmentId: null,
        visitReason: 'Kontrol'
    };
}

function visit(over: Partial<TodayItemVm>): TodayItemVm {
    return { visitId: 'v1', petId: 'p1', petName: 'Pamuk', arrivedAtUtc: '2026-10-13T08:30:00Z', isVoided: false, ...over } as TodayItemVm;
}

describe('hospitalization-relation-select.utils', () => {
    it('kesinleşmiş muayene açıklamayla pasif, taslak seçilebilir', () => {
        const finalized = hospitalizationExaminationOption(exam('Finalized'));

        expect(finalized.disabled).toBe(true);
        expect(finalized.label).toContain(FINALIZED_EXAMINATION_OPTION_HINT);
        const draft = hospitalizationExaminationOption(exam('Draft'));

        expect(draft.disabled).toBeUndefined();
        expect(draft.label).not.toContain(FINALIZED_EXAMINATION_OPTION_HINT);
    });

    it('geliş seçenekleri yalnız seçili hayvanın yanlış işaretlenmemiş gelişleridir', () => {
        const items = [visit({}), visit({ visitId: 'v2', petId: 'p2' }), visit({ visitId: 'v3', isVoided: true }), visit({ visitId: null })];

        expect(hospitalizationVisitOptions(items, 'p1').map((o) => o.value)).toEqual(['v1']);
    });

    it('kayıtlı geliş bugünden değilse seçenek olarak korunur', () => {
        const opts = hospitalizationVisitOptions([visit({})], 'p1', 'old');

        expect(opts.map((o) => o.value)).toEqual(['old', 'v1']);
        expect(hospitalizationVisitOptions([visit({})], 'p1', 'v1').map((o) => o.value)).toEqual(['v1']);
    });
});
