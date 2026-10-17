/**
 * Sık sorulan sorular — tek kaynak. `/sss` sayfası kategorilere göre gösterir; ana sayfa `homepage: true`
 * olanları (6–8 soru) listeler. Yalnız doğrulanmış yetenekler; tutar, sınır ve paket adı paket verisinden gelir
 * (`pricing-plan.utils.ts`, ADR-035), burada sayı yazılmaz; hatırlatma yalnız e-posta, deneme sonu kuralı yazılmaz.
 */

import { PRICING_PLAN_DEFS, PRICING_VAT_NOTE, pricingSummaryText, pricingTermsText, yearlyOfferText, yearlyPricingText } from './pricing-plan.utils';

/** Çok klinik sunan paketlerin adları ("Kurumsal"). */
const MULTI_CLINIC_PLANS = PRICING_PLAN_DEFS.filter((d) => d.maxClinics === 'coklu')
    .map((d) => d.title)
    .join(', ');

/** "Yıllık ödemede iki ay hediye" (veriden). */
const YEARLY_OFFER = yearlyOfferText();

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
                answer: 'Tek hekimli ya da birkaç kullanıcılı küçük veteriner klinikleri için. Birden fazla şubeniz varsa aynı kurum altında klinik ekleyebilirsiniz.',
                homepage: true
            },
            {
                question: 'Kurulum gerekiyor mu?',
                answer: 'Hayır. Tarayıcıdan çalışır; bilgisayar, tablet ya da telefonda ek kurulum yoktur. Ayrı bir mobil uygulama bugün yoktur.'
            },
            {
                question: 'Birden fazla klinik destekleniyor mu?',
                answer: `Evet, ${MULTI_CLINIC_PLANS} pakette. Tek kurum altında birden fazla klinik tanımlayıp panelde aktif kliniği seçerek çalışırsınız; klinikler arası yetkiyi siz verirsiniz.`,
                homepage: true
            },
            {
                question: 'Hatırlatmalar nasıl gider?',
                answer: 'Aşı ve randevu hatırlatmaları e-posta ile gönderilir. SMS gönderimi şu an yoktur.',
                homepage: true
            }
        ]
    },
    {
        id: 'fiyat',
        label: 'Fiyat ve deneme',
        items: [
            {
                question: 'Fiyat ne kadar?',
                answer: `${pricingSummaryText()}. ${pricingTermsText()}. Her paketi 14 gün ücretsiz, kart bilgisi vermeden deneyebilirsiniz.`,
                homepage: true
            },
            {
                question: 'Fiyatlara KDV dahil mi?',
                answer: `Hayır. Paket fiyatları ${PRICING_VAT_NOTE}; KDV ayrıca eklenir.`
            },
            {
                question: 'Yıllık ödeme var mı?',
                answer: `Evet: ${yearlyPricingText()}.${YEARLY_OFFER ? ` ${YEARLY_OFFER}.` : ''}`
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
                answer: 'Kullanım şartları sitede yayımlıdır (hukuki onay sürüyor, taslak bandıyla). Sonlandırmada verilerinizi dışa aktarabilirsiniz.'
            },
            {
                question: 'Fatura kesiliyor mu?',
                answer: 'Abonelik için fatura düzenlenir. Klinik içindeki tahsilat fişleri mali belge değildir; e-Fatura entegrasyonu bugün yoktur.'
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
                question: 'Kesinleşen muayene değiştirilebilir mi?',
                answer: 'Kesinleşen muayene kilitlenir; düzeltme yalnız gerekçeli ek notla yapılır ve izlenir. İki kullanıcı aynı kaydı aynı anda değiştiremez.'
            }
        ]
    },
    {
        id: 'gecis',
        label: 'Geçiş',
        items: [
            {
                question: 'Eski programdan geçebilir miyim?',
                answer: 'Evet. Excel veya CSV şablonuna aktarıp yüklersiniz; sütunları eşler, kontrol raporunu görür, aktarırsınız. Gerekirse geri alınır.',
                homepage: true
            },
            {
                question: 'Ne aktarılır, ne aktarılmaz?',
                answer: 'Müşteri, hasta ve aşı geçmişi aktarılır. Muayene ve ödeme geçmişi şimdilik aktarılmaz.'
            },
            {
                question: 'Geçiş ne kadar sürer?',
                answer: 'Dosya hazırsa yükleme ve kontrol aynı gün biter; aktarım arka planda çalışır.'
            }
        ]
    },
    {
        id: 'destek',
        label: 'Destek',
        items: [
            {
                question: 'Destek nasıl alırım?',
                answer: 'İletişim sayfasından bize ulaşın; demo, geçiş ve kullanım sorularınızı yanıtlarız.',
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
