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
    bugunIcerik: { shot: 'bugun', x: 250, y: 62, w: 1176, h: 620 },
    bugunBekleyenler: { shot: 'bugun', x: 266, y: 172, w: 1146, h: 374 },
    bugunAcil: { shot: 'bugun', x: 268, y: 224, w: 700, h: 196 },
    muayeneIcerik: { shot: 'muayene', x: 250, y: 62, w: 1176, h: 770 },
    muayeneVital: { shot: 'muayene', x: 266, y: 472, w: 760, h: 372 },
    kesinlestirmeKontrol: { shot: 'kesinlestirme', x: 764, y: 334, w: 367, h: 282 },
    hastaIcerik: { shot: 'hastaKarti', x: 250, y: 62, w: 1176, h: 770 },
    hastaKlinikOzet: { shot: 'hastaKarti', x: 266, y: 376, w: 760, h: 368 },
    hastaBaslik: { shot: 'hastaKarti', x: 266, y: 94, w: 1146, h: 206 },
    musteriIcerik: { shot: 'musteriBakiye', x: 250, y: 62, w: 1176, h: 770 },
    musteriOzet: { shot: 'musteriBakiye', x: 266, y: 94, w: 1146, h: 270 },
    musteriYapilacak: { shot: 'musteriBakiye', x: 1040, y: 440, w: 372, h: 130 },
    stokIcerik: { shot: 'stok', x: 250, y: 62, w: 1176, h: 770 },
    stokTablo: { shot: 'stok', x: 296, y: 322, w: 1088, h: 340 },
    gunSonuIcerik: { shot: 'gunSonu', x: 250, y: 60, w: 1176, h: 840 },
    gunSonuTahsilat: { shot: 'gunSonu', x: 266, y: 68, w: 1146, h: 286 },
    gunSonuAcikIsler: { shot: 'gunSonu', x: 266, y: 744, w: 1146, h: 152 },
    defterIcerik: { shot: 'kayitDefteri', x: 250, y: 62, w: 1176, h: 770 },
    defterCikti: { shot: 'kayitDefteri', x: 266, y: 200, w: 1146, h: 252 },
    defterSatirlar: { shot: 'kayitDefteri', x: 266, y: 490, w: 1146, h: 300 },
    telefonUst: { shot: 'telefonBugun', x: 0, y: 0, w: 780, h: 1280 },
    bugunDar: { shot: 'bugun', x: 268, y: 252, w: 480, h: 168 },
    muayeneDar: { shot: 'muayene', x: 280, y: 92, w: 520, h: 240 },
    hastaDar: { shot: 'hastaKarti', x: 280, y: 392, w: 372, h: 200 },
    stokDar: { shot: 'stok', x: 296, y: 322, w: 440, h: 270 },
    gunSonuDar: { shot: 'gunSonu', x: 280, y: 84, w: 520, h: 240 },
    defterDar: { shot: 'kayitDefteri', x: 296, y: 526, w: 520, h: 240 }
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
    readonly shot: PublicScreenshotKey;
    /** Varsa görüntünün yalnız bu parçası. */
    readonly crop?: PublicScreenshotCropKey;
    /** Telefon ekranı telefon çerçevesinde gösterilir; değilse kart çerçevesinde. */
    readonly device: boolean;
}

/**
 * Ana sayfanın telefondaki zaman çizgisi (T-03 B): gün akışı adımı başına tek telefon ekranı (telefon çerçevesinde); anahtar adım
 * kimliğidir.
 */
export const PUBLIC_HOME_TIMELINE_VISUALS: Readonly<Record<string, PublicTimelineVisual>> = {
    gelis: { shot: 'telefonBugun', crop: 'telefonUst', device: true },
    muayene: { shot: 'telefonMuayene', device: true },
    tahsilat: { shot: 'telefonTahsilat', device: true },
    'gun-sonu': { shot: 'telefonGunSonu', device: true }
};
