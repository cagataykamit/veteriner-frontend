import type { ImportPreviewDto, ImportWarningDto } from '@/app/features/imports/models/import-api.model';
import { countNotesByKind, isStructuredNote, noteAreaLabel, noteKind, settleDecisions, sortNotes } from '@/app/features/imports/utils/import-notes.utils';

const note = (over: Partial<ImportWarningDto>): ImportWarningDto => ({ code: 'X', table: 'pets', message: 'Metin', ...over });

const decision = note({
    code: 'Imports.EVet.SameOwnerSameName',
    severity: 'decision',
    count: 26,
    unit: 'satır',
    title: 'hangi hastaya ait, sizden sorulacak',
    parts: [
        { label: 'Hastası size sorulacak', count: 26, severity: 'decision' },
        { label: 'Doğru hastaya kendiliğinden bağlandı', count: 184 }
    ],
    target: { anchor: 'required' }
});

const previewWith = (unmappedValues: ImportPreviewDto['unmappedValues']): ImportPreviewDto => ({ unmappedValues }) as ImportPreviewDto;

describe('import-notes.utils', () => {
    it('türü gelmeyen ya da tanınmayan not bilgi sayılır; yapı için sayı ve başlık gerekir', () => {
        expect(noteKind(note({}))).toBe('info');
        expect(noteKind(note({ severity: 'other' as never }))).toBe('info');
        expect(isStructuredNote(note({ count: 3 }))).toBe(false);
        expect(isStructuredNote(note({ count: 0, title: 'aktarılmayacak' }))).toBe(true);
    });

    it('sıra karar → dikkat → bilgi → aktarılmayacak; aynı türde sunucu sırası korunur', () => {
        const notes = [note({ code: 's', severity: 'skipped' }), note({ code: 'i1' }), note({ code: 'a', severity: 'attention' }), note({ code: 'i2', severity: 'info' }), decision];

        expect(sortNotes(notes).map((n) => n.code)).toEqual([decision.code, 'a', 'i1', 'i2', 's']);
        expect(countNotesByKind(notes)).toEqual({ decision: 1, attention: 1, info: 2, skipped: 1 });
    });

    it('konu tablonun adıdır; tablosuz not "Dosya"', () => {
        expect(noteAreaLabel(note({ table: 'vaccinations' }))).toBe('Aşılar');
        expect(noteAreaLabel(note({ table: null }))).toBe('Dosya');
    });

    it('önizleme yokken ya da hasta seçimi beklerken karar notu kalır', () => {
        expect(settleDecisions([decision], null)).toEqual([decision]);
        expect(settleDecisions([decision], previewWith([{ kind: 'pet', source: 'Belirsiz: 1 / 2', rowCount: 26, blocking: true }]))).toEqual([decision]);
    });

    it('seçim bekleyen hasta kalmayınca karar notu bilgiye döner, düğmesi kalkar', () => {
        const [settled] = settleDecisions([decision], previewWith([{ kind: 'species', source: 'ARABA', rowCount: 3, blocking: true }]));

        expect(settled.severity).toBe('info');
        expect(settled.count).toBe(210);
        expect(settled.title).toBe('doğru hastaya bağlanacak');
        expect(settled.target).toBeNull();
        expect(settled.parts).toEqual([
            { label: 'Sizin seçiminizle', count: 26, severity: 'info' },
            { label: 'Doğru hastaya kendiliğinden bağlandı', count: 184, severity: 'info' }
        ]);
        expect(settled.message).toBe(decision.message);
    });
});
