/**
 * AI-001 "Notu alanlara ayır" taslağının kuralları (`AI_DRAFTS_API_CONTRACT.md` §7.1). İçerik:
 * `{ fields: { visitReason, anamnesis, findings, assessment, plan, notes, weightKg, temperatureC, heartRateBpm, respiratoryRatePerMin }, replaceFields: [] }`;
 * notta karşılığı olmayan alan hiç gelmez. Kabul muayeneyi backend'de yazar: metin varsayılan olarak satır satır **sona eklenir**,
 * `replaceFields`'taki alan **yerine yazılır**; vital verildiyse eskisinin yerine geçer. Taslak notta yazmayanı eklemez.
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

/** Kabul edilecek alanlar (`editedContent`) ve her birinin izi ("AI taslağından · düzenlendi"). */
export interface ExamNoteAccept {
    content: { fields: Record<string, string | number>; replaceFields: ExamNoteTextKey[] };
    fields: ReadonlyArray<{ readonly key: ExamNoteFieldKey; readonly edited: boolean }>;
}

/**
 * Panelde görünen (düzenlenmiş olabilir) taslaktan kabul içeriğini kurar. Boş bırakılan alan aktarılmaz; "Yerine yaz" yalnız
 * aktarılan metin alanı için gönderilir (varsayılan "Sona ekle": muayenedeki metin kullanıcı seçmeden silinmez).
 */
export function buildExamNoteAccept(draft: ExamNoteDraftContent, modes: Partial<Record<ExamNoteTextKey, ExamNoteMergeMode>>, editedKeys: ReadonlySet<ExamNoteFieldKey>): ExamNoteAccept {
    const fields: Record<string, string | number> = {};
    const replaceFields: ExamNoteTextKey[] = [];
    const accepted: { key: ExamNoteFieldKey; edited: boolean }[] = [];

    for (const f of EXAM_NOTE_TEXT_FIELDS) {
        const text = draft[f.key]?.trim();

        if (text) {
            fields[f.key] = text;
            accepted.push({ key: f.key, edited: editedKeys.has(f.key) });

            if (modes[f.key] === 'replace') {
                replaceFields.push(f.key);
            }
        }
    }

    const vitals = EXAM_NOTE_VITAL_FIELDS.filter((f) => draft[f.key] !== null);

    for (const f of vitals) {
        fields[f.key] = draft[f.key] as number;
    }

    if (vitals.length) {
        accepted.push({ key: 'vitals', edited: editedKeys.has('vitals') });
    }

    return { content: { fields, replaceFields }, fields: accepted };
}

/** Kabulden sonra formun üstündeki şerit: "6 alan AI taslağından muayeneye eklendi." (vitaller tek alan sayılır). */
export function examNoteAcceptSummary(fieldCount: number): string {
    return `${fieldCount} alan AI taslağından muayeneye eklendi.`;
}
