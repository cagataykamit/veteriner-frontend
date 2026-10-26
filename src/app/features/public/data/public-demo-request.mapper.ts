import { DEMO_REQUEST_LIMITS, type PublicDemoRequestDto, type PublicDemoRequestField, type PublicDemoRequestForm } from '@/app/features/public/models/public-demo-request.model';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicDemoRequestFieldErrors = Partial<Record<PublicDemoRequestField, string>>;

/**
 * Sunucu kurallarının (sözleşme §2) istemci aynası; yalnız erken geri bildirim içindir, son söz backend'de.
 * Tuzak alan doluysa doğrulama yapılmaz (sunucu da yapmaz).
 */
export function validatePublicDemoRequestForm(form: PublicDemoRequestForm): PublicDemoRequestFieldErrors {
    if (form.website.trim()) {
        return {};
    }

    const errors: PublicDemoRequestFieldErrors = {};
    const contactName = form.contactName.trim();
    const clinicName = form.clinicName.trim();
    const email = form.email.trim();

    if (contactName.length < DEMO_REQUEST_LIMITS.minName || contactName.length > DEMO_REQUEST_LIMITS.contactName) {
        errors.contactName = 'Adınızı ve soyadınızı yazın.';
    }

    if (clinicName.length < DEMO_REQUEST_LIMITS.minName || clinicName.length > DEMO_REQUEST_LIMITS.clinicName) {
        errors.clinicName = 'Klinik adını yazın.';
    }

    if (!EMAIL_PATTERN.test(email) || email.length > DEMO_REQUEST_LIMITS.email) {
        errors.email = 'Geçerli bir e-posta adresi yazın.';
    }

    if (form.city.trim().length > DEMO_REQUEST_LIMITS.city) {
        errors.city = `Şehir en çok ${DEMO_REQUEST_LIMITS.city} karakter olabilir.`;
    }

    if (form.phone.trim().length > DEMO_REQUEST_LIMITS.phone) {
        errors.phone = `Telefon en çok ${DEMO_REQUEST_LIMITS.phone} karakter olabilir.`;
    }

    if (!form.clinicSize) {
        errors.clinicSize = 'Klinik büyüklüğünü seçin.';
    }

    if (form.currentSoftware.trim().length > DEMO_REQUEST_LIMITS.currentSoftware) {
        errors.currentSoftware = `En çok ${DEMO_REQUEST_LIMITS.currentSoftware} karakter olabilir.`;
    }

    if (form.message.trim().length > DEMO_REQUEST_LIMITS.message) {
        errors.message = `Mesaj en çok ${DEMO_REQUEST_LIMITS.message} karakter olabilir.`;
    }

    if (!form.privacyNoticeAccepted) {
        errors.privacyNoticeAccepted = 'Gizlilik politikasını okuduğunuzu onaylayın.';
    }

    return errors;
}

/** Form → istek gövdesi: kırpma, boş isteğe bağlı alan `null`. Geçerli formla çağrılır. */
export function mapPublicDemoRequestFormToRequest(form: PublicDemoRequestForm): PublicDemoRequestDto {
    return {
        contactName: form.contactName.trim(),
        clinicName: form.clinicName.trim(),
        city: optional(form.city),
        email: form.email.trim(),
        phone: optional(form.phone),
        clinicSize: form.clinicSize ?? 'SingleVet',
        currentSoftware: optional(form.currentSoftware),
        message: optional(form.message),
        privacyNoticeAccepted: form.privacyNoticeAccepted,
        website: optional(form.website)
    };
}

function optional(value: string): string | null {
    const trimmed = value.trim();

    return trimmed ? trimmed : null;
}
