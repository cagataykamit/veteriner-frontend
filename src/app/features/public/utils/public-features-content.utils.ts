/**
 * Özellikler sayfası (`/ozellikler`, tasarım belgesi 5.2): bir ziyaretin yolculuğu, modül listesi değil.
 * Her bölüm = bir problem + bir ekran. Ekran görüntüleri WEB-005'te gelir; `screenshot` yer tutucu etiketidir.
 */

export interface PublicFeatureSectionDef {
    /** Sayfa içi bağlantı kimliği (bölüm dizini). */
    readonly id: string;
    readonly title: string;
    readonly lead: string;
    readonly bullets: readonly string[];
    /** Ekran görüntüsü yer tutucu etiketi; görsel gelince `alt` metni olur. */
    readonly screenshot: string;
}

export const PUBLIC_FEATURE_SECTIONS: readonly PublicFeatureSectionDef[] = [
    {
        id: 'gelis',
        title: 'Geliş ve bekleme',
        lead: 'Sabah açın, günün listesi hazır: kim randevulu, kim randevusuz geldi, kim bekliyor, kim acil.',
        bullets: [
            'Randevulu ve randevusuz geliş tek listede; bekleme süresi uzayınca uyarı',
            'Acil işareti ve hasta uyarı rozetleri satırda görünür',
            'Ücreti yazılmamış işlemler gün bitmeden fark edilir'
        ],
        screenshot: 'Bugün ekranı: bekleyen hastalar, biri acil, biri uzun bekleme uyarılı'
    },
    {
        id: 'muayene',
        title: 'Muayene',
        lead: 'Hasta bekleme sırasından muayeneye tek tıkla geçer; hastayı yeniden seçmezsiniz.',
        bullets: [
            'Şikâyet, bulgular, vital değerler, tanı ve plan bölümleri; şablon ve sözlükle hızlı giriş',
            'Kesinleştirince kayıt kilitlenir; düzeltme gerekçeli ek notla, izli',
            'İki kullanıcı aynı kaydı aynı anda değiştiremez; kimse kimseyi ezmez'
        ],
        screenshot: 'Muayene çalışma alanı: dolu bir muayene ve kesinleştirme kontrol listesi'
    },
    {
        id: 'hasta-karti',
        title: 'Hasta kartı ve zaman çizelgesi',
        lead: 'Bir hastanın tüm geçmişi tek sayfada: muayeneler, aşılar, reçeteler, yatışlar, gelişler.',
        bullets: [
            'Zaman çizelgesi tarih aralığına göre süzülür',
            'Kilo geçmişi muayene vitallerinden kendiliğinden oluşur',
            'Mikroçip, telefon ya da adla arama; Türkçe harf fark etmez'
        ],
        screenshot: 'Hasta kartı ve zaman çizelgesi'
    },
    {
        id: 'tahsilat',
        title: 'Tahsilat ve bakiye',
        lead: 'Ücret muayeneden ya da satıştan doğar; kısmi ödeme, kalan bakiye ve müşteri borcu her zaman görünür.',
        bullets: [
            'Ödeme al: nakit ya da kart kaydı, kısmi ödeme, bakiye',
            'Borç raporu: kimin ne kadar borcu var',
            'Düzeltme ve iptal yalnız yetkiyle, gerekçeli ve izli'
        ],
        screenshot: 'Ödeme al paneli ve bakiye'
    },
    {
        id: 'stok',
        title: 'Stok ve satış',
        lead: 'Uygulanan ilaç ve aşı stoktan düşer; parti ve son kullanma tarihi takip edilir.',
        bullets: [
            'Mal kabul: parti (lot) ve son kullanma tarihiyle giriş',
            'Düşük ve süresi geçmiş stok uyarısı',
            'Muayenesiz doğrudan satış; stok yine düşer'
        ],
        screenshot: 'Stok > Mal kabul ve düşük stok uyarısı'
    },
    {
        id: 'raporlar',
        title: 'Raporlar ve gün sonu',
        lead: 'Gün sonunda kasa özeti ve ücretlenmemiş işlemler; rapor merkezi tek girişten.',
        bullets: [
            'Gün sonu raporu: tahsilat özeti, açık kalan işler',
            'Ödeme, randevu, muayene, aşı ve borç raporları; Excel ve yazdırma',
            'Kayıt defterleri aynı merkezden'
        ],
        screenshot: 'Rapor merkezi ve gün sonu raporu'
    }
];
