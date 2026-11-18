/**
 * AI-001 "Notu alanlara ayır" taslağının kuralları. İçerik şeması tasarım notundaki öneriye göredir
 * (`fields: { visitReason, anamnesis, findings, weightKg, temperatureC, heartRateBpm, respiratoryRatePerMin, assessment, plan, notes }`,
 * notta olmayan alan `null`); backend sözleşmesi gelince doğrulanacak.
 * Kural: taslak notta yazmayanı eklemez; formdaki metin kullanıcı seçmeden silinmez (varsayılan "Sona ekle").
 */

export type ExamNoteTextKey = 'visitReason' | 'anamnesis' | 'findings' | 'assessment' | 'plan' | 'notes';
export type ExamNoteVitalKey = 'weightKg' | 'temperatureC' | 'heartRateBpm' | 'respiratoryRatePerMin';
export type ExamNoteFieldKey = ExamNoteTextKey | 'vitals';

/** Formdaki sırayla; etiketler muayene formundakilerle aynı. */
export const EXAM_NOTE_TEXT_FIELDS: ReadonlyArray<{ readonly key: ExamNoteTextKey; readonly label: string; readonly rows: number }> = [
    { key: 'visitReason', label: 'Ziyaret sebebi / şikâyet', rows: 2 },
    { key: 'anamnesis', label: 'Anamnez', rows: 3 },
    { key: 'findings', label: 'Klinik bulgular', rows: 2 },
    { key: 'assessment', label: 'Değerlendirme / tanı', rows: 2 },
    { key: 'plan', label: 'Plan / tedavi planı', rows: 3 },
    { key: 'notes', label: 'Ek notlar', rows: 3 }
];

export const EXAM_NOTE_VITAL_FIELDS: ReadonlyArray<{ readonly key: ExamNoteVitalKey; readonly label: string }> = [
    { key: 'weightKg', label: 'Kilo (kg)' },
    { key: 'temperatureC', label: 'Sıcaklık (°C)' },
    { key: 'heartRateBpm', label: 'Nabız' },
    { key: 'respiratoryRatePerMin', label: 'Solunum' }
];

export const EXAM_NOTE_VITALS_LABEL = 'Vital değerler';

export type ExamNoteDraftContent = Record<ExamNoteTextKey, string | null> & Record<ExamNoteVitalKey, number | null>;

/** Formun ilgili alanları (muayene formu değerlerinin alt kümesi). */
export type ExamNoteFormValues = Record<ExamNoteTextKey, string> & Record<ExamNoteVitalKey, number | null>;

export type ExamNoteMergeMode = 'append' | 'replace';

/** Taslak içeriği (`AiDraftVm.content`): `fields` altında ya da düz; boş metin ve sayı olmayan vital `null` sayılır. */
export function parseExamNoteDraftContent(content: Record<string, unknown> | null | undefined): ExamNoteDraftContent {
    const raw = content && typeof content['fields'] === 'object' && content['fields'] !== null ? (content['fields'] as Record<string, unknown>) : (content ?? {});
    const out = {} as ExamNoteDraftContent;

    for (const f of EXAM_NOTE_TEXT_FIELDS) {
        const v = raw[f.key];

        out[f.key] = typeof v === 'string' && v.trim() ? v.trim() : null;
    }

    for (const f of EXAM_NOTE_VITAL_FIELDS) {
        const v = raw[f.key];

        out[f.key] = typeof v === 'number' && Number.isFinite(v) ? v : null;
    }

    return out;
}

/** "Sona ekle": formdaki metnin altına yeni satırla; form boşsa yalnız taslak. "Yerine yaz": yalnız taslak. */
export function mergeExamNoteText(current: string, draft: string, mode: ExamNoteMergeMode): string {
    const kept = current.trim();

    return mode === 'append' && kept ? `${current.trimEnd()}\n${draft}` : draft;
}

/** Forma aktarılacak alanlar ve her birinin izi ("AI taslağından · düzenlendi"). */
export interface ExamNoteTransfer {
    patch: Partial<ExamNoteFormValues>;
    fields: ReadonlyArray<{ readonly key: ExamNoteFieldKey; readonly edited: boolean }>;
}

/**
 * Kullanıcının panelde gördüğü (düzenlenmiş olabilir) taslaktan form yamasını kurar. Boş bırakılan alan aktarılmaz;
 * dolu form alanı yalnız seçilen biçimle (sona ekle / yerine yaz) değişir. Vitaller dört ayrı sayı alanına gider,
 * formun kendi doğrulaması aynen geçerlidir.
 */
export function buildExamNoteTransfer(form: ExamNoteFormValues, draft: ExamNoteDraftContent, modes: Partial<Record<ExamNoteTextKey, ExamNoteMergeMode>>, editedKeys: ReadonlySet<ExamNoteFieldKey>): ExamNoteTransfer {
    const patch: Partial<ExamNoteFormValues> = {};
    const fields: { key: ExamNoteFieldKey; edited: boolean }[] = [];

    for (const f of EXAM_NOTE_TEXT_FIELDS) {
        const text = draft[f.key]?.trim();

        if (text) {
            patch[f.key] = mergeExamNoteText(form[f.key] ?? '', text, modes[f.key] ?? 'append');
            fields.push({ key: f.key, edited: editedKeys.has(f.key) });
        }
    }

    const vitals = EXAM_NOTE_VITAL_FIELDS.filter((f) => draft[f.key] !== null);

    for (const f of vitals) {
        patch[f.key] = draft[f.key];
    }

    if (vitals.length) {
        fields.push({ key: 'vitals', edited: editedKeys.has('vitals') });
    }

    return { patch, fields };
}

/** "6 alan AI taslağından dolduruldu" şeridi için alan sayısı (vitaller tek alan sayılır). */
export function examNoteTransferSummary(transfer: ExamNoteTransfer): string {
    return `${transfer.fields.length} alan AI taslağından dolduruldu.`;
}
