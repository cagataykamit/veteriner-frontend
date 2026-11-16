import type { ImportPreviewDto, ImportWarningDto, ImportWarningPartDto, ImportWarningSeverity } from '@/app/features/imports/models/import-api.model';
import { requiredValues } from '@/app/features/imports/utils/import-review.utils';
import { IMPORT_TABLE_LABELS } from '@/app/features/imports/utils/import-schema.utils';

/**
 * "Dosya okunurken N not çıktı" paneli (sözleşme 7.2.1). Renkler Adım 3'teki sonuç çubuğuyla aynı anlamda:
 * amber sizden beklenen, gök mavisi dikkat, ana renk bilgi, gri aktarılmayacak.
 */
export const IMPORT_NOTE_KINDS: readonly ImportWarningSeverity[] = ['decision', 'attention', 'info', 'skipped'];

export interface ImportNoteKindMeta {
    label: string;
    /** Başlıktaki filtre düğmesinde: "1 karar". */
    short: string;
    icon: string;
    dot: string;
    text: string;
    soft: string;
    border: string;
}

export const IMPORT_NOTE_KIND_META: Readonly<Record<ImportWarningSeverity, ImportNoteKindMeta>> = {
    decision: {
        label: 'Karar bekliyor',
        short: 'karar',
        icon: 'pi pi-question-circle',
        dot: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        soft: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-500'
    },
    attention: {
        label: 'Dikkat',
        short: 'dikkat',
        icon: 'pi pi-exclamation-triangle',
        dot: 'bg-sky-500',
        text: 'text-sky-700 dark:text-sky-300',
        soft: 'bg-sky-50 dark:bg-sky-950/30',
        border: 'border-sky-500'
    },
    info: {
        label: 'Bilgi',
        short: 'bilgi',
        icon: 'pi pi-info-circle',
        dot: 'bg-primary',
        text: 'text-primary-700 dark:text-primary-300',
        soft: 'bg-primary-50 dark:bg-primary-950/40',
        border: 'border-primary'
    },
    skipped: {
        label: 'Aktarılmayacak',
        short: 'aktarılmayacak',
        icon: 'pi pi-minus-circle',
        dot: 'bg-surface-400 dark:bg-surface-500',
        text: 'text-surface-600 dark:text-surface-300',
        soft: 'bg-surface-100 dark:bg-surface-800',
        border: 'border-surface-400'
    }
};

/** Türü gelmeyen (eski ya da yapısız) not "bilgi" sayılır. */
export function noteKind(note: ImportWarningDto): ImportWarningSeverity {
    return note.severity && IMPORT_NOTE_KINDS.includes(note.severity) ? note.severity : 'info';
}

/** Sayı ve başlık varsa not tek satır gösterilir; yoksa yalnız mesaj (düz metin). */
export function isStructuredNote(note: ImportWarningDto): boolean {
    return note.count != null && !!note.title;
}

/** Karar → dikkat → bilgi → aktarılmayacak; aynı türde sunucunun sırası korunur. */
export function sortNotes(notes: readonly ImportWarningDto[]): ImportWarningDto[] {
    return [...notes].sort((a, b) => IMPORT_NOTE_KINDS.indexOf(noteKind(a)) - IMPORT_NOTE_KINDS.indexOf(noteKind(b)));
}

export function countNotesByKind(notes: readonly ImportWarningDto[]): Record<ImportWarningSeverity, number> {
    const out: Record<ImportWarningSeverity, number> = { decision: 0, attention: 0, info: 0, skipped: 0 };

    for (const note of notes) {
        out[noteKind(note)]++;
    }

    return out;
}

/** Notun konusu: tablonun adı, tablosuz not için "Dosya". */
export function noteAreaLabel(note: ImportWarningDto): string {
    return note.table ? IMPORT_TABLE_LABELS[note.table] : 'Dosya';
}

/**
 * Karar notu (aynı adlı hastalar, `pets`) yükleme anının durumudur; hasta seçimleri doğrulamada yapılır. Önizlemede seçim
 * bekleyen hasta kalmadıysa not "bilgi"ye döner: sayı kırılımın toplamı olur, kararlı kırılım "Sizin seçiminizle" okunur,
 * gidiş düğmesi kalkar. Önizleme yoksa (henüz doğrulanmadı) not olduğu gibi kalır.
 */
export function settleDecisions(notes: readonly ImportWarningDto[], preview: ImportPreviewDto | null): ImportWarningDto[] {
    if (!preview || requiredValues(preview).some((u) => u.kind === 'pet')) {
        return [...notes];
    }

    return notes.map((note) => (noteKind(note) === 'decision' && note.table === 'pets' ? settled(note) : note));
}

function settled(note: ImportWarningDto): ImportWarningDto {
    const parts = note.parts?.map((p): ImportWarningPartDto => (p.severity === 'decision' ? { label: 'Sizin seçiminizle', count: p.count, severity: 'info' } : { ...p, severity: 'info' }));

    return {
        ...note,
        severity: 'info',
        count: parts?.length ? parts.reduce((sum, p) => sum + p.count, 0) : note.count,
        title: 'doğru hastaya bağlanacak',
        parts,
        target: null
    };
}
