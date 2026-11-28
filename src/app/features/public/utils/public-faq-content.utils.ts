/**
 * Sık sorulan sorular — tek kaynak. `/sss` sayfası kategorilere göre gösterir; ana sayfa `homepage: true`
 * olanları (6–8 soru) listeler. Yalnız doğrulanmış yetenekler; paket adı paket verisinden (`pricing-plan.utils.ts`, ADR-035).
 * Tutar, yıllık kural ve sınır burada yazılmaz: backend kataloğundan Paketler sayfasında gösterilir (WEB-007); hatırlatma
 * yalnız e-posta, deneme sonu kuralı yazılmaz.
 */

import { VETINITY_SUPPORT_PHONE_DISPLAY } from '@/app/core/support/vetinity-support.constants';
import { planAvailabilityText, planTitlesText, planTitlesWithFeature, PRICING_VAT_NOTE, pricingTermsText } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { PUBLIC_MIGRATION_PROGRAMS_TEXT } from './public-migration-content.utils';
import { PUBLIC_SITE_SHOWCASE } from './public-site-showcase-content.utils';

/** Çok klinik yönetimi olan paketlerin adları ("Kurumsal"), özellik tablosundan. */
const MULTI_CLINIC_PLANS = planTitlesWithFeature('multiClinic');

export interface PublicFaqDef {
    readonly question: string;
    readonly answer: string;
    /** Ana sayfadaki kısa listede de görünür. */
    readonly homepage?: boolean;
}

export interface PublicFaqCategoryDef {
    readonly id: string;
    readonly label: string;
    readonly items: readonly PublicFaqDef[];
}

export const PUBLIC_FAQ_CATEGORIES: readonly PublicFaqCategoryDef[] = [
    {
        id: 'genel',
        label: 'Genel',
        items: [
            {
                question: 'Vetinity kimin için?',
                answer: 'Tek hekimli klinikten çok şubeli işletmeye, her ölçekte veteriner kliniği için. Birden fazla şubeniz varsa aynı kurum altında klinik ekleyebilirsiniz.',
                homepage: true
            },
            {
                question: 'Kurulum gerekiyor mu?',
                answer: 'Gerekmez. Vetinity tarayıcıdan çalışır: bilgisayarda, tablette ve telefonda adresi açıp giriş yaparsınız. Telefonda tam çalışır; isterseniz ana ekrana ekleyip uygulama gibi açarsınız.'
            },
            {
                question: 'Birden fazla klinik destekleniyor mu?',
                answer: `Evet, ${MULTI_CLINIC_PLANS} pakette. Tek kurum altında birden fazla klinik tanımlayıp panelde aktif kliniği seçerek çalışırsınız; klinikler arası yetkiyi siz verirsiniz.`,
                homepage: true
            },
            {
                question: 'Hatırlatmalar nasıl gider?',
                answer: "Aşı ve randevu hatırlatmaları e-posta ile gönderilir; randevu hatırlatmasında onay, iptal ve takvime ekle bağlantısı bulunur. Personeliniz hasta sahibine WhatsApp'tan hazır mesajla da ulaşabilir.",
                homepage: true
            },
            {
                question: 'Klinik web sitesi her pakette mi?',
                answer: `${planAvailabilityText('clinicSite')} var. Sihirbazla kliniğinizin çok sayfalı sitesini kurar, yayından önce önizlersiniz; ${PUBLIC_SITE_SHOWCASE.addressNote}`
            },
            {
                question: 'Veteriner bul nedir, ücretli mi?',
                answer: 'Hasta sahiplerinin il ve ilçeye göre klinik aradığı sayfadır. Listelenmek kliniğin seçimidir ve ücret alınmaz; sıralama yakınlığa ve o an açık olmaya göredir, ödemeyle değişmez.'
            },
            {
                question: 'Hasta sahibi randevusunu kendisi iptal edebilir mi?',
                answer: 'Evet. Hatırlatma e-postasındaki bağlantıyla gelişini onaylar ya da iptal eder; iptal size bildirim olarak düşer. İsterseniz iptal bağlantısını kapatabilirsiniz.'
            }
        ]
    },
    {
        id: 'fiyat',
        label: 'Fiyat ve deneme',
        items: [
            {
                question: 'Fiyat ne kadar?',
                answer: `${planTitlesText()} paketlerinin aylık ve yıllık fiyatı Paketler sayfasında yazılıdır. ${pricingTermsText()}. Her paketi 14 gün ücretsiz, kart bilgisi vermeden deneyebilirsiniz.`,
                homepage: true
            },
            {
                question: 'Fiyatlara KDV dahil mi?',
                answer: `Hayır. Paket fiyatları ${PRICING_VAT_NOTE}; KDV ayrıca eklenir.`
            },
            {
                question: 'Yıllık ödeme var mı?',
                answer: 'Evet. Yıllık ödeme aylık ödemeye göre daha uygundur; tutarı ve hediye ay sayısını Paketler sayfasında Yıllık seçeneğinde görürsünüz. Aylık ödemeden yıllığa panelden istediğiniz an geçebilirsiniz; içinde bulunduğunuz ayın kalan günleri ücretten düşülür.'
            },
            {
                question: 'Deneme nasıl işliyor?',
                answer: '14 gün ücretsiz; kart bilgisi istenmez, satış görüşmesi gerekmez. Dilerseniz demo isteyip birlikte bakarız.',
                homepage: true
            },
            {
                question: 'Paketimi sonradan değiştirebilir miyim?',
                answer: 'Evet. Panelde Ayarlar > Abonelik ekranından daha büyük pakete hemen geçersiniz; daha küçük pakete geçiş dönem sonunda uygulanır. Verileriniz aynen kalır.'
            },
            {
                question: 'Sözleşme ve iptal nasıl?',
                answer: 'Kullanım şartları sitede yayımlıdır. Sonlandırmada verilerinizi dışa aktarabilirsiniz.'
            },
            {
                question: 'Fatura kesiliyor mu?',
                answer: "Abonelik için fatura düzenlenir. Klinikte aldığınız ödemeler için e-Fatura, e-Arşiv ve e-SMM'yi panelden kesersiniz: kendi e-belge sağlayıcı hesabınızı bağlarsınız, belge ücretleri sağlayıcınızla aranızdadır. Mali belge için e-Belge kesersiniz; tahsilat fişi müşteriye bilgi verir."
            }
        ]
    },
    {
        id: 'guvenlik',
        label: 'Güvenlik ve KVKK',
        items: [
            {
                question: 'Verilerim kim tarafından görülür?',
                answer: 'Kullanıcılar yalnız yetkili oldukları klinik ve işlemlerin verilerine erişir. Yönetici, Hekim ve Resepsiyon rolleri izinlerle sınırlandırılır; her işlem denetim izine yazılır.',
                homepage: true
            },
            {
                question: 'KVKK için ne sağlıyorsunuz?',
                answer: 'Klinik başına aydınlatma metni ve açık rıza formu (yazdırılabilir), rıza kaydı ve metin sürümü, müşteri veri kopyası ve KVKK talep süreci. Metinler kliniğinizin danışmanınca onaylanır.'
            },
            {
                question: 'Yapay zekâ verimi nasıl kullanıyor?',
                answer: "Yalnız hekim istediğinde ve o an açık olan kayıt için çalışır. Hazırladığı her şey taslaktır; hekim onaylamadan kayda geçmez. Yapay zekâ kliniğinizde kapalı başlar, siz talep etmedikçe kapalı kalır. Ayrıntısı Gizlilik Politikası'nda."
            },
            {
                question: 'Kesinleşen muayene değiştirilebilir mi?',
                answer: 'Kesinleşen muayene kilitlenir; düzeltme yalnız gerekçeli ek notla yapılır ve izlenir. İki kullanıcı aynı kaydı aynı anda değiştiremez.'
            },
            {
                question: 'Verimi alabilir miyim?',
                answer: `Evet, ${planAvailabilityText('dataExport').toLocaleLowerCase('tr-TR')}. Panelde Verimi dışa aktar ekranından kurumunuzun tüm kayıtlarını tek ZIP paketinde, her tablo ayrı CSV dosyası olarak alırsınız. Abonelik salt okunurken de açıktır.`
            }
        ]
    },
    {
        id: 'gecis',
        label: 'Geçiş',
        items: [
            {
                question: 'Eski programdan geçebilir miyim?',
                answer: `Evet. Excel veya CSV şablonuna aktarıp yüklersiniz; sütunları eşler, kontrol raporunu görür, aktarırsınız. ${PUBLIC_MIGRATION_PROGRAMS_TEXT}'ten geliyorsanız dışa aktardığınız dosyaları olduğu gibi yüklersiniz; hangi dosyanın nereden alınacağını panel adım adım gösterir. Gerekirse geri alınır.`,
                homepage: true
            },
            {
                question: 'Eski programımdan neler aktarılır?',
                answer:
                    'Müşteriler ve hastalar (notlarıyla), aşı geçmişi, muayene ve klinik notlar, açık bakiye (borç ve alacak), eski programdaki hesap hareketleri, gelecek randevular ve ürün/hizmet kartları (fiyat, KDV oranı ve alış fiyatıyla) aktarılır. Klinik notlar, reçete ve laboratuvar sonuçları metin olarak gelir; dışa aktarımda geçmiş işlem ve kontroller varsa klinik geçmişe not olarak eklenir. Hesap hareketleri bilgi amaçlıdır; bakiyenize yalnız açık bakiye borç ya da alacak olarak yazılır, ciroya ve kasaya girmez. Laboratuvar sonucu ve görüntü gibi dosyaları geçişten sonra hastanın ilgili kaydına yükleyebilirsiniz; geçiş desteği ekibimiz yardımcı olur.'
            },
            {
                question: 'Geçiş ne kadar sürer?',
                answer: 'Süre dosyanızın büyüklüğüne bağlıdır. Yükleme ve kontrolü ekranda siz yaparsınız; aktarım arka planda çalışır, bu sırada çalışmaya devam edersiniz.'
            },
            {
                question: 'Geçişte yardım alabilir miyim?',
                answer: `Evet. Panelden geçiş desteği talebi açarsınız; 1 saatlik kurulum görüşmesinde aktarıma birlikte bakarız. ${planAvailabilityText('freeMigrationSupport')} ücretsizdir, diğer paketlerde ücretlidir.`
            }
        ]
    },
    {
        id: 'destek',
        label: 'Destek',
        items: [
            {
                question: 'Nasıl destek alırım?',
                answer: `İletişim sayfasından ya da WhatsApp destek hattından (${VETINITY_SUPPORT_PHONE_DISPLAY}) bize ulaşın; demo, geçiş ve kullanım sorularınızı yanıtlarız.`,
                homepage: true
            }
        ]
    }
];

/** Ana sayfadaki kısa SSS (6–8 soru). */
export const PUBLIC_HOME_FAQS: readonly PublicFaqDef[] = PUBLIC_FAQ_CATEGORIES.flatMap((c) => c.items.filter((i) => i.homepage));

/** Belirli bir kategorinin soruları (sayfa içi kısa SSS blokları için). */
export function publicFaqsOf(categoryId: string): readonly PublicFaqDef[] {
    return PUBLIC_FAQ_CATEGORIES.find((c) => c.id === categoryId)?.items ?? [];
}

/** Paketler sayfasının kısa SSS'si (sayfada ve FAQPage verisinde) bu kategoridir. */
export const PUBLIC_PACKAGES_FAQ_CATEGORY_ID = 'fiyat';

/**
 * SSS sayfasının FAQPage verisi: ana sayfa ve paketler sayfası kendi sorularını zaten işaretler; aynı soru sitede bir kez
 * işaretlensin diye (arama motoru kuralı) bu sayfada yalnız başka yerde işaretlenmeyenler yer alır. Sayfada yine tüm sorular görünür.
 */
export const PUBLIC_FAQ_PAGE_STRUCTURED_FAQS: readonly PublicFaqDef[] = PUBLIC_FAQ_CATEGORIES.filter((c) => c.id !== PUBLIC_PACKAGES_FAQ_CATEGORY_ID).flatMap((c) =>
    c.items.filter((i) => !i.homepage)
);
