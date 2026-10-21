/** Standart hayvan mikroçipi (ISO 11784/11785) 15 rakamdır. */
export const PET_MICROCHIP_STANDARD_LENGTH = 15;

export const PET_MICROCHIP_FORMAT_WARNING =
    'Mikroçip numarası genellikle 15 rakamdan oluşur; HBS kaydı için numarayı kontrol edin. Kayıt yine de yapılabilir.';

/**
 * Çip no biçim uyarısı (ADR-036 Dilim 1): engelleme değil, yalnız uyarı. Boş veya 15 rakam ise uyarı yok;
 * API biçim zorlamaz (`INVOICING_IDENTITY_API_CONTRACT.md` §4). Kural yalnızca burada yaşar.
 */
export function petMicrochipFormatWarning(value: string | null | undefined): string | null {
    const text = value?.trim() ?? '';

    if (!text) {
        return null;
    }

    return new RegExp(`^\\d{${PET_MICROCHIP_STANDARD_LENGTH}}$`).test(text) ? null : PET_MICROCHIP_FORMAT_WARNING;
}
