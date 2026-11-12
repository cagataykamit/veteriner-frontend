/**
 * Geçiş sayfası (`/gecis`, tasarım belgesi 5.4) ve ana sayfa "Geçiş" bölümü (3 adım).
 * Kaynak: ADR-019, ADR-048 (tam geçiş) — müşteri, hasta (notlarıyla), aşı, klinik geçmiş (metin), açık bakiye, hesap hareketleri
 * (bilgi amaçlı), gelecek randevular, ürün ve hizmet kartları (KDV oranı ve alış fiyatıyla, BATCH_STOCK §2.1) aktarılır; açık bakiye
 * borç ve alacağı kapsar (devir alacağı, T3). Dışa aktarımda geçmiş işlem/kontrol satırları varsa klinik geçmişe not olarak gelir
 * (IMPORT §13.2); geçmiş randevu randevu olarak, belge/ek ve stok miktarı aktarılmaz.
 * TIER-021: kaynak program seçimi ve geçiş desteği; hazır eşlemeler gerçek dosyayla doğrulanmadığı için "hazır gelir" denmez,
 * program adı yazılmaz. Ücretsiz olduğu paket özellik tablosundan.
 */

import { planAvailabilityText } from '@/app/entities/subscription/utils/pricing-plan.utils';

export interface PublicMigrationStepDef {
    readonly title: string;
    readonly description: string;
}

/** Geçiş sayfası dikey zaman çizgisi (5 adım). */
export const PUBLIC_MIGRATION_STEPS: readonly PublicMigrationStepDef[] = [
    {
        title: 'Kaynak programı seçin, dosyanızı yükleyin',
        description: 'Şablonumuz ya da eski programınızın Excel veya CSV dışa aktarımı. Seçtiğiniz program için hazır eşleme varsa sütunlar ona göre önerilir.'
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

export const PUBLIC_MIGRATION_INCLUDED: readonly string[] = [
    'Müşteriler ve hastalar',
    'Müşteri ve hasta notları',
    'Aşı geçmişi',
    'Muayene ve klinik notlar (metin olarak)',
    'Geçmiş işlem ve kontroller (dışa aktarımda varsa, klinik geçmişe not olarak)',
    'Açık bakiye (borç ve alacak)',
    'Hesap hareketleri (bilgi amaçlı)',
    'Gelecek randevular',
    'Ürün ve hizmet kartları (fiyat, KDV oranı ve alış fiyatıyla)'
];
export const PUBLIC_MIGRATION_EXCLUDED: readonly string[] = [
    'Belgeler, ekler ve görüntüler',
    'Stok miktarı (mal kabulle girilir)',
    'Geçmiş randevular randevu olarak (yapılan işler klinik geçmişe not olarak gelir)',
    'Reçete ve lab sonucu ayrı kayıt olarak (metin olarak gelir)'
];

/** Geçiş desteği kutusu (TIER-021). */
export const PUBLIC_MIGRATION_SUPPORT_POINTS: readonly string[] = [
    'Panelden geçiş desteği talebi açarsınız: hangi programdan geldiğiniz, yaklaşık kayıt sayısı, uygun gün ve saatler.',
    '1 saatlik kurulum görüşmesinde aktarıma ekran paylaşımıyla birlikte bakarız.',
    'Dosyanızı e-postayla göndermezsiniz; panele kendiniz yüklersiniz.'
];

/** "Kurumsal paketinde ücretsiz; …" */
export const PUBLIC_MIGRATION_SUPPORT_PRICE = `${planAvailabilityText('freeMigrationSupport')} ücretsiz; diğer paketlerde ücretlidir, fiyat talebinizden sonra bildirilir.`;
