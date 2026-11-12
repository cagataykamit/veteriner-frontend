/**
 * Özellikler sayfası (`/ozellikler`, tasarım belgesi 5.2): bir ziyaretin yolculuğu, modül listesi değil.
 * Her bölüm = bir problem + bir ekran (gerçek ekran görüntüsü, `public-screenshots.utils.ts`). Gün akışının dışındaki işler
 * sonda kısa kart gruplarıdır; grup, kartlarından birinin ekranını gösterebilir. Kartın paketi özellik tablosundan okunur
 * (`PRICING_FEATURE_ROWS`, tek kaynak).
 */

import { planAvailabilityText, type PricingFeatureKey } from '@/app/entities/subscription/utils/pricing-plan.utils';
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
            'Zaman çizelgesi tarih aralığına göre filtrelenir',
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

export interface PublicFeatureCardDef {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
    /** Hangi pakette olduğu bu satırdan yazılır. */
    readonly planRow: PricingFeatureKey;
}

export interface PublicFeatureGroupDef {
    /** Sayfa içi bağlantı kimliği (bölüm dizini). */
    readonly id: string;
    readonly title: string;
    readonly lead: string;
    readonly cards: readonly PublicFeatureCardDef[];
    /** Gruptaki bir kartın ekranı; altyazıdaki ad ve paket o karttan (`planRow`). */
    readonly shot?: { readonly screenshot: PublicScreenshotKey; readonly planRow: PricingFeatureKey };
}

/** Kart grupları: gün akışının dışındaki işler. Abartı ve üstünlük sözü yok (ADR-034 karar 3, ADR-047 K6). */
export const PUBLIC_FEATURE_GROUPS: readonly PublicFeatureGroupDef[] = [
    {
        id: 'hasta-sahibi',
        title: 'Hasta sahibine ulaşın',
        lead: 'Kliniğinizin sitesi, Veteriner bul kaydı ve randevu bağlantısı aynı klinik bilgisinden beslenir; saatleri ve telefonu bir kez yazarsınız.',
        cards: [
            {
                title: 'Klinik web sitesi',
                description: 'Kliniğinizin sitesini panelden kendiniz yaparsınız. Dört hazır tasarımdan birini seçersiniz; bölümlerin görünümünü ayrı ayrı değiştirebilirsiniz. Hekimler, hizmetler, saatler ve iletişim sayfaları sihirbazla adım adım hazırlanır. Yayından önce önizlersiniz; fotoğrafınız yoksa temsili görsel kullanılır.',
                icon: 'pi pi-globe',
                planRow: 'clinicSite'
            },
            {
                title: "Veteriner bul'da listelenme",
                description: 'Hasta sahipleri il ve ilçeye göre kliniğinizi bulur. Listelenmek sizin seçiminizdir ve ücretsizdir; sıralama yakınlığa ve o an açık olmaya göredir, ödemeyle değişmez.',
                icon: 'pi pi-map-marker',
                planRow: 'vetFinder'
            },
            {
                title: 'Online randevu ve en yakın müsait saat',
                description: 'Siteniz ve randevu bağlantınız boş saatleri gösterir; hasta sahibi saat seçip talep bırakır. Randevu siz onaylayınca kesinleşir.',
                icon: 'pi pi-calendar-plus',
                planRow: 'onlineBooking'
            },
            {
                title: 'Hatırlatmada onayla, iptal et, takvime ekle',
                description: 'Hasta sahibi hatırlatma e-postasındaki bağlantıyla gelişini onaylar ya da iptal eder, randevuyu kendi takvimine ekler. İptal size bildirim olarak düşer.',
                icon: 'pi pi-check-square',
                planRow: 'reminderReplies'
            },
            {
                title: 'Otomatik hatırlatıcılar',
                description:
                    'Kontrol muayenesi ve ödenmemiş bakiye için e-posta kendiliğinden gider. "Uzun süredir gelmedi" iletisi ticari iletidir; yalnız kliniğiniz İYS\'ye kayıtlıysa ve hasta sahibi onay verdiyse gönderilir.',
                icon: 'pi pi-bell',
                planRow: 'automatedReminders'
            },
            {
                title: 'Bekleme listesi',
                description: 'Daha erken randevu isteyenler sıraya girer. Bir randevu iptal olunca o saate uyan ilk kişiye e-postayla teklif gider.',
                icon: 'pi pi-list',
                planRow: 'waitlist'
            }
        ],
        shot: { screenshot: 'klinikSitesi', planRow: 'clinicSite' }
    },
    {
        id: 'klinik-ici',
        title: 'Klinik içinde',
        lead: 'Aşı planından kasaya, tekrarlanan işleri kısaltan araçlar.',
        cards: [
            {
                title: 'Otomatik aşı sihirbazı',
                description: 'Kliniğinizin aşı takviminden hayvanın kalan dozları önerilir; hekim kontrol edip onaylayınca planlı aşı olarak kaydedilir ve hatırlatılır.',
                icon: 'pi pi-calendar',
                planRow: 'vaccinationWizard'
            },
            {
                title: 'Kamerayla barkod okutma',
                description: 'Telefon kamerasıyla barkodu okutup ürünü mal kabulde, satışta ve ürün aramasında bulursunuz.',
                icon: 'pi pi-qrcode',
                planRow: 'mobileBarcode'
            },
            {
                title: 'Çoklu kasa ve kasa yönetimi',
                description: 'Birden fazla kasa, kasaya giriş ve çıkış, kasalar arası aktarım, kasa bazında gün sonu sayımı ve kasa hareketleri raporu.',
                icon: 'pi pi-wallet',
                planRow: 'cashManagement'
            }
        ],
        shot: { screenshot: 'asiSihirbazi', planRow: 'vaccinationWizard' }
    },
    {
        id: 'isletme',
        title: 'İşletme ve veri',
        lead: 'Rakamların arkasını görün, veriniz her zaman sizde kalsın.',
        cards: [
            {
                title: 'Gelişmiş raporlar',
                description: 'Hekim, hizmet ve ürün, en çok ciro yapan kalemler ve hayvan türü kırılımları; her biri önceki dönemle.',
                icon: 'pi pi-chart-bar',
                planRow: 'advancedReports'
            },
            {
                title: 'Şubeler özeti',
                description: 'Tüm şubelerin ciro, tahsilat, açık alacak ve iş yükü tek tabloda; toplam satırı ve önceki dönemle fark.',
                icon: 'pi pi-building',
                planRow: 'clinicsOverview'
            },
            {
                title: 'API erişimi',
                description: 'Kurumunuza özel anahtarla müşteri, hasta, randevu ve aşı listelerini kendi sistemlerinize alırsınız; erişim salt okunurdur.',
                icon: 'pi pi-code',
                planRow: 'externalApi'
            },
            {
                title: 'Tüm verinizi dışa aktarma',
                description: 'Kurumunuzun tüm kayıtları tek ZIP paketinde, her tablo ayrı CSV dosyası. Başka bir sisteme geçerken ya da arşiv için.',
                icon: 'pi pi-download',
                planRow: 'dataExport'
            }
        ],
        shot: { screenshot: 'gelismisRaporlar', planRow: 'advancedReports' }
    }
];

/** Kartın paket etiketi ("Tüm paketlerde", "Profesyonel ve Kurumsal paketlerinde"). */
export function publicFeatureCardPlans(card: PublicFeatureCardDef): string {
    return planAvailabilityText(card.planRow);
}

/** Grup ekranının altyazısı: gösterdiği kartın adı ve paketi ("Otomatik aşı sihirbazı · Profesyonel ve Kurumsal paketlerinde"). */
export function publicFeatureGroupShotCaption(group: PublicFeatureGroupDef): string {
    const card = group.cards.find((c) => c.planRow === group.shot?.planRow);

    return card ? `${card.title} · ${publicFeatureCardPlans(card)}` : '';
}
