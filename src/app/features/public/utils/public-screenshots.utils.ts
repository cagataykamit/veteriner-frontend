/**
 * Tanıtım ekran görüntüleri (WEB-005; 2026-11-23 güncel arayüzden yeniden çekildi, T-02): panelden, yerel geliştirme ortamında
 * yeni bir deneme kiracısına yüklenen "Örnek Veteriner Kliniği" sentetik verisiyle ("ÖRNEK" işaretli; gerçek kişi verisi yok,
 * müşteri e-postaları görünmez) alındı. Masaüstü 1440×900 (kırpılmış üç görsel 1426 px yerleşimden), telefon 390×844 (2×);
 * telefonun muayene, tahsilat ve gün sonu görselleri 390×640 (2×). Klinik web sitesi sihirbazı görseli karar beklediği için
 * değişmedi. Her görüntünün açık ve koyu tema eşi `public/marketing/screens/` altında WebP; `width`/`height` CLS için gerçek piksel.
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
    | 'telefonBugun'
    | 'telefonMuayene'
    | 'telefonTahsilat'
    | 'telefonGunSonu';

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
        alt: 'Bugün ekranı: klinikte sırada bekleyen üç hasta (biri acil işaretli, bekleme süresi uyarılı), sıradaki iki randevu ve ödeme bekleyen tamamlanmış geliş; üstte açık işler'
    },
    muayene: {
        file: 'muayene',
        width: 1440,
        height: 900,
        alt: 'Muayene formu: şikâyet ve anamnez, klinik bulgular, kilo, ateş, nabız ve solunum; yanda hasta bağlamı (son kilo, gecikmiş aşı, aktif tedavi, son muayeneler)'
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
        alt: 'Müşteri kartı: açık borç, KVKK rıza ve portal durumu, hastaları, yapılacaklarda açık borç ve Ödeme al, son muayeneler, son randevular ve ödeme özeti'
    },
    gunSonu: {
        file: 'gun-sonu',
        width: 1440,
        height: 900,
        alt: 'Gün sonu raporu: ödeme türüne göre tahsilat ve iptal, nakit kasa kontrolü ve açık işler'
    },
    hastaKarti: {
        file: 'hasta-karti',
        width: 1440,
        height: 900,
        alt: 'Hasta kartı: tür, cins, yaş, kilo ve çip numarası; açık borç, klinik özet (son kilo, vital, son tanı, aşılar) ve yapılacaklarda gecikmiş ve yaklaşan aşı'
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
        alt: 'Hayvan Muayene Kayıt Defteri: tarih aralığı ve klinik filtresi, dışa aktarma; sıra numarası, tarih, hasta sahibi, hasta, şikâyet, teşhis ve tedavi'
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
        alt: 'Aşı planı önerisi: kliniğin aşı takviminden yavru köpek için hesaplanan dozlar ve tarihleri; gecikmiş dozlar işaretli, hekim seçip onaylar'
    },
    gelismisRaporlar: {
        file: 'gelismis-raporlar',
        width: 1131,
        height: 501,
        alt: 'Hekim, kalem ve tür dağılımı: hekime, hizmet ve ürüne, en çok ciro yapan kalemlere ve hayvan türüne göre net ciro; her biri önceki dönemle fark'
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
        alt: 'Telefonda Bugün ekranı: randevusuz geliş düğmesi, açık işler ve kart görünümünde acil işaretli, bekleme süresi uyarılı hasta'
    },
    telefonMuayene: {
        file: 'telefon-muayene',
        width: 780,
        height: 1280,
        alt: 'Telefonda muayene kaydı: şikâyet, anamnez, klinik bulgular, vital değerler, tanı ve plan'
    },
    telefonTahsilat: {
        file: 'telefon-tahsilat',
        width: 780,
        height: 1280,
        alt: 'Telefonda müşteri kartı: açık borç, Geldi, Randevu al, Ücret ekle ve Ödeme al düğmeleri, hastalar ve yapılacaklarda açık borç'
    },
    telefonGunSonu: {
        file: 'telefon-gun-sonu',
        width: 780,
        height: 1280,
        alt: 'Telefonda gün sonu raporu: brüt ve net ücret, tahsilat ve iptal edilen tahsilat'
    }
};

export function publicScreenshotSrc(def: PublicScreenshotDef, theme: 'light' | 'dark'): string {
    return `${SCREENS_DIR}/${def.file}-${theme}.webp`;
}
