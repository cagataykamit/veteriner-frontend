/**
 * Doğum tarihinden (`yyyy-MM-dd` veya ISO) yaş metni. Tarih yoksa/geçersizse `null` — uydurma değer üretilmez.
 */
export function formatPetAgeTr(birthDate: string | null | undefined, now: Date = new Date()): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate?.trim() ?? '');
    if (!m) {
        return null;
    }
    const by = Number(m[1]);
    const bm = Number(m[2]);
    const bd = Number(m[3]);
    let months = (now.getFullYear() - by) * 12 + (now.getMonth() + 1 - bm);
    if (now.getDate() < bd) {
        months -= 1;
    }
    if (months < 0 || bm < 1 || bm > 12) {
        return null;
    }
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (years === 0) {
        return rest === 0 ? '1 aydan küçük' : `${rest} aylık`;
    }
    return rest === 0 ? `${years} yaşında` : `${years} yıl ${rest} ay`;
}
