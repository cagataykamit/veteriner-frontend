/**
 * Sık sorulan sorular — tek kaynak. `/sss` sayfası kategorilere göre gösterir; ana sayfa `homepage: true`
 * olanları (6–8 soru) listeler. Yalnız doğrulanmış yetenekler; fiyat için "pilot dönemi fiyatı için yazın",
 * hatırlatma yalnız e-posta, deneme sonu kuralı yazılmaz (ADR-034).
 */

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
                answer: 'Evet. Tek kurum altında birden fazla klinik tanımlayıp panelde aktif kliniği seçerek çalışırsınız.',
                homepage: true
            },
            {
                question: 'Hatırlatmalar nasıl gider?',
                answer: 'Aşı ve randevu hatırlatmaları e-posta ile gönderilir. SMS gönderimi bugün yoktur; yol haritasındadır.',
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
                answer: 'Pilot dönemindeyiz; pilot dönemi fiyatı için bize yazın. Fiyat belirlenince paket başına aylık tutar bu sayfada açıkça yazılacak.',
                homepage: true
            },
            {
                question: 'Deneme nasıl işliyor?',
                answer: '14 gün ücretsiz; kart bilgisi istenmez, satış görüşmesi gerekmez. Dilerseniz demo isteyip birlikte bakarız.',
                homepage: true
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
                answer: 'İletişim sayfasındaki e-posta ve telefon üzerinden. Çalışma saatleri ve yanıt süresi iletişim sayfasında yazar.',
                homepage: true
            },
            {
                question: 'Kullanıcı kılavuzu var mı?',
                answer: 'Rol bazlı kullanıcı kılavuzu hazırlanıyor; yayımlanınca alt bilgiden ulaşılır.'
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
