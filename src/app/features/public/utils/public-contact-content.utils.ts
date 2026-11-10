/**
 * İletişim, hakkımızda ve tüzel kişi bilgileri (AK-6, ADR-034). Değeri `null` olan alan sayfada hiç gösterilmez;
 * değer girilince yalnız bu dosya değişir. WhatsApp destek hattı panelle ortak sabitten gelir (`vetinity-support.constants.ts`).
 */

import { VETINITY_SUPPORT_PHONE_DISPLAY, VETINITY_SUPPORT_WHATSAPP_URL } from '@/app/core/support/vetinity-support.constants';

/** Teklif ve destek e-postası (iletişim kartında); `null` ise gösterilmez. Demo talebi formla gelir (TRIAL-005). */
export const PUBLIC_CONTACT_EMAIL: string | null = 'vetinity.app@gmail.com';

/** Telefon (görünen biçim); `null` ise gösterilmez. */
export const PUBLIC_CONTACT_PHONE: string | null = null;

/** Çalışma saatleri ve yanıt süresi (örn. "Hafta içi 09:00–18:00"); `null` ise gösterilmez. */
export const PUBLIC_SUPPORT_HOURS: string | null = null;
export const PUBLIC_SUPPORT_RESPONSE_TIME: string | null = null;

/** Alt bilgi ve hakkımızdaki tüzel kişi adı; `null` ise yalnız "Vetinity" yazar. */
export const PUBLIC_LEGAL_ENTITY_NAME: string | null = null;

export interface PublicContactCardRowDef {
    readonly label: string;
    readonly value: string;
    readonly icon: string;
    /** Varsa değer bağlantı olarak gösterilir (`mailto:`, `wa.me`). */
    readonly href?: string;
    /** Bağlantı yeni sekmede açılır (site dışı). */
    readonly external?: boolean;
}

/** İletişim kartı satırları; yalnız değeri girilmiş olanlar. */
export const PUBLIC_CONTACT_CARD_ROWS: readonly PublicContactCardRowDef[] = ([
    { label: 'E-posta', value: PUBLIC_CONTACT_EMAIL, icon: 'pi pi-envelope', href: PUBLIC_CONTACT_EMAIL ? `mailto:${PUBLIC_CONTACT_EMAIL}` : undefined },
    { label: 'WhatsApp destek hattı', value: VETINITY_SUPPORT_PHONE_DISPLAY, icon: 'pi pi-whatsapp', href: VETINITY_SUPPORT_WHATSAPP_URL, external: true },
    { label: 'Telefon', value: PUBLIC_CONTACT_PHONE, icon: 'pi pi-phone' },
    { label: 'Çalışma saatleri', value: PUBLIC_SUPPORT_HOURS, icon: 'pi pi-clock' },
    { label: 'Yanıt süresi', value: PUBLIC_SUPPORT_RESPONSE_TIME, icon: 'pi pi-reply' }
] as { label: string; value: string | null; icon: string; href?: string; external?: boolean }[]).filter((row): row is PublicContactCardRowDef => !!row.value);

/** Hakkımızda — kısa, doğrulanabilir metin; sayı ve referans uydurulmaz. */
export const PUBLIC_ABOUT_PARAGRAPHS: readonly string[] = [
    'Vetinity, Türkiye\'deki veteriner klinikleri için geliştirilen bulut tabanlı bir klinik programıdır. Amacımız kliniğin gününü, gelişten tahsilata, tek ekranda yürütmek ve kayıt defterleri ile KVKK evrakını kendiliğinden tutmaktır.',
    'Ürünü klinik iş akışından yola çıkarak geliştiriyoruz. Yapmadığımız şeyleri açıkça yazarız: SMS hatırlatma, e-Fatura ve online ödeme şu an yoktur; hatırlatmalar e-posta ile gider.',
    'Kayıtlarınız size aittir: istediğinizde kurumunuzun tüm kayıtlarını tek pakette dışa aktarabilirsiniz.'
];
