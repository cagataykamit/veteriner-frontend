/**
 * Geçiş sayfası (`/gecis`, tasarım belgesi 5.4) ve ana sayfa "Geçiş" bölümü (3 adım).
 * Kaynak: ADR-019 — müşteri, hasta ve aşı geçmişi aktarılır; muayene ve ödeme geçmişi şimdilik aktarılmaz.
 */

export interface PublicMigrationStepDef {
    readonly title: string;
    readonly description: string;
}

/** Geçiş sayfası dikey zaman çizgisi (5 adım). */
export const PUBLIC_MIGRATION_STEPS: readonly PublicMigrationStepDef[] = [
    {
        title: 'Şablonu indirin ya da kendi Excel dosyanızı yükleyin',
        description: 'Excel veya CSV; eski programınızın dışa aktarımı da olur.'
    },
    {
        title: 'Sütunları eşleyin',
        description: 'Dosyanızdaki sütunları Vetinity alanlarıyla eşlersiniz; benzer adlar kendiliğinden önerilir.'
    },
    {
        title: 'Kontrol raporunu görün',
        description: 'Eksik telefon, yinelenen müşteri, tanınmayan tür gibi sorunlar aktarımdan önce listelenir.'
    },
    {
        title: 'Aktarın',
        description: 'Aktarım arka planda çalışır; siz çalışmaya devam edersiniz.'
    },
    {
        title: 'Gerekirse geri alın',
        description: 'Aktarım tek işlem olarak geri alınabilir; yanlış dosya yüklediyseniz baştan başlarsınız.'
    }
];

/** Ana sayfa "Geçiş" bölümü (3 adım). */
export const PUBLIC_MIGRATION_HOME_STEPS: readonly PublicMigrationStepDef[] = [
    { title: 'Excel dosyanızı yükleyin', description: 'Şablon ya da eski programınızın dışa aktarımı.' },
    { title: 'Sütunları eşleyin', description: 'Benzer adlar kendiliğinden önerilir.' },
    { title: 'Kontrol edin ve aktarın', description: 'Sorunlar önce listelenir; aktarım geri alınabilir.' }
];

export const PUBLIC_MIGRATION_INCLUDED: readonly string[] = ['Müşteriler', 'Hastalar', 'Aşı geçmişi'];
export const PUBLIC_MIGRATION_EXCLUDED: readonly string[] = ['Muayene geçmişi', 'Ödeme geçmişi'];
