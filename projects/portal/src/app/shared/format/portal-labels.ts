import type { PortalAppointmentStatus, PortalAppointmentType } from '@portal/app/features/appointments/portal-appointments.api';
import type { PortalPaymentMethod } from '@portal/app/features/balance/portal-balance.api';
import type { PortalAppointmentRequestStatus } from '@portal/app/features/booking/portal-booking.api';
import type { PortalDayOfWeek } from '@portal/app/features/clinic/portal-clinic.api';
import type { PortalDataRequestStatus, PortalDataRequestType } from '@portal/app/features/data-requests/portal-data-requests.api';
import type { PortalPetGender } from '@portal/app/features/pets/portal-pets.api';

/**
 * Sözleşme enum metinleri (§6) → hasta sahibine Türkçe etiket. Tek yer; bilinmeyen değer gelirse
 * ham kod yerine nötr bir metin gösterilir.
 */
export const APPOINTMENT_TYPE_LABELS: Readonly<Record<PortalAppointmentType, string>> = {
    Examination: 'Muayene',
    Vaccination: 'Aşı',
    Checkup: 'Kontrol',
    Surgery: 'Operasyon',
    Grooming: 'Bakım',
    Consultation: 'Danışma',
    Other: 'Randevu'
};

/** Rozet tonu: `info` planlı, `neutral` geçmiş/sonlanmış. Renk tek başına anlam taşımaz; metin her zaman yazılır. */
export type PortalBadgeTone = 'info' | 'success' | 'neutral' | 'warning';

export const APPOINTMENT_STATUS_LABELS: Readonly<Record<PortalAppointmentStatus, { readonly label: string; readonly tone: PortalBadgeTone }>> = {
    Scheduled: { label: 'Planlandı', tone: 'info' },
    Completed: { label: 'Tamamlandı', tone: 'success' },
    Cancelled: { label: 'İptal edildi', tone: 'neutral' },
    NoShow: { label: 'Gelinmedi', tone: 'warning' }
};

/** Randevu talebi durumu (ADR-042 K4); backend metin döner (sözleşme §13.4), eski sayısal değer sıra numarasıyla okunur. */
const APPOINTMENT_REQUEST_STATUSES: readonly { readonly name: string; readonly label: string; readonly tone: PortalBadgeTone }[] = [
    { name: 'Pending', label: 'Bekliyor', tone: 'warning' },
    { name: 'Approved', label: 'Onaylandı', tone: 'success' },
    { name: 'Rejected', label: 'Reddedildi', tone: 'neutral' },
    { name: 'Cancelled', label: 'İptal edildi', tone: 'neutral' },
    { name: 'Expired', label: 'Süresi doldu', tone: 'neutral' }
];

export function appointmentRequestStatus(status: PortalAppointmentRequestStatus | string | number): { readonly name: string; readonly label: string; readonly tone: PortalBadgeTone } {
    const found = typeof status === 'number' ? APPOINTMENT_REQUEST_STATUSES[status] : APPOINTMENT_REQUEST_STATUSES.find((s) => s.name === status);

    return found ?? { name: 'Unknown', label: 'Bilinmiyor', tone: 'neutral' };
}

/** KVKK veri talebi türü (sözleşme §11): seçimde ad ve kısa açıklama. */
export const DATA_REQUEST_TYPES: readonly { readonly type: PortalDataRequestType; readonly label: string; readonly hint: string }[] = [
    { type: 'Access', label: 'Erişim', hint: 'Klinikte hakkımda hangi kayıtların tutulduğunu öğrenmek ve bir kopyasını almak istiyorum.' },
    { type: 'Rectification', label: 'Düzeltme', hint: 'Yanlış ya da eksik bilgilerimin düzeltilmesini istiyorum.' },
    { type: 'Erasure', label: 'Silme', hint: 'Kayıtlarımın silinmesini ya da anonimleştirilmesini istiyorum. Yasal saklama süresi olan kayıtlar süre bitene dek saklanabilir.' },
    { type: 'Objection', label: 'İtiraz', hint: 'Verilerimin işlenmesine itiraz ediyorum.' },
    { type: 'Other', label: 'Diğer', hint: 'Verilerimle ilgili başka bir talebim var.' }
];

const DATA_REQUEST_STATUS_LABELS: Readonly<Record<PortalDataRequestStatus, { readonly label: string; readonly tone: PortalBadgeTone }>> = {
    Open: { label: 'Kliniğe iletildi', tone: 'warning' },
    InProgress: { label: 'İnceleniyor', tone: 'info' },
    Completed: { label: 'Yanıtlandı', tone: 'success' },
    Rejected: { label: 'Reddedildi', tone: 'neutral' },
    Cancelled: { label: 'Geri çekildi', tone: 'neutral' }
};

export function dataRequestTypeLabel(type: string): string {
    return DATA_REQUEST_TYPES.find((t) => t.type === type)?.label ?? 'Diğer';
}

export function dataRequestStatus(status: string): { readonly label: string; readonly tone: PortalBadgeTone } {
    return DATA_REQUEST_STATUS_LABELS[status as PortalDataRequestStatus] ?? { label: 'Bilinmiyor', tone: 'neutral' };
}

export const PAYMENT_METHOD_LABELS: Readonly<Record<PortalPaymentMethod, string>> = {
    Cash: 'Nakit',
    Card: 'Kart',
    Transfer: 'Havale / EFT'
};

export const GENDER_LABELS: Readonly<Record<PortalPetGender, string>> = {
    Male: 'Erkek',
    Female: 'Dişi'
};

/** Pazartesi'den başlayan hafta sırası ve gün adları. */
export const WEEK_DAYS: readonly { readonly day: PortalDayOfWeek; readonly label: string }[] = [
    { day: 'Monday', label: 'Pazartesi' },
    { day: 'Tuesday', label: 'Salı' },
    { day: 'Wednesday', label: 'Çarşamba' },
    { day: 'Thursday', label: 'Perşembe' },
    { day: 'Friday', label: 'Cuma' },
    { day: 'Saturday', label: 'Cumartesi' },
    { day: 'Sunday', label: 'Pazar' }
];

export function appointmentTypeLabel(type: string): string {
    return APPOINTMENT_TYPE_LABELS[type as PortalAppointmentType] ?? 'Randevu';
}

export function appointmentStatus(status: string): { readonly label: string; readonly tone: PortalBadgeTone } {
    return APPOINTMENT_STATUS_LABELS[status as PortalAppointmentStatus] ?? { label: 'Bilinmiyor', tone: 'neutral' };
}

export function paymentMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method as PortalPaymentMethod] ?? 'Diğer';
}

export function genderLabel(gender: string | null): string {
    return gender ? (GENDER_LABELS[gender as PortalPetGender] ?? '') : '';
}

/** Kliniğin telefon numarası → `tel:` adresi (yalnız rakam ve `+`). Rakam yoksa `null`. */
export function telHref(phone: string | null | undefined): string | null {
    const digits = (phone ?? '').replace(/[^\d+]/g, '');

    return /\d/.test(digits) ? `tel:${digits}` : null;
}

/**
 * Telefon numarası gösterimi: Türkiye numarası gruplanır ("05439580091" → "0543 958 00 91", "+905439580091" →
 * "+90 543 958 00 91"); tanınmayan biçim olduğu gibi (kırpılmış) kalır. Kayıt değişmez, yalnız gösterim.
 */
export function formatPortalPhone(phone: string | null | undefined): string {
    const raw = (phone ?? '').trim();
    const digits = raw.replace(/\D/g, '');
    const group = (n: string): string => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)}`;

    if (digits.length === 11 && digits.startsWith('0')) {
        return `0${group(digits.slice(1))}`;
    }

    if (digits.length === 12 && digits.startsWith('90')) {
        return `+90 ${group(digits.slice(2))}`;
    }

    return raw;
}

/**
 * Kişi adı gösterimi: her kelimenin ilk harfi büyük (Türkçe kurallarıyla "i" → "İ"); geri kalan harflere dokunulmaz,
 * böylece "McAllister" gibi bilerek karışık yazılmış adlar bozulmaz. Kayıt değişmez, yalnız gösterim.
 */
export function formatPersonName(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
        .join(' ');
}
