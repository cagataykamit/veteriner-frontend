/**
 * İletişim, hakkımızda ve tüzel kişi bilgileri. AK-6 (ADR-034) kararı gelene kadar değerler `null`;
 * sayfalar açıkça işaretli yer tutucu gösterir. Karar gelince yalnız bu dosya değişir.
 */

/** Teklif, demo ve destek e-postası; `null` ise `mailto:` bağlantısı gösterilmez. */
export const PUBLIC_CONTACT_EMAIL: string | null = null;

/** Telefon (görünen biçim); `null` ise yer tutucu. */
export const PUBLIC_CONTACT_PHONE: string | null = null;

/** Çalışma saatleri ve yanıt süresi (örn. "Hafta içi 09:00–18:00"); `null` ise yer tutucu. */
export const PUBLIC_SUPPORT_HOURS: string | null = null;
export const PUBLIC_SUPPORT_RESPONSE_TIME: string | null = null;

/** Alt bilgi ve hukuki metinlerdeki tüzel kişi adı; `null` ise yer tutucu. */
export const PUBLIC_LEGAL_ENTITY_NAME: string | null = null;

/** Yer tutucu metni — AK-6 bekleyen her alanda aynı. */
export const PUBLIC_CONTACT_PENDING_LABEL = 'AK-6 kararıyla eklenecek';

/** Demo/teklif e-postasının konu ve gövde şablonu (mailto). */
export const PUBLIC_CONTACT_MAIL_SUBJECT = 'Vetinity — demo ve pilot dönemi fiyatı';
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
    readonly value: string | null;
    readonly icon: string;
}

/** İletişim kartı satırları; `value` `null` ise yer tutucu gösterilir. */
export const PUBLIC_CONTACT_CARD_ROWS: readonly PublicContactCardRowDef[] = [
    { label: 'E-posta', value: PUBLIC_CONTACT_EMAIL, icon: 'pi pi-envelope' },
    { label: 'Telefon', value: PUBLIC_CONTACT_PHONE, icon: 'pi pi-phone' },
    { label: 'Çalışma saatleri', value: PUBLIC_SUPPORT_HOURS, icon: 'pi pi-clock' },
    { label: 'Yanıt süresi', value: PUBLIC_SUPPORT_RESPONSE_TIME, icon: 'pi pi-reply' }
];

/** Hakkımızda — kısa, doğrulanabilir metin; sayı ve referans yok (pilot sonrası). */
export const PUBLIC_ABOUT_PARAGRAPHS: readonly string[] = [
    'Vetinity, Türkiye\'deki küçük veteriner klinikleri için geliştirilen bulut tabanlı bir klinik programıdır. Amacımız kliniğin gününü, gelişten tahsilata, tek ekranda yürütmek ve kayıt defterleri ile KVKK evrakını kendiliğinden tutmaktır.',
    'Ürün pilot klinikle birlikte olgunlaşıyor. Yapmadığımız şeyleri açıkça yazarız: SMS hatırlatma, e-Fatura ve online randevu yol haritasında; hasta sahibi portalı ve mobil uygulaması geliştiriliyor.',
    'Kayıtlarınız size aittir: istediğinizde müşteri, hasta ve aşı verilerinizi dışa aktarabilirsiniz.'
];
