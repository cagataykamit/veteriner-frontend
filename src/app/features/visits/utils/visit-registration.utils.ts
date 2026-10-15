/** Aranan metin yalnızca telefon karakterlerinden (rakam ve + ( ) - . / boşluk) oluşuyorsa telefon sayılır (backend arama kuralıyla aynı). */
const PHONE_LIKE = /^[\d+()\-./\s]+$/;

/** Hızlı kayıt formunu aranan metinle önceden doldurur: telefon biçimindeyse telefona, aksi halde sahip adına. */
export function splitSearchTermForRegistration(term: string): { fullName: string; phone: string } {
    const t = term.trim();

    if (!t) {
        return { fullName: '', phone: '' };
    }

    return PHONE_LIKE.test(t) && /\d/.test(t) ? { fullName: '', phone: t } : { fullName: t, phone: '' };
}
