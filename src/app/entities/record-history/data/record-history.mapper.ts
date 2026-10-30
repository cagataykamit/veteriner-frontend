import type { RecordChangeDto, RecordChangeKind, RecordChangeVm, RecordFieldChangeDto, RecordFieldChangeVm } from '@/app/entities/record-history/models/record-history.model';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

const KIND_LABELS: Record<RecordChangeKind, string> = {
    Created: 'Oluşturuldu',
    Updated: 'Değiştirildi',
    Deleted: 'Silindi'
};

/** Sunucu alan adı → etiket; tüm kayıt türlerinde aynı ad aynı anlamdadır. Bilinmeyen ad olduğu gibi gösterilir. */
const FIELD_LABELS: Record<string, string> = {
    ClinicId: 'Klinik',
    PetId: 'Hasta',
    AppointmentId: 'Randevu',
    VisitId: 'Geliş',
    ExaminationId: 'Bağlı muayene',
    TreatmentId: 'Bağlı tedavi',
    VaccinationId: 'Bağlı aşı kaydı',
    VaccineDefinitionId: 'Aşı tanımı',
    ProductId: 'Ürün',
    BatchId: 'Parti',
    RoomId: 'Oda',
    Title: 'Başlık',
    Description: 'Açıklama',
    Content: 'İçerik',
    Notes: 'Notlar',
    items: 'Reçete kalemleri',
    TreatmentDateUtc: 'Tedavi tarihi',
    PrescribedAtUtc: 'Reçete tarihi',
    FollowUpDateUtc: 'Takip tarihi',
    ExaminedAtUtc: 'Muayene zamanı',
    VisitReason: 'Geliş nedeni',
    Anamnesis: 'Anamnez',
    Findings: 'Bulgular',
    Assessment: 'Değerlendirme',
    Plan: 'Plan',
    WeightKg: 'Kilo (kg)',
    TemperatureC: 'Ateş (°C)',
    HeartRateBpm: 'Nabız (/dk)',
    RespiratoryRatePerMin: 'Solunum (/dk)',
    VitalsMeasuredAtUtc: 'Vital ölçüm zamanı',
    Status: 'Durum',
    FinalizedAtUtc: 'Kesinleşme zamanı',
    FinalizedByUserId: 'Kesinleştiren',
    VaccineName: 'Aşı adı',
    AppliedAtUtc: 'Uygulama zamanı',
    DueAtUtc: 'Planlanan tarih',
    HbsStatus: 'HBS durumu',
    HbsReferenceNumber: 'HBS numarası',
    HbsNotRequiredReason: 'HBS gerekmeme nedeni',
    HbsMarkedAtUtc: 'HBS işaret zamanı',
    HbsMarkedByUserId: 'HBS işaretleyen',
    TestName: 'Test adı',
    RequestedAtUtc: 'İstem zamanı',
    RequestedByUserId: 'İsteyen',
    ResultDateUtc: 'Sonuç tarihi',
    ResultText: 'Sonuç',
    Interpretation: 'Yorum',
    InterpretationRequired: 'Değerlendirme gerekli',
    CancelledAtUtc: 'İptal zamanı',
    CancelledByUserId: 'İptal eden',
    CancelReason: 'İptal gerekçesi',
    AdmittedAtUtc: 'Yatış zamanı',
    PlannedDischargeAtUtc: 'Planlanan taburcu',
    DischargedAtUtc: 'Taburcu zamanı',
    DischargeNote: 'Taburcu notu',
    Reason: 'Neden',
    Location: 'Konum',
    Quantity: 'Miktar',
    AdministeredAtUtc: 'Uygulama zamanı',
    VoidedAtUtc: 'İptal zamanı',
    VoidedByUserId: 'İptal eden',
    VoidReason: 'İptal gerekçesi',
    VoidStockOutcome: 'İptal stok sonucu',
    AddedAfterFinalization: 'Kesinleştirmeden sonra eklendi',
    LateEntryReason: 'Sonradan ekleme gerekçesi',
    // RECORD-005 (uygulama yolu/bölgesi). Yol değeri sunucu enum adıyla görünür; RECORD-005 dalı birleşince
    // `administrationRouteLabel` ile Türkçe etikete bağlanmalı (etiket orada tek yerde).
    Route: 'Uygulama yolu',
    Site: 'Uygulama bölgesi'
};

/** Enum adları; aynı ad farklı türlerde aynı anlamdadır. */
const VALUE_LABELS: Record<string, string> = {
    Draft: 'Taslak',
    Finalized: 'Kesinleşti',
    Scheduled: 'Planlandı',
    Applied: 'Uygulandı',
    Cancelled: 'İptal',
    Requested: 'İstendi',
    Resulted: 'Sonuçlandı',
    NotEntered: "HBS'e girilmedi",
    Entered: "HBS'e girildi",
    NotRequired: 'HBS gerekmiyor',
    StockReturned: 'Stoğa iade edildi',
    WrittenOff: 'Zarar / imha olarak yazıldı'
};

const EMPTY = '—';
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL = /^-?\d+\.\d+$/;

export function recordFieldLabel(field: string): string {
    return FIELD_LABELS[field] ?? field;
}

/** Sunucunun metin değerini (ISO tarih, invariant sayı, enum adı, guid) okunur metne çevirir. */
export function recordValueText(value: string | null): string {
    if (value == null || value === '') {
        return EMPTY;
    }

    if (GUID.test(value)) {
        return 'Bağlı kayıt';
    }

    if (ISO_INSTANT.test(value)) {
        return formatDateTimeDisplay(value);
    }

    if (ISO_DATE.test(value)) {
        return formatDateDisplay(value);
    }

    if (value === 'true' || value === 'false') {
        return value === 'true' ? 'Evet' : 'Hayır';
    }

    if (DECIMAL.test(value)) {
        return value.replace('.', ',');
    }

    return VALUE_LABELS[value] ?? value;
}

function mapField(c: RecordFieldChangeDto): RecordFieldChangeVm {
    const oldText = recordValueText(c.oldValue);
    let newText = recordValueText(c.newValue);

    // İki guid de "Bağlı kayıt" görünür; bağlantının değiştiği ayrıca söylenir.
    if (c.oldValue && c.newValue && GUID.test(c.oldValue) && GUID.test(c.newValue)) {
        newText = 'Başka bir kayda bağlandı';
    }

    return { label: recordFieldLabel(c.field), oldText, newText };
}

export function mapRecordChangeDtoToVm(dto: RecordChangeDto): RecordChangeVm {
    return {
        id: dto.id,
        kindLabel: KIND_LABELS[dto.kind] ?? dto.kind,
        occurredAtUtc: dto.occurredAtUtc,
        actorName: dto.actorName?.trim() || 'Bilinmeyen kullanıcı',
        changes: (dto.changes ?? []).map(mapField)
    };
}
