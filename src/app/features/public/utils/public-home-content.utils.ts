export interface PublicHomeFeatureDef {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
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
