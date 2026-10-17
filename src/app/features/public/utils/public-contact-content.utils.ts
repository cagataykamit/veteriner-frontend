/**
 * İletişim, hakkımızda ve tüzel kişi bilgileri (AK-6, ADR-034). Değeri `null` olan alan sayfada hiç gösterilmez;
 * değer girilince yalnız bu dosya değişir.
 */

/** Teklif, demo ve destek e-postası; `null` ise `mailto:` bağlantısı gösterilmez. */
export const PUBLIC_CONTACT_EMAIL: string | null = null;

/** Telefon (görünen biçim); `null` ise gösterilmez. */
export const PUBLIC_CONTACT_PHONE: string | null = null;

/** Çalışma saatleri ve yanıt süresi (örn. "Hafta içi 09:00–18:00"); `null` ise gösterilmez. */
export const PUBLIC_SUPPORT_HOURS: string | null = null;
export const PUBLIC_SUPPORT_RESPONSE_TIME: string | null = null;

/** Alt bilgi ve hakkımızdaki tüzel kişi adı; `null` ise yalnız "Vetinity" yazar. */
export const PUBLIC_LEGAL_ENTITY_NAME: string | null = null;

/** Demo/teklif e-postasının konu ve gövde şablonu (mailto). */
export const PUBLIC_CONTACT_MAIL_SUBJECT = 'Vetinity — demo ve paket bilgisi';
export const PUBLIC_CONTACT_MAIL_BODY = ['Klinik adı:', 'Şehir:', 'Telefon:', 'Kaç kullanıcı / şube:', 'Bugün hangi programı ya da yöntemi kullanıyorsunuz:', 'Mesajınız:'].join('\n');

/** `mailto:` adresi; e-posta yoksa `null`. */
export function publicContactMailto(): string | null {
    if (!PUBLIC_CONTACT_EMAIL) {
        return null;
    }

    const params = new URLSearchParams({ subject: PUBLIC_CONTACT_MAIL_SUBJECT, body: PUBLIC_CONTACT_MAIL_BODY });

    return `mailto:${PUBLIC_CONTACT_EMAIL}?${params.toString().replace(/\+/g, '%20')}`;
}

export interface PublicContactCardRowDef {
    readonly label: string;
    readonly value: string;
    readonly icon: string;
}

/** İletişim kartı satırları; yalnız değeri girilmiş olanlar. */
export const PUBLIC_CONTACT_CARD_ROWS: readonly PublicContactCardRowDef[] = ([
    { label: 'E-posta', value: PUBLIC_CONTACT_EMAIL, icon: 'pi pi-envelope' },
    { label: 'Telefon', value: PUBLIC_CONTACT_PHONE, icon: 'pi pi-phone' },
    { label: 'Çalışma saatleri', value: PUBLIC_SUPPORT_HOURS, icon: 'pi pi-clock' },
    { label: 'Yanıt süresi', value: PUBLIC_SUPPORT_RESPONSE_TIME, icon: 'pi pi-reply' }
] as { label: string; value: string | null; icon: string }[]).filter((row): row is PublicContactCardRowDef => !!row.value);

/** Hakkımızda — kısa, doğrulanabilir metin; sayı ve referans uydurulmaz. */
export const PUBLIC_ABOUT_PARAGRAPHS: readonly string[] = [
    'Vetinity, Türkiye\'deki küçük veteriner klinikleri için geliştirilen bulut tabanlı bir klinik programıdır. Amacımız kliniğin gününü, gelişten tahsilata, tek ekranda yürütmek ve kayıt defterleri ile KVKK evrakını kendiliğinden tutmaktır.',
    'Ürünü klinik iş akışından yola çıkarak geliştiriyoruz. Yapmadığımız şeyleri açıkça yazarız: SMS hatırlatma, e-Fatura, online ödeme ve online randevu şu an yoktur; hatırlatmalar e-posta ile gider.',
    'Kayıtlarınız size aittir: istediğinizde müşteri, hasta ve aşı verilerinizi dışa aktarabilirsiniz.'
];
