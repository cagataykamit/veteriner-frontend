import { HttpErrorResponse } from '@angular/common/http';
import type { ImportTableInfoDto } from '@/app/features/imports/models/import-api.model';
import {
    duplicateBatchId,
    importCommitBlockers,
    importErrorMessage,
    importIssueLabel,
    isDiscardable,
    isEndpointUnavailable,
    isImportJobRunning,
    reminderImpactCurrentCount,
    precheckImportFile
} from '@/app/features/imports/utils/import-labels.utils';
import { columnMapsToRequest, initialColumnMaps, mappingConfidence, missingRequired } from '@/app/features/imports/utils/import-schema.utils';
import { IMPORT_VALUE_SKIP, valueChoicesToRequest } from '@/app/features/imports/utils/import-value-mapping.utils';

const customers: ImportTableInfoDto = {
    table: 'customers',
    rowCount: 3,
    columns: [
        { source: 'Ad Soyad', suggested: 'AdSoyad', confidence: 'Exact', mapped: null },
        { source: 'Cep', suggested: 'Telefon', confidence: 'Alias', mapped: null },
        { source: 'Notlar', suggested: null, confidence: 'None', mapped: null }
    ]
};

const problem = (status: number, code?: string, extra: Record<string, unknown> = {}) =>
    new HttpErrorResponse({ status, error: code ? { code, ...extra } : null });

describe('import-schema.utils', () => {
    it('kayıtlı eşleme yokken yalnız güvenilir önerileri başlangıç eşlemesi yapar', () => {
        expect(initialColumnMaps([customers])).toEqual({ customers: { AdSoyad: 'Ad Soyad', Telefon: 'Cep' } });
    });

    it('kayıtlı eşleme varsa önerileri yok sayar', () => {
        const saved: ImportTableInfoDto = { ...customers, columns: customers.columns.map((c) => (c.source === 'Notlar' ? { ...c, mapped: 'Adres' } : c)) };

        expect(initialColumnMaps([saved])).toEqual({ customers: { Adres: 'Notlar' } });
    });

    it('zorunlu alan ve bağlantı koşullarını denetler', () => {
        expect(missingRequired('customers', {})).toEqual(['Ad soyad']);
        expect(missingRequired('customers', { AdSoyad: 'Ad' })).toEqual([]);
        expect(missingRequired('pets', { HayvanAdi: 'a', Tur: 'b' })).toHaveSize(1);
        expect(missingRequired('pets', { HayvanAdi: 'a', Tur: 'b', MusteriNo: 'c' })).toEqual([]);
        expect(missingRequired('pets', { HayvanAdi: 'a', Tur: 'b', SahipAdSoyad: 'c', SahipTelefon: 'd' })).toEqual([]);
        expect(missingRequired('vaccinations', { AsiAdi: 'a', UygulamaTarihi: 'b' })).toHaveSize(1);
        expect(missingRequired('vaccinations', { AsiAdi: 'a', UygulamaTarihi: 'b', HayvanNo: 'c' })).toEqual([]);
    });

    it('isteğe boş eşlemeleri koymaz', () => {
        expect(columnMapsToRequest({ customers: { AdSoyad: 'Ad Soyad', Telefon: null } }, [customers])).toEqual({ customers: { AdSoyad: 'Ad Soyad' } });
    });

    it('güveni öneriyle karşılaştırır', () => {
        expect(mappingConfidence(customers.columns, 'Ad Soyad', 'AdSoyad')).toBe('Exact');
        expect(mappingConfidence(customers.columns, 'Cep', 'Telefon')).toBe('Alias');
        expect(mappingConfidence(customers.columns, 'Cep', 'AdSoyad')).toBe('Manual');
        expect(mappingConfidence(customers.columns, null, 'AdSoyad')).toBeNull();
    });
});

describe('import-value-mapping.utils', () => {
    it('seçimleri isteğe çevirir; atla hedefsiz olur ve kaynakta çubuk karakteri korunur', () => {
        expect(valueChoicesToRequest({ 'species|Kopek': 'id-1', 'vaccine|A|B': IMPORT_VALUE_SKIP })).toEqual([
            { kind: 'species', source: 'Kopek', targetId: 'id-1' },
            { kind: 'vaccine', source: 'A|B', targetId: null }
        ]);
    });
});

describe('import-labels.utils', () => {
    it('bilinen kodlar sade Türkçe, bilinmeyen kod yedek metinle gösterilir', () => {
        expect(importIssueLabel('Imports.SpeciesUnmapped')).toBe('Tür sistemde bulunamadı');
        expect(importIssueLabel('Imports.Bilinmeyen', 'Sunucu mesajı')).toBe('Sunucu mesajı');
    });

    it('arka plan işi süren durumlar: doğrulama, uygulama, geri alma; Validating taslak olsa da silinemez', () => {
        expect(['Validating', 'Committing', 'RollingBack'].every(isImportJobRunning)).toBeTrue();
        expect(['Mapped', 'Validated', 'ValidationFailed', 'Committed'].some(isImportJobRunning)).toBeFalse();
        expect(isDiscardable('Validating')).toBeFalse();
    });

    it('uç yokluğunu (gövdesiz 404, 405, 501) gerçek "kayıt yok"tan ayırır', () => {
        expect(isEndpointUnavailable(problem(404))).toBeTrue();
        expect(isEndpointUnavailable(problem(405))).toBeTrue();
        expect(isEndpointUnavailable(problem(501))).toBeTrue();
        expect(isEndpointUnavailable(problem(404, 'Imports.BatchNotFound'))).toBeFalse();
        expect(isEndpointUnavailable(problem(409, 'Imports.InvalidState'))).toBeFalse();
    });

    it('mükerrer dosya yanıtından mevcut parti kimliğini okur', () => {
        expect(duplicateBatchId(problem(409, 'Imports.DuplicateFile', { extensions: { batchId: 'b-1' } }))).toBe('b-1');
        expect(duplicateBatchId(problem(409, 'Imports.DuplicateFile'))).toBeNull();
        expect(duplicateBatchId(problem(409, 'Imports.InvalidState', { extensions: { batchId: 'b-1' } }))).toBeNull();
    });

    it('içe aktarma hata kodlarını Türkçe mesaja çevirir', () => {
        expect(importErrorMessage(problem(409, 'Imports.ValidationStale'), 'x')).toContain('Yeniden doğrulayın');
    });

    it('dosya ön kontrolü uzantı, boşluk ve boyutu denetler', () => {
        const file = (name: string, size: number) => ({ name, size }) as File;

        expect(precheckImportFile(file('a.xlsx', 10), '.xlsx')).toBeNull();
        expect(precheckImportFile(file('a.xls', 10), '.xlsx')).toContain('.xlsx');
        expect(precheckImportFile(file('a.csv', 0), '.csv')).toBe('Dosya boş.');
        expect(precheckImportFile(file('a.csv', 11 * 1024 * 1024), '.csv')).toContain('10 MB');
    });

    it('B4 hata kodlarını sade Türkçeye çevirir; düz ve extensions altındaki ek alanları okur', () => {
        expect(importErrorMessage(problem(409, 'Imports.CommitBlocked'), 'x')).toContain('başlatılamıyor');
        expect(importErrorMessage(problem(403, 'Imports.AccessDenied'), 'x')).toContain('yetkiniz yok');
        expect(importCommitBlockers(problem(409, 'Imports.CommitBlocked', { blockers: ['Imports.OwnerLinkUnavailable', 3] }))).toEqual(['Imports.OwnerLinkUnavailable']);
        expect(importCommitBlockers(problem(409, 'Imports.CommitBlocked', { extensions: { blockers: ['Imports.NoImportableRows'] } }))).toEqual(['Imports.NoImportableRows']);
        expect(reminderImpactCurrentCount(problem(409, 'Imports.ReminderImpactChanged', { emailsWithinReminderWindow: 12 }))).toBe(12);
        expect(reminderImpactCurrentCount(problem(409, 'Imports.ReminderImpactChanged'))).toBeNull();
    });

    it('uygulama satır kodlarının sade metni vardır', () => {
        for (const code of ['Imports.OwnerUnitFailed', 'Imports.MatchedAtCommit', 'Imports.ApplyFailed']) {
            expect(importIssueLabel(code)).not.toBe(code);
        }
    });
});
