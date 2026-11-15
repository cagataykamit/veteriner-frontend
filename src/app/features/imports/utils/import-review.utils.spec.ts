import type { ImportPreviewDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { importIssueLabel, importIssueNote } from '@/app/features/imports/utils/import-labels.utils';
import { fileBlockers, importableText, issueReasons, notImportedReasons, reviewHeadline, reviewNextHint, reviewState, reviewTables, reviewTotals } from '@/app/features/imports/utils/import-review.utils';
import { IMPORT_VALUE_SKIP } from '@/app/features/imports/utils/import-value-mapping.utils';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };

const preview = (over: Partial<ImportPreviewDto> = {}): ImportPreviewDto =>
    ({
        validationId: 'v1',
        status: 'Validated',
        canCommit: true,
        blockers: [],
        summary: {
            customers: { ...zero, total: 1200, willCreate: 1180, willMatch: 10, willSkip: 6, error: 4 },
            pets: { ...zero, total: 1500, willCreate: 1500 },
            vaccinations: zero,
            clinicalRecords: { ...zero, total: 300, willCreate: 200, willSkip: 100 },
            accountEntries: zero,
            appointments: zero,
            products: zero
        },
        unmappedValues: [],
        issueCounts: [],
        notImportedReasons: [],
        reminderImpact: {},
        payloadPurged: false,
        ...over
    }) as unknown as ImportPreviewDto;

describe('import-review.utils', () => {
    it('üç sonuç: aktarılacak eşleşenleri de sayar; satırı olmayan tablo listelenmez', () => {
        const tables = reviewTables(preview());

        expect(tables.map((t) => t.key)).toEqual(['customers', 'pets', 'clinicalRecords']);
        expect(reviewTotals(tables)).toEqual({ total: 3000, importable: 2890, matched: 10, skipped: 106, errors: 4 });
        expect(importableText(tables)).toBe('1.190 müşteri · 1.500 hasta · 200 klinik kayıt');
    });

    it('nedenler tablolar arasında toplanır, satır sayısına göre sıralanır ve açıklamasını taşır', () => {
        const p = preview({
            notImportedReasons: [
                { table: 'pets', kind: 'Error', code: 'Imports.PetNotFound', rowCount: 3 },
                { table: 'clinicalRecords', kind: 'Skipped', code: 'Imports.ClinicalRecordEmpty', rowCount: 100 },
                { table: 'vaccinations', kind: 'Error', code: 'Imports.PetNotFound', rowCount: 5 },
                { table: 'customers', kind: 'Error', code: 'Imports.NameTooShort', rowCount: 4 }
            ]
        });

        expect(notImportedReasons(p, 'Error').map((r) => [r.code, r.rowCount, r.tables])).toEqual([
            ['Imports.PetNotFound', 8, ['pets', 'vaccinations']],
            ['Imports.NameTooShort', 4, ['customers']]
        ]);
        expect(notImportedReasons(p, 'Skipped')[0]).toEqual({ code: 'Imports.ClinicalRecordEmpty', label: 'Boş muayene satırı', note: 'İçinde bilgi yok ve hastası ya da tarihi okunamadı; sorun değil.', rowCount: 100, tables: ['clinicalRecords'] });
    });

    it('bilgi notları atlanma nedeni olarak gösterilen kodu tekrarlamaz', () => {
        const p = preview({
            issueCounts: [
                { code: 'Imports.ClinicalRecordEmpty', severity: 'Info', rowCount: 100 },
                { code: 'Imports.InactiveClient', severity: 'Info', rowCount: 7 },
                { code: 'Imports.PhoneInvalid', severity: 'Warning', rowCount: 2 }
            ],
            notImportedReasons: [{ table: 'clinicalRecords', kind: 'Skipped', code: 'Imports.ClinicalRecordEmpty', rowCount: 100 }]
        });

        expect(issueReasons(p, 'Info').map((r) => r.code)).toEqual(['Imports.InactiveClient']);
        expect(issueReasons(p, 'Warning').map((r) => r.code)).toEqual(['Imports.PhoneInvalid']);
    });

    it('seçimle çözülen engeller dosya düzeyi sayılmaz', () => {
        expect(fileBlockers(preview({ blockers: ['Imports.SpeciesUnmapped', 'Imports.AmbiguousPet', 'Imports.PetLinkUnavailable'] })).map((b) => b.code)).toEqual(['Imports.PetLinkUnavailable']);
    });

    it('durum ve başlık: her şey hazır, hazır, seçim bekliyor, engel, başarısız, geriye bakış', () => {
        const clean = preview({ summary: { ...preview().summary, customers: { ...zero, total: 2, willCreate: 2 }, clinicalRecords: zero } });
        const required = { kind: 'species' as const, source: 'ARABA', rowCount: 3, blocking: true };

        expect(reviewState(clean, reviewTotals(reviewTables(clean)))).toBe('ready');
        expect(reviewState(preview(), reviewTotals(reviewTables(preview())))).toBe('readyWithNotes');
        expect(reviewState(preview({ unmappedValues: [required] }), reviewTotals([]))).toBe('needsChoice');
        expect(reviewState(preview({ blockers: ['Imports.NoImportableRows'] }), reviewTotals([]))).toBe('blocked');
        expect(reviewState(preview({ status: 'ValidationFailed', blockers: [] }), reviewTotals([]))).toBe('failed');
        expect(reviewState(preview({ status: 'Committed' }), reviewTotals([]))).toBe('past');

        expect(reviewHeadline('ready', reviewTotals(reviewTables(clean)), 0).text).toContain('2 satırın tamamı aktarılacak');
        expect(reviewHeadline('needsChoice', reviewTotals([]), 2).title).toBe('Aktarmadan önce 2 seçim yapın');
    });

    it('onay adımına geçilemiyorsa neden söylenir', () => {
        const required = { kind: 'vaccine' as const, source: 'KARMA', rowCount: 1, blocking: true };
        const waiting = preview({ canCommit: false, blockers: ['Imports.VaccineUnmapped'], unmappedValues: [required, { kind: 'breed', source: 'Sarman', rowCount: 9, blocking: false }] });

        expect(reviewNextHint(preview(), {})).toBeNull();
        expect(reviewNextHint(waiting, {})).toBe('Önce 1 seçimi yapın.');
        expect(reviewNextHint(waiting, { 'vaccine|KARMA': IMPORT_VALUE_SKIP })).toBe('Seçimleri uygulayın; sonuç yeniden hesaplanır.');
        expect(reviewNextHint(preview({ canCommit: false, status: 'ValidationFailed', blockers: ['Imports.OwnerLinkUnavailable'] }), {})).toBe('Önce eşlemeyi düzeltin.');
        expect(reviewNextHint(preview({ canCommit: false, blockers: ['Imports.NoImportableRows'] }), {})).toBe('Aktarılabilecek satır yok.');
        expect(reviewNextHint(preview({ canCommit: false, status: 'ValidationFailed', blockers: [] }), {})).toBe('Önce yeniden doğrulayın.');
    });

    it('neden metinleri tek yerde: etiket ve isteğe bağlı açıklama', () => {
        expect(importIssueLabel('Imports.PetNotFound')).toBe('Satırın hastası bulunamadı');
        expect(importIssueNote('Imports.PetNotFound')).toBe('Hasta dosyada yok ya da aynı sahipte aynı adlı birden çok hasta var.');
        expect(importIssueNote('Imports.PhoneInvalid')).toBeNull();
        expect(importIssueNote('Imports.Bilinmeyen')).toBeNull();
    });
});
