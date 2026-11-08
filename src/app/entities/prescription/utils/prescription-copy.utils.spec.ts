import type { PrescriptionEditVm } from '@/app/entities/prescription/models/prescription-vm.model';
import { prescriptionCopyDraft } from './prescription-copy.utils';

const source: PrescriptionEditVm = {
    id: 'rx1',
    clinicId: 'c1',
    clientId: 'cl1',
    petId: 'p1',
    clientName: 'Ali Veli',
    petName: 'Pamuk',
    examinationId: 'e1',
    treatmentId: 't1',
    prescribedAtUtc: '2026-10-30T07:00:00Z',
    title: 'Antibiyotik',
    content: 'Amoksisilin',
    notes: 'Not',
    followUpDateInput: '2026-11-06',
    items: [{ id: 'i1', name: 'Amoksisilin', productId: 'prod-1', instructions: '2x1', quantity: 1, dose: '1 tablet', unit: 'kutu', lotNumber: 'LOT-1' }],
    isCancelled: true
};

describe('prescriptionCopyDraft (RECORD-004)', () => {
    it('hasta, başlık, içerik ve satırlar kopyalanır; satır kimliği ve lot boşalır, bağlar ve tarihler taşınmaz', () => {
        expect(prescriptionCopyDraft(source)).toEqual({
            sourceId: 'rx1',
            sourceTitle: 'Antibiyotik',
            clientId: 'cl1',
            petId: 'p1',
            title: 'Antibiyotik',
            content: 'Amoksisilin',
            items: [{ id: '', name: 'Amoksisilin', productId: 'prod-1', instructions: '2x1', quantity: 1, dose: '1 tablet', unit: 'kutu', lotNumber: '' }]
        });
    });

    it('hasta bilgisi yoksa kopya yok', () => {
        expect(prescriptionCopyDraft({ ...source, petId: '' })).toBeNull();
    });
});
