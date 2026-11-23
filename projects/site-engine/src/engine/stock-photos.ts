import type { SiteImage } from '../model/site.model';

/**
 * Hazır fotoğraf setinin tek kayıt noktası (ADR-045 K7). Klinik görsel yüklemediği yerde motor çizerken seçer; yapılandırmaya yazılmaz,
 * böylece mevcut sitelere de yansır, yükleme geçer, kaldırınca hazır fotoğraf döner. Hekim kartı bu seti kullanmaz: monogram çizilir.
 *
 * Dosyalar `projects/site-engine/stock/photos` altındadır, panel ve site uygulaması kendi tabanında `_stock/` altından verir; adres göreli
 * olduğu için `/k/` tabanında da çalışır. Adres biçimi klinik adresiyle çakışamaz. Kaynak, tarih ve lisans `stock/KAYNAKLAR.json`'dadır.
 */
const STOCK_DIR = '_stock/';

const photo = (file: string, alt: string): SiteImage => ({ src: `${STOCK_DIR}${file}.webp`, alt });

const PHOTO = {
    bandana: photo('bandana', 'Beyaz zeminde kırmızı fularlı köpek'),
    basset: photo('basset', 'Çimende koşan uzun kulaklı basset'),
    catLap: photo('cat-lap', 'Kucakta yatan gri tekir kedi'),
    collie: photo('collie', 'Doğada siyah beyaz çoban köpeği'),
    exSmallDog: photo('ex-small-dog', 'Aydınlık muayene odasında masada duran küçük köpek'),
    exTable: photo('ex-table', 'Muayene masasında siyah bir köpek, hekimin elleri'),
    exUltrasound: photo('ex-ultrasound', 'Masada yatan köpeğe ultrason yapılıyor'),
    exWhiteCat: photo('ex-white-cat', 'Beyaz kedi muayene masasında, hekimin elleri'),
    exWhiteCat2: photo('ex-white-cat-2', 'Eldivenli eller masadaki beyaz kedinin başını tutuyor'),
    goldenField: photo('golden-field', 'Sarı çiçekli çayırda oturan golden retriever'),
    goldenSmile: photo('golden-smile', 'Sarı çiçekler arasında gülümseyen golden retriever'),
    grooming: photo('grooming', 'Masada bakımı yapılan kedi, yakın plan'),
    huskyFloor: photo('husky-floor', 'Aydınlık odada yerde yatan beyaz köpek'),
    labField: photo('lab-field', 'Yeşil çayırda duran açık renk köpek'),
    leavesDog: photo('leaves-dog', 'Sonbahar ormanında yapraklar üstünde oturan köpek'),
    longFur: photo('long-fur', 'Yeşillikler önünde uzun tüylü kedi'),
    orangeSill: photo('orange-sill', 'Güneşli pencere kenarında uzanan sarı kedi'),
    orangeWhite: photo('orange-white', 'Bahçede oturan sarı beyaz kedi'),
    rabbitLop: photo('rabbit-lop', 'Çimende sarkık kulaklı tavşan'),
    rabbitWindow: photo('rabbit-window', 'Pencere kenarında duran kahverengi tavşan'),
    room: photo('room', 'Boş ve aydınlık ameliyathane'),
    shoreDogs: photo('shore-dogs', 'Su kenarında çimende oturan iki köpek'),
    siameseDark: photo('siamese-dark', 'Siyah zeminde profilden kedi'),
    tollerFence: photo('toller-fence', 'Ahşap çit önünde oturan kızıl tüylü köpek'),
    tuxedoDark: photo('tuxedo-dark', 'Karanlık zeminde siyah beyaz kedi')
} as const;

export const STOCK_LIBRARY: readonly SiteImage[] = Object.values(PHOTO);

/** Yuva, bölüm alternatifinin fotoğraf kullandığı yerdir; paketler havasına uyan kareyi burada seçer. */
export const STOCK_PHOTOS = {
    'modern-hero': PHOTO.bandana,
    'modern-about': PHOTO.exSmallDog,
    'modern-about-2': PHOTO.catLap,
    'modern-features': PHOTO.labField,
    'premium-hero': PHOTO.tuxedoDark,
    'premium-about': PHOTO.catLap,
    'premium-features': PHOTO.siameseDark,
    'friendly-hero': PHOTO.goldenSmile,
    'friendly-hero-2': PHOTO.orangeSill,
    'friendly-about': PHOTO.catLap,
    'friendly-features': PHOTO.basset,
    'nature-hero': PHOTO.tollerFence,
    'nature-hero-2': PHOTO.longFur,
    'nature-about': PHOTO.shoreDogs,
    'nature-about-2': PHOTO.orangeSill,
    'nature-features': PHOTO.collie
} as const satisfies Record<string, SiteImage>;

export type StockSlot = keyof typeof STOCK_PHOTOS;

export const STOCK_GALLERY: readonly SiteImage[] = [PHOTO.exSmallDog, PHOTO.orangeSill, PHOTO.orangeWhite, PHOTO.goldenField, PHOTO.exWhiteCat, PHOTO.catLap, PHOTO.basset, PHOTO.rabbitWindow];

type PhotoRule = readonly [RegExp, SiteImage];

/** Adres, hizmetin ne olduğunu söyler; eşleşmezse sıradaki genel kare. */
const SERVICE_RULES: readonly PhotoRule[] = [
    [/muayene/, PHOTO.exTable],
    [/(^|-)asi(-|$)|koruyucu|parazit/, PHOTO.exSmallDog],
    [/kisir/, PHOTO.exWhiteCat],
    [/(^|-)dis(-|$)/, PHOTO.exWhiteCat2],
    [/labor|tahlil|tetkik/, PHOTO.huskyFloor],
    [/rontgen|ultrason|goruntu/, PHOTO.exUltrasound],
    [/cerrahi|ameliyat|operasyon/, PHOTO.room],
    [/tuy|tirnak|bakim/, PHOTO.grooming]
];
const SERVICE_POOL: readonly SiteImage[] = [PHOTO.exTable, PHOTO.exSmallDog, PHOTO.exWhiteCat, PHOTO.exWhiteCat2, PHOTO.exUltrasound, PHOTO.grooming];

const ARTICLE_RULES: readonly PhotoRule[] = [
    [/kedi/, PHOTO.orangeWhite],
    [/(^|-)asi(-|$)|koruyucu/, PHOTO.exSmallDog],
    [/kopek/, PHOTO.leavesDog],
    [/tavsan|egzotik/, PHOTO.rabbitLop]
];
const ARTICLE_POOL: readonly SiteImage[] = [PHOTO.orangeWhite, PHOTO.leavesDog, PHOTO.rabbitLop, PHOTO.exSmallDog];

function pick(slug: string, index: number, rules: readonly PhotoRule[], pool: readonly SiteImage[]): SiteImage {
    return rules.find(([pattern]) => pattern.test(slug))?.[1] ?? pool[index % pool.length];
}

export function stockServicePhoto(slug: string, index: number): SiteImage {
    return pick(slug, index, SERVICE_RULES, SERVICE_POOL);
}

export function stockArticlePhoto(slug: string, index: number): SiteImage {
    return pick(slug, index, ARTICLE_RULES, ARTICLE_POOL);
}

/** Bölüm alternatifinin yuvası: `sections.hero` "premium" ise premium hero karesi. */
export function stockSectionPhoto(pack: string, type: 'hero' | 'about' | 'features'): SiteImage | null {
    return STOCK_PHOTOS[`${pack}-${type}` as StockSlot] ?? null;
}

/** Klinik paylaşım görseli ya da hero yüklemediyse paylaşımda konseptin hero karesi görünür. */
export function stockSharePhoto(conceptKey: string): SiteImage {
    return stockSectionPhoto(conceptKey, 'hero') ?? STOCK_PHOTOS['modern-hero'];
}

export function isStockPhoto(image: SiteImage | null | undefined): boolean {
    return !!image?.src.startsWith(STOCK_DIR);
}
