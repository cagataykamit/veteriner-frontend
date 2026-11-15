/**
 * e-Belge bölümü (`/ozellikler#e-belge`, ADR-036): klinik kendi e-belge sağlayıcısındaki (özel entegratör) hesabını bağlar; e-Fatura,
 * e-Arşiv ve e-SMM panelden kesilir. Özellik canlıya çıkınca yayınlanır; o güne kadar bu dal ana dala alınmaz.
 * Sağlayıcı adı yazılmaz (hangi sağlayıcıların önerileceği kesinleşmedi). Paket etiketi özellik tablosundan okunur (`PRICING_FEATURE_ROWS`,
 * tek kaynak; kullanıcı kararı 2026-11-12: tüm paketlerde).
 * Abartı ve üstünlük sözü yok (ADR-034 karar 3).
 */

import { planAvailabilityText } from '@/app/entities/subscription/utils/pricing-plan.utils';

export const PUBLIC_EDOCUMENT_SECTION = {
    /** Sayfa içi bağlantı kimliği (bölüm dizini). */
    id: 'e-belge',
    /** Bölüm dizinindeki kısa ad. */
    indexTitle: 'e-Fatura ve e-Arşiv',
    eyebrow: 'e-Belge',
    title: 'e-Fatura, e-Arşiv ve e-SMM panelden',
    lead: "Kendi e-belge sağlayıcınızdaki hesabınızı Vetinity'ye bağlarsınız; belgeyi ödeme ekranından çıkmadan kesersiniz.",
    bullets: [
        'Tek tıkla kesersiniz ya da ödeme alınınca kendiliğinden kesilir; hangisi olacağını siz seçersiniz',
        'Aynı ücrete iki belge kesilmez',
        "Belgenin PDF'i ve durumu panelde; kesilemeyen belge nedeniyle listelenir, yeniden denersiniz",
        'Anlaşmalı e-belge sağlayıcılarıyla çalışır; sağlayıcı hesabınız ve belge ücretleri sağlayıcınızla aranızdadır'
    ],
    stepsTitle: 'Nasıl işler'
} as const;

export function publicEDocumentPlans(): string {
    return planAvailabilityText('eDocuments');
}

export interface PublicEDocumentStepDef {
    readonly title: string;
    readonly text: string;
}

export const PUBLIC_EDOCUMENT_STEPS: readonly PublicEDocumentStepDef[] = [
    { title: 'Hesabınızı bağlarsınız', text: 'Ayarlar > e-Belge sayfasından, anlaşmalı sağlayıcılardan birindeki kendi hesabınızı bir kez bağlarsınız.' },
    { title: 'Ödemeyi alırsınız', text: 'Ödeme ekranında belgeyi kesersiniz; otomatik kesimi açtıysanız ödeme kaydedilince kendiliğinden kesilir.' },
    { title: 'Belge panelde durur', text: "e-Fatura, e-Arşiv ya da e-SMM; PDF'i ve durumu ödeme kaydında görürsünüz." }
];
