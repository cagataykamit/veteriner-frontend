import { buildExamNoteAccept, examNoteAcceptSummary, parseExamNoteDraftContent } from '@/app/entities/ai/utils/exam-note-draft.utils';

describe('exam-note-draft.utils', () => {
    it('içerik: fields altında ya da düz okunur; gelmeyen/boş metin ve sayı olmayan vital null', () => {
        const nested = parseExamNoteDraftContent({ fields: { visitReason: ' Kaşıntı ', anamnesis: '  ', weightKg: 31.4, temperatureC: '38.6', plan: 7 }, replaceFields: [] });

        expect(nested).toEqual({ visitReason: 'Kaşıntı', anamnesis: null, findings: null, assessment: null, plan: null, notes: null, weightKg: 31.4, temperatureC: null, heartRateBpm: null, respiratoryRatePerMin: null });
        expect(parseExamNoteDraftContent({ notes: 'Ek' }).notes).toBe('Ek');
        expect(parseExamNoteDraftContent(null).visitReason).toBeNull();
    });

    it('kabul içeriği: yalnız dolu alanlar, varsayılan sona ekle (replaceFields boş), vitaller tek iz, düzenlenenler işaretli', () => {
        const accept = buildExamNoteAccept(
            { visitReason: '2 gündür kaşıntı', anamnesis: 'İştah normal', findings: null, assessment: null, plan: 'Damla', notes: '  ', weightKg: 31.4, temperatureC: null, heartRateBpm: 96, respiratoryRatePerMin: null },
            { plan: 'replace', findings: 'replace' },
            new Set(['plan', 'vitals'] as const)
        );

        expect(accept.content).toEqual({ fields: { visitReason: '2 gündür kaşıntı', anamnesis: 'İştah normal', plan: 'Damla', weightKg: 31.4, heartRateBpm: 96 }, replaceFields: ['plan'] });
        expect(accept.fields).toEqual([
            { key: 'visitReason', edited: false },
            { key: 'anamnesis', edited: false },
            { key: 'plan', edited: true },
            { key: 'vitals', edited: true }
        ]);
        expect(examNoteAcceptSummary(accept.fields.length)).toBe('4 alan AI taslağından muayeneye eklendi.');
    });
});
