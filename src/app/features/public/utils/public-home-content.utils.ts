export interface PublicHomeFeatureDef {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
}

export interface PublicHomeFaqDef {
    readonly question: string;
    readonly answer: string;
}

/** Yalnız doğrulanmış yetenekler (analiz belgesi bölüm 4); ADR-022 dili. */
export const PUBLIC_HOME_FEATURES: readonly PublicHomeFeatureDef[] = [
    {
        title: 'Randevu ve bekleme sırası',
        description: 'Randevulu ve randevusuz gelişler, bekleme sırası ve günün listesi tek ekranda.',
        icon: 'pi pi-calendar'
    },
    {
        title: 'Müşteri ve hasta kayıtları',
        description: 'Müşteri, hasta, tür/ırk bilgisi ve geçmiş kayıtlar tek yerde.',
        icon: 'pi pi-heart'
    },
    {
        title: 'Muayene ve reçete',
        description: 'Muayene bölümleri, tanı ve reçete; kesinleşen muayene kilitlenir.',
        icon: 'pi pi-file-edit'
    },
    {
        title: 'Aşı takibi ve kayıt defterleri',
        description: 'Aşı planı, uygulama kaydı; aşı, ilaç ve narkotik kayıt defterleri yazdırılır.',
        icon: 'pi pi-shield'
    },
    {
        title: 'Tahsilat ve raporlar',
        description: 'Ücret, kısmi ödeme, bakiye ve gün sonu raporu.',
        icon: 'pi pi-chart-bar'
    },
    {
        title: 'Stok ve ürünler',
        description: 'Ürün kataloğu, parti ve son kullanma tarihi, mal kabul ve düşük stok uyarısı.',
        icon: 'pi pi-box'
    }
] as const;

export const PUBLIC_HOME_FAQS: readonly PublicHomeFaqDef[] = [
    {
        question: 'Birden fazla klinik destekleniyor mu?',
        answer: 'Evet. Tek kurum altında birden fazla klinik tanımlayıp panelde aktif kliniği seçerek çalışabilirsiniz.'
    },
    {
        question: 'Kullanıcı rolleri ve yetkileri var mı?',
        answer: 'Evet. Yönetici, Hekim ve Resepsiyon rolleriyle izin bazlı yetkilendirme yapılır; her işlem izlenir.'
    },
    {
        question: 'Aşı ve randevu takibi yapılabilir mi?',
        answer: 'Evet. Randevu takvimi, muayene ve aşı kayıtları panelde yönetilir; hatırlatmalar e-posta ile gönderilir.'
    },
    {
        question: 'Tahsilat ve stok yönetimi var mı?',
        answer: 'Evet. Ücret ve ödeme kayıtları, bakiye, stok durumu ve ürün kataloğu panelde yer alır.'
    },
    {
        question: 'Deneme süresi var mı?',
        answer: '14 gün ücretsiz deneyebilirsiniz; kart bilgisi istenmez.'
    },
    {
        question: 'Verilerim kim tarafından görülür?',
        answer: 'Kullanıcılar yalnızca yetkili oldukları klinik ve işlemlerin verilerine erişir; erişim rol ve izinlerle sınırlıdır.'
    }
] as const;
