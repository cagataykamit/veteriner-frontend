import { HttpErrorResponse } from '@angular/common/http';
import type { ImportReminderImpactDto, ImportTableInfoDto } from '@/app/features/imports/models/import-api.model';
import { duplicateBatchId, importCommitBlockers, importErrorMessage, importIssueLabel, importRowPlace, isDiscardable, isEndpointUnavailable, isImportJobRunning, reminderEmailTotal, reminderImpactCurrentCount, precheckImportFile, rollbackCountsText, rollbackCountsTotal, rollbackReasonLabel } from '@/app/features/imports/utils/import-labels.utils';
import { columnMapsToRequest, fieldLabel, IMPORT_CSV_FIELD, IMPORT_CSV_TEMPLATE_FILE, IMPORT_TABLES, initialColumnMaps, mappingConfidence, missingRequired, needsClinic } from '@/app/features/imports/utils/import-schema.utils';
import { IMPORT_VALUE_SKIP, valueChoicesToRequest } from '@/app/features/imports/utils/import-value-mapping.utils';
import { isTrialLimitError } from '@/app/shared/utils/api-error.utils';

const customers: ImportTableInfoDto = {
    table: 'customers',
    rowCount: 3,
    columns: [
        { source: 'Ad Soyad', suggested: 'AdSoyad', confidence: 'Exact', mapped: null },
        { source: 'Cep', suggested: 'Telefon', confidence: 'Alias', mapped: null },
        { source: 'Notlar', suggested: null, confidence: 'None', mapped: null }
    ]
};

const problem = (status: number, code?: string, extra: Record<string, unknown> = {}) => new HttpErrorResponse({ status, error: code ? { code, ...extra } : null });

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
        expect(missingRequired('pets', { HayvanAdi: 'a', Tur: 'b' })).toHaveLength(1);
        expect(missingRequired('pets', { HayvanAdi: 'a', Tur: 'b', MusteriNo: 'c' })).toEqual([]);
        expect(missingRequired('pets', { HayvanAdi: 'a', Tur: 'b', SahipAdSoyad: 'c', SahipTelefon: 'd' })).toEqual([]);
        expect(missingRequired('vaccinations', { AsiAdi: 'a', UygulamaTarihi: 'b' })).toHaveLength(1);
        expect(missingRequired('vaccinations', { AsiAdi: 'a', UygulamaTarihi: 'b', HayvanNo: 'c' })).toEqual([]);
    });

    it('hasta no/adı API anahtarı (HayvanNo/HayvanAdi) değişmeden "hasta" etiketiyle gösterilir; bilinmeyen anahtar olduğu gibi kalır', () => {
        expect(fieldLabel('pets', 'HayvanNo')).toBe('Hasta no');
        expect(fieldLabel('pets', 'HayvanAdi')).toBe('Hasta adı');
        expect(fieldLabel('vaccinations', 'HayvanNo')).toBe('Hasta no');
        expect(fieldLabel('vaccinations', 'HayvanAdi')).toBe('Hasta adı');
        expect(fieldLabel('pets', 'Tur')).toBe('Tür');
        expect(fieldLabel('pets', 'Bilinmeyen')).toBe('Bilinmeyen');
        expect(missingRequired('pets', { MusteriNo: 'c' })).toEqual(['Hasta adı', 'Tür']);
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

    it('seçilen programın hazır eşlemesi ayrı güvenle görünür (TIER-021)', () => {
        const evet = [{ source: 'Adı', suggested: 'AdSoyad', confidence: 'Profile' as const, mapped: null }];

        expect(mappingConfidence(evet, 'Adı', 'AdSoyad')).toBe('Profile');
        expect(initialColumnMaps([{ table: 'customers', rowCount: 1, columns: evet }]).customers).toEqual({ AdSoyad: 'Adı' });
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

    it('satır yeri: E-vet geçmiş görevinden gelen klinik geçmiş satırı Randevu Listesi satırıyla gösterilir', () => {
        expect(importRowPlace('clinicalRecords', 12, 'EVet')).toBe('Klinik geçmiş · satır 12');
        expect(importRowPlace('clinicalRecords', 1_000_245, 'EVet')).toBe('Klinik geçmiş · Randevu Listesi satır 245');
        expect(importRowPlace('clinicalRecords', 1_000_245, 'Generic')).toBe('Klinik geçmiş · satır 1000245');
        expect(importRowPlace('pets', 1_000_245, 'EVet')).toBe('Hastalar · satır 1000245');
    });

    it('arka plan işi süren durumlar: doğrulama, uygulama, geri alma; Validating taslak olsa da silinemez', () => {
        expect(['Validating', 'Committing', 'RollingBack'].every(isImportJobRunning)).toBe(true);
        expect(['Mapped', 'Validated', 'ValidationFailed', 'Committed'].some(isImportJobRunning)).toBe(false);
        expect(isDiscardable('Validating')).toBe(false);
    });

    it('uç yokluğunu (gövdesiz 404, 405, 501) gerçek "kayıt yok"tan ayırır', () => {
        expect(isEndpointUnavailable(problem(404))).toBe(true);
        expect(isEndpointUnavailable(problem(405))).toBe(true);
        expect(isEndpointUnavailable(problem(501))).toBe(true);
        expect(isEndpointUnavailable(problem(404, 'Imports.BatchNotFound'))).toBe(false);
        expect(isEndpointUnavailable(problem(409, 'Imports.InvalidState'))).toBe(false);
    });

    it('mükerrer dosya yanıtından mevcut parti kimliğini okur', () => {
        expect(duplicateBatchId(problem(409, 'Imports.DuplicateFile', { extensions: { batchId: 'b-1' } }))).toBe('b-1');
        expect(duplicateBatchId(problem(409, 'Imports.DuplicateFile'))).toBeNull();
        expect(duplicateBatchId(problem(409, 'Imports.InvalidState', { extensions: { batchId: 'b-1' } }))).toBeNull();
    });

    it('içe aktarma hata kodlarını Türkçe mesaja çevirir', () => {
        expect(importErrorMessage(problem(409, 'Imports.ValidationStale'), 'x')).toContain('Yeniden doğrulayın');
    });

    it('422 Trial.ImportLimitExceeded: sunucunun detail metni gösterilir ve deneme kısıtı olarak tanınır; ücretli Imports.TooManyRows değişmez (TRIAL-004)', () => {
        const detail = 'Deneme sürümünde içe aktarma tablo başına en fazla 500 satır sınırı (Müşteriler tablosu aşıyor); abonelikle kalkar.';
        const trial = problem(422, 'Trial.ImportLimitExceeded', { detail });

        expect(importErrorMessage(trial, 'x')).toBe(detail);
        expect(isTrialLimitError(trial)).toBe(true);
        expect(importErrorMessage(problem(400, 'Imports.TooManyRows'), 'x')).toContain('10.000');
        expect(isTrialLimitError(problem(400, 'Imports.TooManyRows'))).toBe(false);
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

describe('tam geçiş tabloları (sözleşme 12)', () => {
    it('klinik geçmiş ve randevu hasta bağlantısı ister; hasta no tek başına yeter', () => {
        expect(missingRequired('clinicalRecords', { Tarih: 'Tarih' })).toEqual(['Hasta no (veya sahip ad soyad + telefon + hasta adı + tür)']);
        expect(missingRequired('clinicalRecords', { Tarih: 'Tarih', HayvanNo: 'No' })).toEqual([]);
        expect(missingRequired('appointments', { HayvanNo: 'No' })).toEqual(['Tarih']);
    });

    it('hesap hareketi müşteri bağlantısı, tarih, işlem türü ve tutar ister', () => {
        expect(missingRequired('accountEntries', { MusteriNo: 'No', Tarih: 'T' })).toEqual(['İşlem türü', 'Tutar']);
        expect(missingRequired('accountEntries', { Tarih: 'T', IslemTuru: 'Tür', Tutar: 'Tutar' })).toEqual(['Müşteri no (veya sahip ad soyad + telefon)']);
        expect(missingRequired('accountEntries', { SahipAdSoyad: 'Ad', SahipTelefon: 'Tel', Tarih: 'T', IslemTuru: 'Tür', Tutar: 'Tutar' })).toEqual([]);
    });

    it('ürün yalnız ad ister ve kliniğe bağlı değildir', () => {
        expect(missingRequired('products', {})).toEqual(['Ad']);
        expect(needsClinic(['customers', 'pets', 'products'])).toBe(false);
        expect(needsClinic(['customers', 'accountEntries'])).toBe(true);
        expect(needsClinic(['appointments'])).toBe(true);
    });

    it('her tablonun CSV alanı ve şablon dosya adı vardır', () => {
        for (const t of IMPORT_TABLES) {
            expect(IMPORT_CSV_FIELD[t]).toMatch(/File$/);
            expect(IMPORT_CSV_TEMPLATE_FILE[t]).toMatch(/^vetinity-iceaktar-.+\.csv$/);
        }

        expect(IMPORT_CSV_FIELD.clinicalRecords).toBe('clinicalRecordsFile');
    });

    it('eksik alanlar (2026-11-12): müşteri notu, ürün KDV oranı ve alış fiyatı etiketli; yeni uyarı kodları Türkçe', () => {
        expect(fieldLabel('customers', 'Not')).toBe('Not');
        expect(fieldLabel('products', 'KdvOrani')).toBe('KDV oranı');
        expect(fieldLabel('products', 'AlisFiyati')).toBe('Alış fiyatı');
        expect(importIssueLabel('Imports.VatRateInvalid')).toBe('KDV oranı okunamadı; ürün klinik varsayılan KDV oranıyla aktarılır');
        expect(importIssueLabel('Imports.PurchasePriceInvalid')).toBe('Alış fiyatı okunamadı; boş aktarılır');
    });

    it('yeni kural ve geri alma kodlarının Türkçe etiketi vardır', () => {
        for (const code of ['Imports.CreditBalanceNotImported', 'Imports.ClinicalRecordEmpty', 'Imports.PastAppointmentSkipped', 'Imports.EntryKindUnrecognized', 'Imports.CategoryUnmapped']) {
            expect(importIssueLabel(code)).not.toBe(code);
        }

        for (const code of ['AppointmentChanged', 'ProductModified', 'HasStock', 'OpeningBalanceChanged', 'HasOtherClinicalRecords']) {
            expect(rollbackReasonLabel(code)).not.toBe(code);
        }
    });

    it('geri alma sayılarında yeni anahtarlar yalnız doluysa yazılır', () => {
        expect(rollbackCountsText({ clients: 1, pets: 2, vaccinations: 0 })).toBe('1 müşteri · 2 hasta · 0 aşı');
        expect(rollbackCountsText({ clients: 1, pets: 0, vaccinations: 0, clinicalRecords: 4, openingBalances: 1, products: 0 })).toBe('1 müşteri · 0 hasta · 0 aşı · 4 klinik kayıt · 1 devir bakiyesi');
        expect(rollbackCountsTotal({ clients: 0, pets: 0, vaccinations: 0, appointments: 3 })).toBe(3);
    });

    it('hatırlatma onayı aşı + randevu toplamını kullanır; eski yanıtta aşı sayısına düşer', () => {
        const base = { emailsWithinReminderWindow: 5 } as ImportReminderImpactDto;

        expect(reminderEmailTotal(base)).toBe(5);
        expect(reminderEmailTotal({ ...base, totalEmailsWithinReminderWindow: 8 })).toBe(8);
        expect(reminderImpactCurrentCount(problem(409, 'Imports.ReminderImpactChanged', { extensions: { emailsWithinReminderWindow: 3, totalEmailsWithinReminderWindow: 7 } }))).toBe(7);
        expect(reminderImpactCurrentCount(problem(409, 'Imports.ReminderImpactChanged', { extensions: { emailsWithinReminderWindow: 3 } }))).toBe(3);
    });
});
