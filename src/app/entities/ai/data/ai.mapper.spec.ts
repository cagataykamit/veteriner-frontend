import { mapAiDraftDtoToVm, mapAiProvenanceDtosToVm, mapAiSourceToVm, mapAiStatusDtoToVm, mapPetHistorySummaryDtoToVm, petHistorySummaryToPlainText } from '@/app/entities/ai/data/ai.mapper';
import type { PetHistorySummaryDto } from '@/app/entities/ai/models/ai-api.model';
import { aiRecordCountsLabel, aiTypeListLabel } from '@/app/entities/ai/utils/ai-labels';

const summaryDto: PetHistorySummaryDto = {
    petId: 'p1',
    status: 'Generated',
    isDraft: true,
    generatedAtUtc: '2026-11-19T11:32:00Z',
    model: 'claude-haiku-5-5',
    coverage: {
        fromUtc: '2026-03-02T08:00:00Z',
        toUtc: '2026-11-10T10:30:00Z',
        recordCount: 14,
        recordCounts: { LabResult: 2, Vaccination: 4, Examination: 5, Prescription: 3 },
        omittedTypes: [],
        truncated: false
    },
    sections: [
        { kind: 'Alerts', title: 'Uyarılar', items: [{ text: ' Penisilin alerjisi kayıtlı. ', sources: [{ type: 'Pet', id: 'p1', occurredAtUtc: null }] }] },
        { kind: 'RecentVisits', title: 'Son muayeneler (backend)', items: [{ text: '10 Kas: kulak kaşıntısı.', sources: [{ type: 'Examination', id: 'e1', occurredAtUtc: '2026-11-10T10:30:00Z' }] }] },
        { kind: 'Medications', title: 'İlaçlar', items: [{ text: '   ', sources: [] }] },
        { kind: 'NewKind', title: 'Yeni bölüm', items: [{ text: 'Bir madde', sources: null }] }
    ],
    droppedItemCount: 1
};

describe('ai.mapper', () => {
    it('durum: kod kırpılır, yüzde sayı değilse 0', () => {
        expect(mapAiStatusDtoToVm({ isAvailable: false, unavailableCode: ' Ai.ClinicQuotaExceeded ', isConfigured: true, isClinicEnabled: true, clinicMonthUsedPercent: 100 })).toEqual({
            isAvailable: false,
            unavailableCode: 'Ai.ClinicQuotaExceeded',
            clinicMonthUsedPercent: 100
        });
        expect(mapAiStatusDtoToVm({ isAvailable: true, unavailableCode: null, isConfigured: true, isClinicEnabled: true, clinicMonthUsedPercent: Number.NaN }).clinicMonthUsedPercent).toBe(0);
    });

    it('kaynak: Pet hasta kartına, zaman çizelgesi türü detay sayfasına gider ve kısa tarih taşır', () => {
        expect(mapAiSourceToVm({ type: 'Pet', id: 'p1', occurredAtUtc: null })).toEqual({ type: 'Pet', id: 'p1', label: 'Hasta kartı', icon: 'pi-id-card', link: ['/panel/pets', 'p1'] });
        expect(mapAiSourceToVm({ type: 'Examination', id: 'e1', occurredAtUtc: '2026-11-10T10:30:00Z' })).toEqual({
            type: 'Examination',
            id: 'e1',
            label: 'Muayene · 10 Kas',
            icon: 'pi-file-edit',
            link: ['/panel/examinations', 'e1']
        });
        expect(mapAiSourceToVm({ type: 'LabResult', id: 'l1', occurredAtUtc: '2026-09-14T21:30:00Z' }).label).toBe('Laboratuvar · 15 Eyl');
    });

    it('kaynak: detay sayfası olmayan ya da bilinmeyen tür bağlantısız kalır', () => {
        expect(mapAiSourceToVm({ type: 'Administration', id: 'a1', occurredAtUtc: null }).link).toBeNull();
        expect(mapAiSourceToVm({ type: 'Future', id: 'f1' })).toEqual({ type: 'Future', id: 'f1', label: 'Future', icon: 'pi-circle', link: null });
    });

    it('özet: arayüz başlığı, uyarı bölümü, boş madde/bölüm atılır, kapsam etiketleri kurulur', () => {
        const vm = mapPetHistorySummaryDtoToVm(summaryDto);

        expect(vm.hasRecords).toBe(true);
        expect(vm.sections.map((s) => [s.kind, s.title, s.isAlert])).toEqual([
            ['Alerts', 'Uyarılar', true],
            ['RecentVisits', 'Son muayeneler', false],
            ['NewKind', 'Yeni bölüm', false]
        ]);
        expect(vm.sections[0].items[0]).toEqual({ text: 'Penisilin alerjisi kayıtlı.', sources: [expect.objectContaining({ label: 'Hasta kartı' })] });
        expect(vm.sections[2].items[0].sources).toEqual([]);
        expect(vm.coverage).toEqual({
            fromUtc: '2026-03-02T08:00:00Z',
            toUtc: '2026-11-10T10:30:00Z',
            recordCount: 14,
            countsLabel: '5 muayene · 3 reçete · 4 aşı · 2 laboratuvar',
            omittedTypesLabel: null,
            truncated: false
        });
        expect(vm.droppedItemCount).toBe(1);
    });

    it('özet: NoRecords kayıt yok olarak, yetkisiz türler küçük harfli listeyle gelir', () => {
        const vm = mapPetHistorySummaryDtoToVm({
            ...summaryDto,
            status: 'NoRecords',
            sections: [],
            coverage: { recordCount: 0, recordCounts: {}, omittedTypes: ['LabResult', 'Vaccination'], truncated: true },
            droppedItemCount: -1
        });

        expect(vm.hasRecords).toBe(false);
        expect(vm.sections).toEqual([]);
        expect(vm.coverage.omittedTypesLabel).toBe('laboratuvar ve aşı');
        expect(vm.coverage.truncated).toBe(true);
        expect(vm.coverage.countsLabel).toBe('');
        expect(vm.droppedItemCount).toBe(0);
    });

    it('etiketler: tür listesi ve sayılar', () => {
        expect(aiTypeListLabel(['LabResult'])).toBe('laboratuvar');
        expect(aiTypeListLabel(['LabResult', 'Vaccination', 'Hospitalization'])).toBe('laboratuvar, aşı ve yatış');
        expect(aiRecordCountsLabel({ Treatment: 1, Hospitalization: 0 })).toBe('1 tedavi');
        expect(aiRecordCountsLabel(null)).toBe('');
    });

    it('kopyalanan metin: taslak ibaresi, bölüm başlığı, madde ve kaynak tarihleri', () => {
        const text = petHistorySummaryToPlainText(mapPetHistorySummaryDtoToVm(summaryDto));

        expect(text.split('\n')).toEqual([
            'Geçmiş özeti (AI taslağı, kontrol edin)',
            '',
            'UYARILAR',
            '- Penisilin alerjisi kayıtlı. (Hasta kartı)',
            '',
            'SON MUAYENELER',
            '- 10 Kas: kulak kaşıntısı. (Muayene · 10 Kas)',
            '',
            'YENİ BÖLÜM',
            '- Bir madde'
        ]);
    });

    it('taslak: kaynaklar çipe çevrilir, karar alanları boşsa null', () => {
        const vm = mapAiDraftDtoToVm({
            id: 'd1',
            feature: 'ExamNoteStructure',
            status: 'Draft',
            targetType: 'Examination',
            targetId: 'e1',
            sources: [{ type: 'Examination', id: 'e1' }],
            content: { fields: { plan: 'Kontrol' } },
            createdByUserId: 'u1',
            createdAtUtc: '2026-11-19T09:00:00Z',
            expiresAtUtc: '2026-12-19T09:00:00Z'
        });

        expect(vm.sources).toEqual([{ type: 'Examination', id: 'e1', label: 'Muayene', icon: 'pi-file-edit', link: ['/panel/examinations', 'e1'] }]);
        expect(vm.content).toEqual({ fields: { plan: 'Kontrol' } });
        expect([vm.decidedByUserId, vm.decidedAtUtc, vm.appliedRecordId]).toEqual([null, null, null]);
    });

    it('iz: ad kırpılır, taslak kimliksiz satır atlanır; kayıt kabulden sonra değiştiyse "düzenlendi"', () => {
        const dto = { draftId: 'd1', feature: 'DischargeInstructions', edited: false, acceptedByUserId: 'u1', acceptedByName: ' Dr. Ayşe Kaya ', acceptedAtUtc: '2026-11-19T14:36:00Z' };

        expect(mapAiProvenanceDtosToVm([dto, { ...dto, draftId: '' }])).toEqual([{ draftId: 'd1', feature: 'DischargeInstructions', edited: false, acceptedByName: 'Dr. Ayşe Kaya', acceptedAtUtc: '2026-11-19T14:36:00Z' }]);
        // Kabul kaydı aynı istekte yazar: saniyenin altı sayılmaz; sonradan düzeltme "düzenlendi".
        expect(mapAiProvenanceDtosToVm([dto], '2026-11-19T14:36:00.400Z')[0].edited).toBe(false);
        expect(mapAiProvenanceDtosToVm([dto], '2026-11-19T15:10:00Z')[0].edited).toBe(true);
        expect(mapAiProvenanceDtosToVm([{ ...dto, edited: true }])[0].edited).toBe(true);
        expect(mapAiProvenanceDtosToVm(null)).toEqual([]);
    });
});
