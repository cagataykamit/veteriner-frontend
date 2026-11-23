import type { PublicScreenshotKey } from './public-screenshots.utils';

/** Ekran görüntüsünün bir parçası: kaynak görüntünün pikseliyle (sol, üst, genişlik, yükseklik). */
export interface PublicScreenshotCrop {
    readonly shot: PublicScreenshotKey;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

/**
 * Yakın çekimler. Yeni görsel dosyası yoktur: aynı WebP kutunun içinde büyütülüp kaydırılır (`PublicScreenshotComponent`).
 * `...Icerik` panelin sol menüsü ve üst çubuğu olmadan yalnız sayfa alanıdır (aynı genişlikte ~1,25 kat büyük okunur); diğerleri
 * tek bir kartın ya da listenin parçasıdır. `...Dar` parçalar telefon genişliği içindir (kaynakta en çok ~520 px): 375 px ekranda
 * yazı okunur kalır. Alanlar açık tema görüntüsüne göre seçildi; koyu eşler aynı piksel düzenindedir.
 */
export const PUBLIC_SCREENSHOT_CROPS = {
    bugunIcerik: { shot: 'bugun', x: 250, y: 62, w: 1160, h: 726 },
    bugunBekleyenler: { shot: 'bugun', x: 268, y: 210, w: 1128, h: 368 },
    bugunAcil: { shot: 'bugun', x: 284, y: 290, w: 770, h: 204 },
    muayeneIcerik: { shot: 'muayene', x: 252, y: 62, w: 1158, h: 770 },
    muayeneVital: { shot: 'muayene', x: 650, y: 420, w: 746, h: 410 },
    kesinlestirmeKontrol: { shot: 'kesinlestirme', x: 764, y: 330, w: 367, h: 248 },
    hastaIcerik: { shot: 'hastaKarti', x: 252, y: 62, w: 1158, h: 770 },
    hastaKlinikOzet: { shot: 'hastaKarti', x: 268, y: 372, w: 746, h: 360 },
    hastaBaslik: { shot: 'hastaKarti', x: 268, y: 96, w: 1128, h: 200 },
    musteriIcerik: { shot: 'musteriBakiye', x: 252, y: 62, w: 1158, h: 770 },
    musteriOzet: { shot: 'musteriBakiye', x: 268, y: 96, w: 1128, h: 234 },
    musteriYapilacak: { shot: 'musteriBakiye', x: 1030, y: 408, w: 366, h: 286 },
    stokIcerik: { shot: 'stok', x: 252, y: 62, w: 1158, h: 770 },
    stokTablo: { shot: 'stok', x: 296, y: 320, w: 1072, h: 340 },
    gunSonuIcerik: { shot: 'gunSonu', x: 252, y: 86, w: 1158, h: 720 },
    gunSonuTahsilat: { shot: 'gunSonu', x: 268, y: 98, w: 1128, h: 260 },
    gunSonuAcikIsler: { shot: 'gunSonu', x: 268, y: 644, w: 1128, h: 150 },
    defterIcerik: { shot: 'kayitDefteri', x: 252, y: 62, w: 1158, h: 770 },
    defterCikti: { shot: 'kayitDefteri', x: 268, y: 200, w: 700, h: 244 },
    defterSatirlar: { shot: 'kayitDefteri', x: 268, y: 460, w: 1128, h: 300 },
    telefonKart: { shot: 'telefonBugun', x: 0, y: 540, w: 780, h: 1050 },
    bugunDar: { shot: 'bugun', x: 284, y: 262, w: 420, h: 240 },
    muayeneDar: { shot: 'muayene', x: 660, y: 440, w: 400, h: 280 },
    hastaDar: { shot: 'hastaKarti', x: 280, y: 384, w: 380, h: 226 },
    stokDar: { shot: 'stok', x: 296, y: 322, w: 420, h: 270 },
    gunSonuDar: { shot: 'gunSonu', x: 280, y: 112, w: 440, h: 250 },
    defterDar: { shot: 'kayitDefteri', x: 296, y: 516, w: 520, h: 240 }
} as const satisfies Record<string, PublicScreenshotCrop>;

export type PublicScreenshotCropKey = keyof typeof PUBLIC_SCREENSHOT_CROPS;

export interface PublicFeatureVisual {
    /** Bölümün büyük görüntüsü: panel menüsü kırpılmış sayfa alanı. */
    readonly main: PublicScreenshotCropKey;
    /** Telefonda büyük görüntünün yerine geçen dar parça (aynı ekran görüntüsünden). */
    readonly phone: PublicScreenshotCropKey;
    /** Yakın çekimler; altyazı bölümün mevcut başlık ya da madde metninden. */
    readonly details: readonly { readonly crop: PublicScreenshotCropKey; readonly label: string }[];
}

const DAY_CLOSE_VISUAL: PublicFeatureVisual = {
    main: 'gunSonuIcerik',
    phone: 'gunSonuDar',
    details: [
        { crop: 'gunSonuTahsilat', label: 'Gün sonu raporu: tahsilat özeti, açık kalan işler' },
        { crop: 'gunSonuAcikIsler', label: 'Ücretlenmemiş işlemler; gün bitmeden kapanır' }
    ]
};

/** Özellikler bölümlerinin ve ana sayfa gün akışı adımlarının görselleri; anahtar bölüm ya da adım kimliğidir. */
export const PUBLIC_FEATURE_VISUALS: Readonly<Record<string, PublicFeatureVisual>> = {
    gelis: {
        main: 'bugunIcerik',
        phone: 'bugunDar',
        details: [
            { crop: 'bugunAcil', label: 'Acil işareti ve hasta uyarı rozetleri satırda görünür' },
            { crop: 'bugunBekleyenler', label: 'Randevulu ve randevusuz geliş tek listede' }
        ]
    },
    muayene: {
        main: 'muayeneIcerik',
        phone: 'muayeneDar',
        details: [
            { crop: 'muayeneVital', label: 'Şikâyet, bulgular, vital değerler, tanı ve plan bölümleri' },
            { crop: 'kesinlestirmeKontrol', label: 'Kesinleştirince kayıt kilitlenir' }
        ]
    },
    'hasta-karti': {
        main: 'hastaIcerik',
        phone: 'hastaDar',
        details: [
            { crop: 'hastaKlinikOzet', label: 'Kilo geçmişi muayene vitallerinden kendiliğinden oluşur' },
            { crop: 'hastaBaslik', label: 'Bir hastanın tüm geçmişi tek sayfada' }
        ]
    },
    tahsilat: {
        main: 'musteriIcerik',
        phone: 'musteriYapilacak',
        details: [
            { crop: 'musteriOzet', label: 'Kalan bakiye ve müşteri borcu her zaman görünür' },
            { crop: 'musteriYapilacak', label: 'Ödeme al: nakit ya da kart kaydı, kısmi ödeme, bakiye' }
        ]
    },
    stok: {
        main: 'stokIcerik',
        phone: 'stokDar',
        details: [{ crop: 'stokTablo', label: 'Düşük ve süresi geçmiş stok uyarısı' }]
    },
    raporlar: DAY_CLOSE_VISUAL,
    'gun-sonu': DAY_CLOSE_VISUAL
};

export interface PublicTimelineVisual {
    readonly crop: PublicScreenshotCropKey;
    /** Telefon ekranından alınmış parça telefon çerçevesinde gösterilir; değilse kart çerçevesinde. */
    readonly device: boolean;
}

/**
 * Ana sayfanın telefondaki zaman çizgisi (T-03 B): gün akışı adımı başına tek görsel; anahtar adım kimliğidir. Telefon ekranı
 * görüntüsü olan adım telefon çerçevesinde, diğerleri masaüstü ekranının dar parçasıyla kart çerçevesinde.
 */
export const PUBLIC_HOME_TIMELINE_VISUALS: Readonly<Record<string, PublicTimelineVisual>> = {
    gelis: { crop: 'telefonKart', device: true },
    muayene: { crop: 'kesinlestirmeKontrol', device: false },
    tahsilat: { crop: 'musteriYapilacak', device: false },
    'gun-sonu': { crop: 'gunSonuDar', device: false }
};
