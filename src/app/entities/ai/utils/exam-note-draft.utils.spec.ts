import { buildExamNoteTransfer, examNoteTransferSummary, type ExamNoteFormValues, mergeExamNoteText, parseExamNoteDraftContent } from '@/app/entities/ai/utils/exam-note-draft.utils';

const emptyForm: ExamNoteFormValues = { visitReason: '', anamnesis: '', findings: '', assessment: '', plan: '', notes: '', weightKg: null, temperatureC: null, heartRateBpm: null, respiratoryRatePerMin: null };

describe('exam-note-draft.utils', () => {
    it('içerik: fields altında ya da düz okunur; boş metin ve sayı olmayan vital null', () => {
        const nested = parseExamNoteDraftContent({ fields: { visitReason: ' Kaşıntı ', anamnesis: '  ', weightKg: 31.4, temperatureC: '38.6', plan: 7 } });

        expect(nested).toEqual({ visitReason: 'Kaşıntı', anamnesis: null, findings: null, assessment: null, plan: null, notes: null, weightKg: 31.4, temperatureC: null, heartRateBpm: null, respiratoryRatePerMin: null });
        expect(parseExamNoteDraftContent({ notes: 'Ek' }).notes).toBe('Ek');
        expect(parseExamNoteDraftContent(null).visitReason).toBeNull();
    });

    it('birleştirme: sona ekle formdaki metni korur, yerine yaz değiştirir, boş formda yalnız taslak', () => {
        expect(mergeExamNoteText('Kulak kaşıntısı', '2 gündür baş sallama.', 'append')).toBe('Kulak kaşıntısı\n2 gündür baş sallama.');
        expect(mergeExamNoteText('Kulak kaşıntısı', '2 gündür baş sallama.', 'replace')).toBe('2 gündür baş sallama.');
        expect(mergeExamNoteText('   ', 'Taslak', 'append')).toBe('Taslak');
    });

    it('aktarım: yalnız dolu alanlar, varsayılan sona ekle, vitaller tek alan, düzenlenenler işaretli', () => {
        const transfer = buildExamNoteTransfer(
            { ...emptyForm, visitReason: 'Kulak kaşıntısı', plan: 'Eski plan' },
            { visitReason: '2 gündür kaşıntı', anamnesis: 'İştah normal', findings: null, assessment: null, plan: 'Damla', notes: '  ', weightKg: 31.4, temperatureC: null, heartRateBpm: 96, respiratoryRatePerMin: null },
            { plan: 'replace' },
            new Set(['plan', 'vitals'] as const)
        );

        expect(transfer.patch).toEqual({ visitReason: 'Kulak kaşıntısı\n2 gündür kaşıntı', anamnesis: 'İştah normal', plan: 'Damla', weightKg: 31.4, heartRateBpm: 96 });
        expect(transfer.fields).toEqual([
            { key: 'visitReason', edited: false },
            { key: 'anamnesis', edited: false },
            { key: 'plan', edited: true },
            { key: 'vitals', edited: true }
        ]);
        expect(examNoteTransferSummary(transfer)).toBe('4 alan AI taslağından dolduruldu.');
    });
});
