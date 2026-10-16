import type { PortalAppointmentStatus, PortalAppointmentType } from '@portal/app/features/appointments/portal-appointments.api';
import type { PortalPaymentMethod } from '@portal/app/features/balance/portal-balance.api';
import type { PortalDayOfWeek } from '@portal/app/features/clinic/portal-clinic.api';
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
