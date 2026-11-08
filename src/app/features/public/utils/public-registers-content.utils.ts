/**
 * Defterler ve KVKK sayfası (`/kayit-defterleri-ve-kvkk`, tasarım belgesi 5.3) ve ana sayfa "Türkiye'ye özgü" bölümü.
 * "Mevzuata uygun" ve "KVKK uyumlu" DENMEZ (ADR-034 karar 6); danışman onayı notu her iki yerde kalır.
 */

import { planAvailabilityText } from '@/app/entities/subscription/utils/pricing-plan.utils';

export interface PublicRegisterDef {
    readonly name: string;
    /** Ne zaman kendiliğinden dolar. */
    readonly fills: string;
    /** Çıktı biçimleri. */
    readonly output: string;
}

export const PUBLIC_REGISTERS: readonly PublicRegisterDef[] = [
    { name: 'Muayene Kayıt Defteri', fills: 'Muayene kesinleşince', output: 'Yazdır · Excel · CSV' },
    { name: 'Reçete Kayıt Defteri', fills: 'Reçete kaydedilince', output: 'Yazdır · Excel · CSV' },
    { name: 'Aşı Kayıt Defteri', fills: 'Aşı uygulanınca', output: 'Yazdır · Excel · CSV' },
    { name: 'İlaç Kayıt Defteri', fills: 'İlaç uygulanınca ya da satılınca', output: 'Yazdır · Excel · CSV' },
    { name: 'Narkotik ve Psikotropik İlaç Defteri', fills: 'İlgili ilaç kullanılınca', output: 'Yazdır · Excel · CSV' },
    { name: 'Aşı Bilgi raporu', fills: 'Dönem seçilince', output: 'Yazdır · Excel · CSV' }
];

/** Gri not — defterler. */
export const PUBLIC_REGISTERS_NOTE = 'Defter çıktılarının resmî biçime uygunluğu kliniğinizce kontrol edilir; Vetinity resmî bildirim tavsiyesi vermez.';

export interface PublicKvkkStepDef {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
}

export const PUBLIC_KVKK_STEPS: readonly PublicKvkkStepDef[] = [
    { title: 'Aydınlatma metni', description: 'Klinik başına metin; yazdırılabilir.', icon: 'pi pi-info-circle' },
    { title: 'Açık rıza formu', description: 'Müşteriye imzalatılacak form; yazdırılabilir.', icon: 'pi pi-file-edit' },
    { title: 'Rıza kaydı ve sürüm', description: 'Hangi müşteri hangi metin sürümüne ne zaman rıza verdi.', icon: 'pi pi-verified' },
    { title: 'Veri kopyası ve talep süreci', description: 'Müşteri veri kopyası ve KVKK başvurularının takibi.', icon: 'pi pi-download' }
];

/** Gri not — KVKK. */
export const PUBLIC_KVKK_NOTE = 'KVKK metinleri kliniğinizin veri sorumlusu sıfatıyla danışmanınızca onaylanır; Vetinity hukuki tavsiye vermez.';

/**
 * Tüm veriyi dışa aktarma (panel Ayarlar > Verimi dışa aktar, backend `DATA_EXPORT_API_CONTRACT.md`). Saklama süresi ve
 * istek sınırı backend'den gelir; burada sayı yazılmaz. Hangi pakette olduğu özellik tablosundan.
 */
export const PUBLIC_DATA_EXPORT_POINTS: readonly string[] = [
    'Kurumunuzun tüm kayıtları tek ZIP paketinde: her tablo ayrı CSV dosyası, sütunları açıklayan BENIOKU.txt ile.',
    'Müşteriler, hastalar, randevular, muayeneler, aşılar, reçeteler, ücret ve ödemeler, stok ve satışlar dahil.',
    'Paket arka planda hazırlanır, hazır olunca bildirim gelir; bir süre saklanır, sonra silinir.',
    'Abonelik salt okunurken de alınabilir. Parolalar ve yüklenen dosyaların kendisi pakete girmez.'
];

export const PUBLIC_DATA_EXPORT_PLANS = planAvailabilityText('dataExport');

export interface PublicAccessCardDef {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
}

/** Bölüm C "Erişim ve iz" (5.3) ve ana sayfa "Kayıt güvenliği" 4 maddesi. */
export const PUBLIC_RECORD_SAFETY_ITEMS: readonly PublicAccessCardDef[] = [
    { title: 'Kesinleşen muayene kilitlenir', description: 'Sonradan değişmez; düzeltme gerekçeli ek notla yapılır.', icon: 'pi pi-lock' },
    { title: 'Her düzeltme izli', description: 'Ücret, ödeme ve kayıt düzeltmeleri kim-ne zaman-neden bilgisiyle denetim izine yazılır.', icon: 'pi pi-history' },
    { title: 'İki kişi birbirini ezmez', description: 'Aynı kaydı aynı anda değiştirmeye çalışan ikinci kullanıcı uyarılır; metni kaybolmaz.', icon: 'pi pi-users' },
    { title: 'Roller ve izinler', description: 'Yönetici, Hekim ve Resepsiyon; her kullanıcı yalnız yetkili olduğu klinik ve işlemleri görür.', icon: 'pi pi-shield' }
];
