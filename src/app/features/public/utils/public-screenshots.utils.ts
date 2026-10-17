/**
 * Tanıtım ekran görüntüleri (WEB-005): panelden, yalnız "TEST"/"ÖRNEK" adlı yerel geliştirme kayıtlarıyla alındı.
 * Her görüntünün açık ve koyu tema eşi `public/marketing/screens/` altında WebP; `width`/`height` CLS için gerçek piksel.
 */

export type PublicScreenshotKey =
    | 'bugun'
    | 'muayene'
    | 'kesinlestirme'
    | 'musteriBakiye'
    | 'gunSonu'
    | 'hastaKarti'
    | 'stok'
    | 'asiDefteri'
    | 'kvkkFormu';

export interface PublicScreenshotDef {
    /** Dosya adı kökü: `<file>-light.webp` ve `<file>-dark.webp`. */
    readonly file: string;
    readonly width: number;
    readonly height: number;
    /** Ne gösterdiğini söyleyen alt metni. */
    readonly alt: string;
}

const SCREENS_DIR = '/marketing/screens';

export const PUBLIC_SCREENSHOTS: Readonly<Record<PublicScreenshotKey, PublicScreenshotDef>> = {
    bugun: {
        file: 'bugun',
        width: 1536,
        height: 900,
        alt: 'Bugün ekranı: bekleyen beş hasta, biri acil işaretli, biri önceki günden açık ve uzun bekleme uyarılı; muayenesi süren iki hasta ve açık işler çipleri'
    },
    muayene: {
        file: 'muayene',
        width: 1536,
        height: 900,
        alt: 'Muayene kaydı: şikâyet, anamnez, klinik bulgular, kilo, ateş, nabız ve solunum; sağda kesinleştirme kontrol listesi'
    },
    kesinlestirme: {
        file: 'kesinlestirme',
        width: 940,
        height: 560,
        alt: 'Taslak muayene kaydı ve kesinleştirme kontrolü: tanı ve plan girildi, bağlı işlem uyarısı, Kesinleştir düğmesi'
    },
    musteriBakiye: {
        file: 'musteri-bakiye',
        width: 1238,
        height: 1050,
        alt: 'Müşteri kartı: açık borç, ücret bekleyen işlem, hastaları, yapılacaklar ve kartla alınmış son ödeme'
    },
    gunSonu: {
        file: 'gun-sonu',
        width: 1238,
        height: 1088,
        alt: 'Gün sonu raporu: brüt ve net ücret, ödeme türüne ve güne göre tahsilat, açık işler'
    },
    hastaKarti: {
        file: 'hasta-karti',
        width: 1238,
        height: 1050,
        alt: 'Hasta kartı: sahip ve açık borç, son geliş, sonraki randevu, klinik özet ve gecikmiş aşı uyarılı yapılacaklar listesi'
    },
    stok: {
        file: 'stok',
        width: 1238,
        height: 650,
        alt: 'Stok durumu: ürün başına kullanılabilir ve süresi geçmiş miktar, minimum seviye ve durum'
    },
    asiDefteri: {
        file: 'asi-defteri',
        width: 1238,
        height: 750,
        alt: 'Aşı Kayıt Defteri: tarih aralığı süzgeci, Excel, CSV ve yazdırma; seri numarası, son kullanma tarihi ve firmayla aşı girişleri'
    },
    kvkkFormu: {
        file: 'kvkk-formu',
        width: 671,
        height: 365,
        alt: 'KVKK açık rıza formu yazdırma görünümü: kabul ve ret seçenekleri, veri sahibinin adı, tarih ve imza alanı'
    }
};

export function publicScreenshotSrc(def: PublicScreenshotDef, theme: 'light' | 'dark'): string {
    return `${SCREENS_DIR}/${def.file}-${theme}.webp`;
}
