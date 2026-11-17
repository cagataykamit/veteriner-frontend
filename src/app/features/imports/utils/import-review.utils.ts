import type { ImportIssueSeverity, ImportNotImportedReasonDto, ImportPreviewDto, ImportTable, ImportUnmappedValueDto } from '@/app/features/imports/models/import-api.model';
import { importIssueLabel, importIssueNote } from '@/app/features/imports/utils/import-labels.utils';
import { IMPORT_TABLE_LABELS, IMPORT_TABLE_UNITS, IMPORT_TABLES } from '@/app/features/imports/utils/import-schema.utils';
import { type ImportValueChoices, valueChoiceKey } from '@/app/features/imports/utils/import-value-mapping.utils';

/**
 * Doğrulama sonucunun (Adım 3) kliniğe gösterilen özeti: her satır üç sonuçtan birine düşer.
 * Aktarılacak (oluşturulacak + mevcutla eşleşecek), bilerek atlanacak (boş, tekrar, atlanan değer; kayıp değil) ve aktarılamayacak (hatalı).
 */
export type ImportOutcome = 'import' | 'skip' | 'error';

export const IMPORT_OUTCOME_LABELS: Readonly<Record<ImportOutcome, string>> = {
    import: 'Aktarılacak',
    skip: 'Bilerek atlanacak',
    error: 'Aktarılamayacak'
};

export interface ImportReviewTable {
    key: ImportTable;
    label: string;
    unit: string;
    total: number;
    importable: number;
    matched: number;
    skipped: number;
    errors: number;
}

export interface ImportReviewTotals {
    total: number;
    importable: number;
    matched: number;
    skipped: number;
    errors: number;
}

/** Bir neden kodu, tablolar arasında toplanmış satır sayısıyla. */
export interface ImportReviewReason {
    code: string;
    label: string;
    note: string | null;
    rowCount: number;
    tables: ImportTable[];
}

/** `failed`: doğrulama tamamlanmadı; `blocked`: dosya düzeyi engel; `past`: aktarma başlamış/bitmiş partide geriye bakış. */
export type ImportReviewState = 'failed' | 'blocked' | 'needsChoice' | 'ready' | 'readyWithNotes' | 'past';

/** Seçimle çözülen engeller; geri kalan engeller dosya düzeyidir (sözleşme 7.6, 13.4). */
const VALUE_BLOCKERS: ReadonlySet<string> = new Set(['Imports.SpeciesUnmapped', 'Imports.VaccineUnmapped', 'Imports.AmbiguousPet']);

/** Bağlantı sütunu eksik engeller: eşleme adımında düzeltilir. */
const MAPPING_BLOCKERS: ReadonlySet<string> = new Set(['Imports.OwnerLinkUnavailable', 'Imports.PetLinkUnavailable']);

export function formatCount(n: number): string {
    return n.toLocaleString('tr-TR');
}

/**
 * Güncelleme aktarması özeti (sözleşme 14.4): dosya önceki aktarmayla büyük ölçüde örtüşüyorsa tek cümle, aksi null.
 * Yalnız yenisi olan tablolar sayılır; hiç yeni yoksa bunu söyler.
 */
export function overlapSummary(p: ImportPreviewDto): string | null {
    const o = p.overlap;

    if (!o?.isUpdate) {
        return null;
    }

    const fresh = o.tables.filter((t) => t.willCreate > 0).map((t) => `${formatCount(t.willCreate)} yeni ${IMPORT_TABLE_UNITS[t.table]}`);
    const lead = 'Bu dosya önceki aktarmayla büyük ölçüde örtüşüyor';

    return fresh.length ? `${lead}: ${fresh.join(', ')} gelecek; geri kalanı zaten var.` : `${lead}: yeni kayıt yok; hepsi zaten var.`;
}

/** Partide satırı olan tablolar, doğrulama sırasıyla. */
export function reviewTables(p: ImportPreviewDto): ImportReviewTable[] {
    return IMPORT_TABLES.filter((t) => p.summary[t].total > 0).map((t) => {
        const s = p.summary[t];

        return { key: t, label: IMPORT_TABLE_LABELS[t], unit: IMPORT_TABLE_UNITS[t], total: s.total, importable: s.willCreate + s.willMatch, matched: s.willMatch, skipped: s.willSkip, errors: s.error };
    });
}

export function reviewTotals(tables: readonly ImportReviewTable[]): ImportReviewTotals {
    return tables.reduce((a, t) => ({ total: a.total + t.total, importable: a.importable + t.importable, matched: a.matched + t.matched, skipped: a.skipped + t.skipped, errors: a.errors + t.errors }), {
        total: 0,
        importable: 0,
        matched: 0,
        skipped: 0,
        errors: 0
    });
}

/** "4.192 müşteri · 6.318 hasta" */
export function importableText(tables: readonly ImportReviewTable[]): string {
    return tables
        .filter((t) => t.importable > 0)
        .map((t) => `${formatCount(t.importable)} ${t.unit}`)
        .join(' · ');
}

/** Aynı kodu tablolar arasında toplar; satır sayısı azalan. */
function mergeReasons(items: readonly { code: string; rowCount: number; table?: ImportTable }[]): ImportReviewReason[] {
    const byCode = new Map<string, ImportReviewReason>();

    for (const i of items) {
        const cur = byCode.get(i.code);

        if (cur) {
            cur.rowCount += i.rowCount;

            if (i.table && !cur.tables.includes(i.table)) {
                cur.tables.push(i.table);
            }
        } else {
            byCode.set(i.code, { code: i.code, label: importIssueLabel(i.code), note: importIssueNote(i.code), rowCount: i.rowCount, tables: i.table ? [i.table] : [] });
        }
    }

    return [...byCode.values()].sort((x, y) => y.rowCount - x.rowCount);
}

/** Aktarılmayacak satırların nedenleri: `Skipped` bilerek atlanan, `Error` aktarılamayan (sözleşme 7.6). */
export function notImportedReasons(p: ImportPreviewDto, kind: ImportNotImportedReasonDto['kind']): ImportReviewReason[] {
    return mergeReasons((p.notImportedReasons ?? []).filter((r) => r.kind === kind));
}

/** Uyarı ya da bilgi kodları; atlanma nedeni olarak zaten gösterilen kodlar bilgi notlarında tekrarlanmaz. */
export function issueReasons(p: ImportPreviewDto, severity: Exclude<ImportIssueSeverity, 'Error'>): ImportReviewReason[] {
    const skipCodes = new Set((p.notImportedReasons ?? []).filter((r) => r.kind === 'Skipped').map((r) => r.code));

    return mergeReasons(p.issueCounts.filter((i) => i.severity === severity && !skipCodes.has(i.code)));
}

/** Seçimle çözülmeyen, dosya düzeyi engeller. */
export function fileBlockers(p: ImportPreviewDto): ImportReviewReason[] {
    return p.blockers.filter((b) => !VALUE_BLOCKERS.has(b)).map((b) => ({ code: b, label: importIssueLabel(b), note: importIssueNote(b), rowCount: 0, tables: [] }));
}

/** Aktarmayı engelleyen, karşılığı seçilecek değerler (tür, aşı, belirsiz hasta). */
export function requiredValues(p: ImportPreviewDto): ImportUnmappedValueDto[] {
    return p.unmappedValues.filter((u) => u.blocking);
}

export function reviewState(p: ImportPreviewDto, totals: ImportReviewTotals): ImportReviewState {
    if (p.status === 'ValidationFailed') {
        return p.blockers.length ? 'blocked' : 'failed';
    }

    if (p.status !== 'Validated') {
        return 'past';
    }

    if (fileBlockers(p).length) {
        return 'blocked';
    }

    if (requiredValues(p).length) {
        return 'needsChoice';
    }

    return totals.skipped + totals.errors > 0 ? 'readyWithNotes' : 'ready';
}

/** Sonucun başlığı ve tek cümlelik açıklaması. */
export function reviewHeadline(state: ImportReviewState, totals: ImportReviewTotals, requiredCount: number): { title: string; text: string } {
    const none = 'Henüz hiçbir kayıt oluşturulmadı.';

    switch (state) {
        case 'failed':
            return { title: 'Doğrulama tamamlanamadı', text: 'Beklenmeyen bir sorun oldu; hiçbir kayıt oluşturulmadı. Yeniden doğrulayın; sorun sürerse destek ekibiyle iletişime geçin.' };
        case 'blocked':
            return { title: 'Bu dosya bu hâliyle aktarılamıyor', text: `Aşağıdaki nedeni giderip yeniden doğrulayın. ${none}` };
        case 'needsChoice':
            return { title: `Aktarmadan önce ${formatCount(requiredCount)} seçim yapın`, text: `Dosyada sistemde karşılığı olmayan değerler ya da ayırt edilemeyen hastalar var. Karşılığını siz seçin; gerisi hazır. ${none}` };
        case 'ready':
            return { title: 'Her şey hazır', text: `Dosyanızdaki ${formatCount(totals.total)} satırın tamamı aktarılacak. ${none}` };
        case 'readyWithNotes':
            return { title: 'Aktarmaya hazır', text: `${formatCount(totals.total)} satırdan ${formatCount(totals.importable)} kayıt aktarılacak; gerisinin nedeni aşağıda. ${none}` };
        case 'past':
            return { title: 'Doğrulama sonucu', text: 'Aktarmadan önceki doğrulama. Aktarmanın sonucu Onay adımındadır.' };
    }
}

/** Onay adımına geçilemiyorsa nedeni; geçilebiliyorsa null. */
export function reviewNextHint(p: ImportPreviewDto, choices: ImportValueChoices): string | null {
    if (p.canCommit) {
        return null;
    }

    if (p.status === 'ValidationFailed' && !p.blockers.length) {
        return 'Önce yeniden doğrulayın.';
    }

    const blockers = fileBlockers(p);

    if (blockers.length) {
        return blockers.some((b) => MAPPING_BLOCKERS.has(b.code)) ? 'Önce eşlemeyi düzeltin.' : 'Aktarılabilecek satır yok.';
    }

    const required = requiredValues(p);
    const pending = required.filter((u) => !choices[valueChoiceKey(u.kind, u.source)]).length;

    if (pending > 0) {
        return `Önce ${formatCount(pending)} seçimi yapın.`;
    }

    return required.length ? 'Seçimleri uygulayın; sonuç yeniden hesaplanır.' : null;
}
