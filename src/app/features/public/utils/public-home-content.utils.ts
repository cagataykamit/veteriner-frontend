export interface PublicHomePreviewMetricDef {
    readonly label: string;
    readonly icon: string;
    readonly hint: string;
}

export interface PublicHomePreviewTaskDef {
    readonly time: string;
    readonly label: string;
}

export interface PublicHomeStatDef {
    readonly title: string;
    readonly subtitle: string;
    readonly icon: string;
}

export interface PublicHomeFeatureDef {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
}

export interface PublicHomeWhyDef {
    readonly text: string;
}

export interface PublicHomeModuleDef {
    readonly title: string;
    readonly icon: string;
}

export interface PublicHomeFaqDef {
    readonly question: string;
    readonly answer: string;
}

export const PUBLIC_HOME_FEATURES: readonly PublicHomeFeatureDef[] = [
    {
        title: 'Randevu yönetimi',
        description: 'Takvim, yeniden planlama ve klinik çalışma saatleri ile uyumlu randevu akışı.',
        icon: 'pi pi-calendar'
    },
    {
        title: 'Hasta ve pet kayıtları',
        description: 'Müşteri, hayvan, tür/ırk ve geçmiş kayıtları tek yerde.',
        icon: 'pi pi-heart'
    },
    {
        title: 'Muayene ve tedavi takibi',
        description: 'Muayene, tedavi ve reçete süreçlerini tek akışta takip edin.',
        icon: 'pi pi-file-edit'
    },
    {
        title: 'Aşı ve hatırlatmalar',
        description: 'Aşı planlarını, uygulama durumunu ve hatırlatmaları kolayca yönetin.',
        icon: 'pi pi-shield'
    },
    {
        title: 'Ödeme ve raporlar',
        description: 'Tahsilat kayıtları ve operasyonel raporlar.',
        icon: 'pi pi-chart-bar'
    },
    {
        title: 'Stok ve ürün yönetimi',
        description: 'Ürün kataloğu, stok durumu ve hareket geçmişi.',
        icon: 'pi pi-box'
    }
] as const;

/** Mock dashboard — temsilî; abartılı sayı yok. */
export const PUBLIC_HOME_PREVIEW_METRICS: readonly PublicHomePreviewMetricDef[] = [
    { label: 'Bugünkü randevular', icon: 'pi pi-calendar', hint: 'Planlı akış' },
    { label: 'Bekleyen aşılar', icon: 'pi pi-shield', hint: 'Takip altında' },
    { label: 'Muayene sayısı', icon: 'pi pi-file-edit', hint: 'Güncel kayıt' },
    { label: 'Gelir özeti', icon: 'pi pi-chart-line', hint: 'Özet görünüm' }
] as const;

export const PUBLIC_HOME_PREVIEW_TASKS: readonly PublicHomePreviewTaskDef[] = [
    { time: '09:30', label: 'Kontrol — Max (Köpek)' },
    { time: '11:00', label: 'Aşı — Luna (Kedi)' },
    { time: '14:15', label: 'Muayene — Rocky' }
] as const;

/** Hero altı — abartılı sayı yok; yetenek vurgusu. */
export const PUBLIC_HOME_STATS: readonly PublicHomeStatDef[] = [
    {
        title: 'Çok klinikli yapı',
        subtitle: 'Tek kurum, birden fazla klinik',
        icon: 'pi pi-building'
    },
    {
        title: 'Rol bazlı erişim',
        subtitle: 'Modül ve yetki kontrolü',
        icon: 'pi pi-lock'
    },
    {
        title: 'Uçtan uca hasta takibi',
        subtitle: 'Randevudan rapora tek akış',
        icon: 'pi pi-heart'
    },
    {
        title: 'Raporlama',
        subtitle: 'Operasyonel özet ve dışa aktarım',
        icon: 'pi pi-chart-line'
    }
] as const;

export const PUBLIC_HOME_WHY: readonly PublicHomeWhyDef[] = [
    { text: 'Çok klinikli yapı — tek kurum altında birden fazla klinik yönetimi' },
    { text: 'Rol bazlı erişim — ekip üyelerine görevine göre yetki verme' },
    { text: 'Klinik bazlı çalışma — her kullanıcının doğru klinik verileriyle çalışması' },
    { text: 'Güvenli panel deneyimi — oturum ve klinik seçimiyle kontrollü erişim' },
    { text: 'Tutarlı tarih-saat gösterimi — randevu ve işlem kayıtlarında net zaman takibi' },
    { text: 'Abonelik kontrolü — paket durumuna göre güvenli kullanım yönetimi' }
] as const;

export const PUBLIC_HOME_MODULES: readonly PublicHomeModuleDef[] = [
    { title: 'Dashboard', icon: 'pi pi-home' },
    { title: 'Randevular', icon: 'pi pi-calendar' },
    { title: 'Muayene', icon: 'pi pi-file-edit' },
    { title: 'Tedavi', icon: 'pi pi-briefcase' },
    { title: 'Reçete', icon: 'pi pi-file' },
    { title: 'Aşı', icon: 'pi pi-shield' },
    { title: 'Ödeme', icon: 'pi pi-credit-card' },
    { title: 'Stok', icon: 'pi pi-box' },
    { title: 'Raporlar', icon: 'pi pi-chart-line' }
] as const;

export const PUBLIC_HOME_FAQS: readonly PublicHomeFaqDef[] = [
    {
        question: 'Çok klinik destekleniyor mu?',
        answer: 'Evet. Tek kurum altında birden fazla klinik tanımlayıp panelde aktif klinik seçerek çalışabilirsiniz.'
    },
    {
        question: 'Kullanıcı rolleri ve yetkileri var mı?',
        answer: 'Evet. Admin, veteriner ve sekreter gibi rollerle modül bazlı yetkilendirme desteklenir.'
    },
    {
        question: 'Aşı ve randevu takibi yapılabilir mi?',
        answer: 'Evet. Randevu takvimi, muayene ve aşı süreçleri panel modüllerinde yönetilir.'
    },
    {
        question: 'Ödeme ve stok yönetimi var mı?',
        answer: 'Evet. Ödeme kayıtları, stok durumu ve ürün kataloğu modülleri mevcuttur.'
    },
    {
        question: 'Deneme süreci veya paketler var mı?',
        answer: 'Basic, Pro ve Premium paketleri inceleyebilir; ücretsiz deneme ile kayıt olabilirsiniz.'
    },
    {
        question: 'Veriler güvenli mi?',
        answer: 'Vetinity’de kullanıcı erişimleri rol ve yetki kontrolleriyle sınırlandırılır. Kullanıcılar yalnızca yetkili oldukları klinik ve modül verilerine erişebilir.'
    }
] as const;
