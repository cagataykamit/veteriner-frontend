/**
 * Tanıtım ekran görüntüleri (WEB-005): panelden, yerel geliştirme ortamında "Örnek Veteriner Kliniği" sentetik verisiyle
 * ("ÖRNEK" işaretli; gerçek kişi verisi yok) alındı. Masaüstü 1440×900, telefon 390×844 (2×).
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
    | 'kayitDefteri'
    | 'kvkkFormu'
    | 'asiSihirbazi'
    | 'gelismisRaporlar'
    | 'klinikSitesi'
    | 'telefonBugun';

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
        width: 1440,
        height: 900,
        alt: 'Bugün ekranı: bekleyen dört hasta, biri acil işaretli; muayenesi süren iki hasta, müşteri borcu ve açık işler çipleri'
    },
    muayene: {
        file: 'muayene',
        width: 1440,
        height: 900,
        alt: 'Muayene formu: solda hasta bağlamı (son kilo, aktif tedavi, son muayeneler); sağda şikâyet, anamnez, klinik bulgular, kilo, ateş, nabız ve solunum'
    },
    kesinlestirme: {
        file: 'kesinlestirme',
        width: 1131,
        height: 700,
        alt: 'Taslak muayene kaydı: şikâyet, anamnez, bulgular, vital değerler, tanı ve plan; yanda kesinleştirme kontrol listesi ve Kesinleştir düğmesi'
    },
    musteriBakiye: {
        file: 'musteri-bakiye',
        width: 1440,
        height: 900,
        alt: 'Müşteri kartı: açık borç, KVKK rıza ve portal durumu, hastaları, yapılacaklarda açık borç, son muayeneler, son randevular ve ödeme özeti'
    },
    gunSonu: {
        file: 'gun-sonu',
        width: 1440,
        height: 900,
        alt: 'Gün sonu raporu: bir haftalık aralıkta ödeme türüne ve güne göre tahsilat, iptal ve net tutar; açık işler'
    },
    hastaKarti: {
        file: 'hasta-karti',
        width: 1440,
        height: 900,
        alt: 'Hasta kartı: tür, cins, yaş, kilo ve çip numarası; açık borç, klinik özet (son kilo, vital, son tanı, aktif tedavi, aşılar), yapılacaklar ve zaman çizelgesi'
    },
    stok: {
        file: 'stok',
        width: 1440,
        height: 900,
        alt: 'Stok durumu: ürün başına kullanılabilir ve süresi geçmiş miktar, minimum seviye ve durum'
    },
    kayitDefteri: {
        file: 'kayit-defteri',
        width: 1440,
        height: 900,
        alt: 'Hayvan Muayene Kayıt Defteri: tarih aralığı filtresi, PDF, Excel, CSV ve yazdırma; sıra numarası, hasta sahibi, hasta, şikâyet, teşhis ve tedavi'
    },
    kvkkFormu: {
        file: 'kvkk-formu',
        width: 710,
        height: 370,
        alt: 'KVKK açık rıza formu yazdırma görünümü: kabul ve ret seçenekleri, veri sahibinin adı, tarih ve imza alanı'
    },
    asiSihirbazi: {
        file: 'asi-sihirbazi',
        width: 1440,
        height: 900,
        alt: 'Aşı planı önerisi: kliniğin aşı takviminden yavru köpek için hesaplanan dozlar ve tarihleri; hekim seçip onaylar'
    },
    gelismisRaporlar: {
        file: 'gelismis-raporlar',
        width: 1131,
        height: 501,
        alt: 'Gelişmiş rapor kırılımları: hekim, hizmet ve ürün, en çok ciro yapan kalemler ve hayvan türü; her biri önceki dönemle fark'
    },
    klinikSitesi: {
        file: 'klinik-sitesi',
        width: 1440,
        height: 900,
        alt: 'Klinik web sitesi sihirbazı: yedi adım; solda klinik bilgileri ve çalışma saatleri, sağda sitenin önizlemesi'
    },
    telefonBugun: {
        file: 'telefon-bugun',
        width: 780,
        height: 1688,
        alt: 'Telefonda Bugün ekranı: hızlı eylem düğmeleri, açık işler ve kart görünümünde acil işaretli bekleyen hasta'
    }
};

export function publicScreenshotSrc(def: PublicScreenshotDef, theme: 'light' | 'dark'): string {
    return `${SCREENS_DIR}/${def.file}-${theme}.webp`;
}
