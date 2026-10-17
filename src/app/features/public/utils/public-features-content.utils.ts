/**
 * Özellikler sayfası (`/ozellikler`, tasarım belgesi 5.2): bir ziyaretin yolculuğu, modül listesi değil.
 * Her bölüm = bir problem + bir ekran (gerçek ekran görüntüsü, `public-screenshots.utils.ts`).
 */

import type { PublicScreenshotKey } from './public-screenshots.utils';

export interface PublicFeatureSectionDef {
    /** Sayfa içi bağlantı kimliği (bölüm dizini). */
    readonly id: string;
    readonly title: string;
    readonly lead: string;
    readonly bullets: readonly string[];
    readonly screenshot: PublicScreenshotKey;
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
        screenshot: 'bugun'
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
        screenshot: 'muayene'
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
        screenshot: 'hastaKarti'
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
        screenshot: 'musteriBakiye'
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
        screenshot: 'stok'
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
        screenshot: 'gunSonu'
    }
];
