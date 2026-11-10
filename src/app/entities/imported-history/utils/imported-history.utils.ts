import type { ImportedAccountEntryKind, ImportedClinicalRecordDto } from '@/app/entities/imported-history/models/imported-history.model';

/** `yyyy-MM-dd` → `gg.aa.yyyy`; saat dilimi dönüşümü yok (kayıt yalnız tarihtir). */
export function formatImportedDate(ymd: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? '');

    return m ? `${m[3]}.${m[2]}.${m[1]}` : '—';
}

/** Boş kayıt türü ekranda "Muayene" görünür (sözleşme 12.3). */
export function importedRecordTypeLabel(r: Pick<ImportedClinicalRecordDto, 'recordType'>): string {
    return r.recordType?.trim() || 'Muayene';
}

/** Kaydın metin alanları, ekrandaki sırayla; boş olanlar atlanır. */
export function importedRecordFields(r: ImportedClinicalRecordDto): { label: string; value: string }[] {
    const fields: [string, string | null][] = [
        ['Şikâyet', r.complaint],
        ['Anamnez', r.history],
        ['Bulgular', r.findings],
        ['Tanı', r.diagnosis],
        ['Tedavi', r.treatment],
        ['Reçete', r.prescription],
        ['Laboratuvar', r.labResults],
        ['Not', r.notes]
    ];

    return fields.filter((f): f is [string, string] => !!f[1]?.trim()).map(([label, value]) => ({ label, value }));
}

/** Kısa özet: tanı, yoksa şikâyet, yoksa ilk dolu alan. */
export function importedRecordSummary(r: ImportedClinicalRecordDto): string | null {
    return r.diagnosis?.trim() || r.complaint?.trim() || importedRecordFields(r)[0]?.value || null;
}

export const IMPORTED_ENTRY_KIND_LABELS: Readonly<Record<ImportedAccountEntryKind, string>> = {
    Debit: 'Borç',
    Credit: 'Tahsilat'
};
