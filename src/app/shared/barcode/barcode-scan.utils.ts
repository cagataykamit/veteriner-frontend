/** Kameranın açılamama sebebi; her birinde elle barkod girişi açık kalır (TIER-006). */
export type BarcodeCameraFailure = 'insecure-context' | 'unsupported' | 'permission-denied' | 'no-camera' | 'camera-error';

export const BARCODE_CAMERA_FAILURE_MESSAGES: Readonly<Record<BarcodeCameraFailure, string>> = {
    'insecure-context': 'Kamera yalnız güvenli bağlantıda (https) açılır. Barkodu elle yazabilirsiniz.',
    unsupported: 'Bu tarayıcı kamerayı açamıyor. Barkodu elle yazabilirsiniz.',
    'permission-denied': 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verebilir ya da barkodu elle yazabilirsiniz.',
    'no-camera': 'Bu cihazda kullanılabilir kamera bulunamadı. Barkodu elle yazabilirsiniz.',
    'camera-error': 'Kamera açılamadı. Barkodu elle yazabilirsiniz.'
};

/** Kamera bu sayfada denenebilir mi: tarayıcı kamerayı yalnız güvenli bağlamda (https ya da localhost) verir. */
export function barcodeCameraUnavailableReason(win: Pick<Window, 'isSecureContext' | 'navigator'> = window): BarcodeCameraFailure | null {
    if (!win.isSecureContext) {
        return 'insecure-context';
    }

    return typeof win.navigator.mediaDevices?.getUserMedia === 'function' ? null : 'unsupported';
}

/** `getUserMedia` hatasını kullanıcıya gösterilecek sebebe çevirir. */
export function barcodeCameraFailureFromError(error: unknown): BarcodeCameraFailure {
    const name = error instanceof Error || error instanceof DOMException ? error.name : '';

    switch (name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'permission-denied';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return 'no-camera';
        default:
            return 'camera-error';
    }
}

/** GS1 sembol tanıtıcısı (`]d2` DataMatrix, `]Q3` QR) ve baştaki FNC1 (GS) atılınca `01` + 14 haneli GTIN gelir. */
const GS1_SYMBOLOGY_ID = /^\][A-Za-z]\d/;
const GS1_GROUP_SEPARATOR = String.fromCharCode(29);
const GS1_GTIN = /^01(\d{14})/;

function gs1Gtin(value: string): string | null {
    const body = value.replace(GS1_SYMBOLOGY_ID, '');

    return GS1_GTIN.exec(body.startsWith(GS1_GROUP_SEPARATOR) ? body.slice(1) : body)?.[1] ?? null;
}

/**
 * Okunan değeri ürün kartındaki barkod biçimine çevirir. İlaç kutusundaki GS1 karekod (DataMatrix/QR) GTIN, seri, parti ve son
 * kullanma tarihini birlikte taşır; ürünü bulmak için yalnız GTIN alınır. GTIN-14 başındaki 0 atılarak EAN-13 olur, kutudaki
 * çizgi barkodla aynı değer çıkar. Diğer okumalar olduğu gibi (kenar boşluğu atılarak) döner.
 */
export function normalizeScannedBarcode(rawValue: string, format?: string): string {
    const value = rawValue.trim();

    if (format === 'data_matrix' || format === 'qr_code') {
        const gtin = gs1Gtin(value);

        if (gtin) {
            return gtin.startsWith('0') ? gtin.slice(1) : gtin;
        }
    }

    return value;
}
