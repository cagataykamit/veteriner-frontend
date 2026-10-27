import { appointmentStatusLabel } from '@/app/entities/appointment/utils/appointment-status.utils';
import { appointmentTypeLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import type { ClientDataExportDto, ClientDataExportSectionDto } from '@/app/features/clients/models/client-data-export-api.model';
import { clientContactChannelLabel, parseClientContactChannel } from '@/app/features/clients/utils/client-contact-preference.utils';
import { formatClientInvoicingSummary, mapClientInvoicingSummaryDtoToVm } from '@/app/features/clients/utils/client-invoicing.utils';
import { kvkkConsentStatusLabel, parseKvkkConsentStatus } from '@/app/features/clients/utils/client-kvkk-consent.utils';
import { examinationStatusLabel } from '@/app/entities/examination/utils/examination-status.utils';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { parsePetLifeStatus, petGenderLabel, petLifeStatusLabel } from '@/app/features/pets/utils/pet-status.utils';
import { vaccinationStatusLabel } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import { formatDateDisplay, formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalDateTimeDisplay, localDateTimeYyyyMmDd_HHmmForFileName } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

/**
 * Müşteri veri kopyası (ADR-032 madde 2, `CLIENT_DATA_EXPORT_API_CONTRACT.md`): sunucu yanıtını yazdırılabilir başlık/değer ve tablo satırlarına
 * çevirir. İçerik sunucunun verdiğiyle sınırlıdır (iç alanlar zaten gelmez); burada yalnız etiketleme ve biçim yapılır.
 */

const EM = '—';

export interface DataExportFact {
    label: string;
    value: string;
}

export interface DataExportTable {
    key: string;
    title: string;
    columns: readonly string[];
    rows: string[][];
    isTruncated: boolean;
}

const text = (v: string | null | undefined): string => (v?.trim() ? v.trim() : EM);
const date = (v: string | null | undefined): string => (v ? formatDateDisplay(v) || EM : EM);
const utcDate = (v: string | null | undefined): string => (v ? formatUtcIsoAsLocalDateDisplay(v) || EM : EM);
const utcDateTime = (v: string | null | undefined): string => (v ? formatUtcIsoAsLocalDateTimeDisplay(v) || EM : EM);
const voidedLabel = (isVoided: boolean, voidedAtUtc: string | null): string => (isVoided ? `İptal edildi · ${utcDate(voidedAtUtc)}` : 'Geçerli');

export function clientDataExportClientFacts(dto: ClientDataExportDto): DataExportFact[] {
    const c = dto.client;

    return [
        { label: 'Ad soyad', value: text(c.fullName) },
        { label: 'Telefon', value: c.phone ? formatClientPhoneForDisplay(c.phone) : EM },
        { label: 'E-posta', value: text(c.email) },
        { label: 'Adres', value: text(c.address) },
        { label: 'Kayıt tarihi', value: utcDate(c.createdAtUtc) },
        { label: 'Tercih edilen iletişim kanalı', value: clientContactChannelLabel(parseClientContactChannel(c.preferredContactChannel)) },
        { label: 'Otomatik hatırlatma', value: c.remindersOptedOut ? 'İstemiyor' : 'Alıyor' },
        { label: 'Fatura bilgileri', value: invoicingText(c.invoicing) }
    ];
}

/** Sunucu TCKN/VKN'yi yalnız maskeli verir (ADR-036); kart satırıyla aynı biçim. */
function invoicingText(dto: ClientDataExportDto['client']['invoicing']): string {
    const vm = mapClientInvoicingSummaryDtoToVm(dto);

    return vm ? formatClientInvoicingSummary(vm) : EM;
}

export function clientDataExportKvkkFacts(dto: ClientDataExportDto): DataExportFact[] {
    const k = dto.kvkkConsent;

    return [
        { label: 'Açık rıza durumu', value: kvkkConsentStatusLabel(parseKvkkConsentStatus(k.status)) },
        { label: 'Form tarihi', value: date(k.recordedOn) },
        { label: 'İşaretleyen', value: text(k.recordedByName) }
    ];
}

export function clientDataExportBalanceFacts(dto: ClientDataExportDto): DataExportFact[] {
    const b = dto.balance;

    return [
        { label: 'Ücret toplamı', value: formatMoney(b.chargedAmount, b.currency) },
        { label: 'Ödenen', value: formatMoney(b.allocatedAmount, b.currency) },
        { label: 'Kalan', value: formatMoney(b.outstandingAmount, b.currency) },
        { label: 'Ücrete bağlanmamış ödeme', value: formatMoney(b.unallocatedPaymentAmount, b.currency) }
    ];
}

function table<T>(key: string, title: string, columns: readonly string[], section: ClientDataExportSectionDto<T>, row: (item: T) => string[]): DataExportTable {
    return { key, title, columns, rows: section.items.map(row), isTruncated: section.isTruncated };
}

/** Bölüm tabloları sözleşmedeki sırayla; iptal edilmiş kayıtlar durum sütununda işaretlidir. */
export function clientDataExportTables(dto: ClientDataExportDto): DataExportTable[] {
    return [
        table('pets', 'Hastalar', ['Ad', 'Tür', 'Irk', 'Cinsiyet', 'Doğum tarihi', 'Kısırlaştırılmış', 'Mikroçip', 'Karne / küpe no', 'HBS kimlik no', 'Durum'], dto.pets, (p) => {
            const status = parsePetLifeStatus(p.status);

            return [
                text(p.name),
                text(p.speciesName),
                text(p.breed),
                petGenderLabel(p.gender),
                date(p.birthDate),
                p.isNeutered ? 'Evet' : 'Hayır',
                text(p.microchipNumber),
                text(p.passportOrTagNumber),
                text(p.hbsAnimalId),
                status === 'Deceased' && p.deceasedOn ? `${petLifeStatusLabel(status)} · ${date(p.deceasedOn)}` : petLifeStatusLabel(status)
            ];
        }),
        table('appointments', 'Randevular', ['Tarih', 'Hasta', 'Tür', 'Süre', 'Durum'], dto.appointments, (a) => [
            utcDateTime(a.scheduledAtUtc),
            text(a.petName),
            appointmentTypeLabel(a.appointmentType),
            `${a.durationMinutes} dk`,
            appointmentStatusLabel(a.status)
        ]),
        table('examinations', 'Muayene özetleri', ['Tarih', 'Hasta', 'Şikâyet', 'Değerlendirme', 'Durum'], dto.examinations, (e) => [
            utcDateTime(e.examinedAtUtc),
            text(e.petName),
            text(e.complaint),
            text(e.assessment),
            examinationStatusLabel(e.status)
        ]),
        table('vaccinations', 'Aşılar', ['Aşı', 'Hasta', 'Uygulama tarihi', 'Planlanan tarih', 'Durum'], dto.vaccinations, (v) => [
            text(v.vaccineName),
            text(v.petName),
            utcDate(v.appliedAtUtc),
            utcDate(v.dueAtUtc),
            vaccinationStatusLabel(v.status)
        ]),
        table('treatments', 'Tedaviler', ['Tarih', 'Hasta', 'Başlık'], dto.treatments, (t) => [utcDate(t.treatmentDateUtc), text(t.petName), text(t.title)]),
        table('prescriptions', 'Reçeteler', ['Tarih', 'Hasta', 'Başlık', 'Ürünler'], dto.prescriptions, (p) => [
            utcDate(p.prescribedAtUtc),
            text(p.petName),
            text(p.title),
            p.itemNames.length ? p.itemNames.join(', ') : EM
        ]),
        table('charges', 'Ücretler', ['Tarih', 'Açıklama', 'Hasta', 'Tutar', 'Ödenen', 'Kalan', 'Durum'], dto.charges, (c) => [
            utcDate(c.createdAtUtc),
            text(c.description),
            text(c.petName),
            formatMoney(c.amount, c.currency),
            formatMoney(c.allocatedAmount, c.currency),
            formatMoney(c.outstandingAmount, c.currency),
            voidedLabel(c.isVoided, c.voidedAtUtc)
        ]),
        table('payments', 'Ödemeler', ['Tarih', 'Yöntem', 'Hasta', 'Tutar', 'Ücrete bağlanan', 'Bağlanmamış', 'Durum'], dto.payments, (p) => [
            utcDate(p.paidAtUtc),
            paymentMethodLabel(p.method),
            text(p.petName),
            formatMoney(p.amount, p.currency),
            formatMoney(p.allocatedAmount, p.currency),
            formatMoney(p.unallocatedAmount, p.currency),
            voidedLabel(p.isVoided, p.voidedAtUtc)
        ])
    ];
}

/** İndirilen dosya: sunucu yanıtı olduğu gibi, okunur girintiyle. Dosya adında kişisel veri yok. */
export function clientDataExportJson(dto: ClientDataExportDto): string {
    return JSON.stringify(dto, null, 2);
}

export function clientDataExportFileName(at: Date = new Date()): string {
    return `veri-kopyasi-${localDateTimeYyyyMmDd_HHmmForFileName(at)}.json`;
}
