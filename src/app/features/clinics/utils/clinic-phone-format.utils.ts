import { CLINIC_PHONE_MAX } from '@/app/features/clinics/utils/clinic-profile-form.validators';

/** Liste/detay boş gösterim — `CLIENT_PHONE_DISPLAY_PLACEHOLDER` ile uyumlu. */
export const CLINIC_PHONE_DISPLAY_PLACEHOLDER = '—';

/**
 * Klinik telefonu — salt liste/detay gösterimi.
 */
export function formatClinicPhoneForDisplay(value: string | null | undefined): string {
    const t = (value ?? '').trim();
    if (!t || t === CLINIC_PHONE_DISPLAY_PLACEHOLDER) {
        return CLINIC_PHONE_DISPLAY_PLACEHOLDER;
    }
    const d = t.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('0')) {
        return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`;
    }
    if (d.length === 10) {
        return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
    }
    return t;
}

/** +90 5… → 05… (en fazla 11 rakam) — input formatı için. */
function digitsForTrClinicInput(d: string): string {
    let x = d.replace(/\D/g, '');
    if (x.length >= 12 && x.startsWith('90') && x[2] === '5') {
        x = `0${x.slice(2)}`;
    }
    return x.slice(0, 11);
}

/**
 * Form input gösterimi — blur / patch sonrası okunabilir gruplama.
 * Kısmi girişte 0 ile başlayan sabit hat desenine göre boşluklar.
 */
export function formatClinicPhoneForInput(value: string | null | undefined): string {
    const t = (value ?? '').trim();
    if (!t) {
        return '';
    }
    const dRaw = t.replace(/\D/g, '');
    if (!dRaw) {
        return t.trim();
    }
    const d = digitsForTrClinicInput(dRaw);
    if (!d) {
        return '';
    }
    if (d.startsWith('0')) {
        if (d.length <= 4) {
            return d;
        }
        if (d.length <= 7) {
            return `${d.slice(0, 4)} ${d.slice(4)}`;
        }
        return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 11)}`;
    }
    const d10 = d.slice(0, 10);
    if (d10.length <= 3) {
        return d10;
    }
    if (d10.length <= 6) {
        return `${d10.slice(0, 3)} ${d10.slice(3)}`;
    }
    return `${d10.slice(0, 3)} ${d10.slice(3, 6)} ${d10.slice(6)}`;
}

/**
 * API gövdesi — yalnız rakam; boş → `null`; boşluk gönderilmez.
 * `+90 5XX…` → `05XXXXXXXXX` (11 hane) tercih edilir.
 */
export function normalizeClinicPhoneForApi(value: string | null | undefined): string | null {
    const d = (value ?? '').replace(/\D/g, '');
    if (!d) {
        return null;
    }
    const capped = d.slice(0, CLINIC_PHONE_MAX);
    if (capped.length >= 12 && capped.startsWith('90') && capped[2] === '5') {
        return `0${capped.slice(2, 12)}`;
    }
    return capped;
}
