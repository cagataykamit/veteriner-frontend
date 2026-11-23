import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const TITLE_SUFFIX = 'Vetinity';

/** Panel yolu (`/panel/…`) → sayfa adı; en uzun önek kazanır. Rota `title` verirse o önceliklidir. */
const PANEL_PAGE_TITLES: ReadonlyArray<readonly [string, string]> = [
    ['today', 'Bugün'],
    ['patients', 'Hastalar'],
    ['patients/deleted', 'Silinenler'],
    ['clients', 'Müşteriler'],
    ['pets', 'Hastalar'],
    ['appointments/calendar', 'Randevu takvimi'],
    ['appointments', 'Randevular'],
    ['examinations', 'Muayeneler'],
    ['treatments', 'Tedaviler'],
    ['prescriptions', 'Reçeteler'],
    ['lab-results', 'Lab sonuçları'],
    ['hospitalizations', 'Yatışlar'],
    ['vaccinations', 'Aşılar'],
    ['charges', 'Ücretler'],
    ['e-documents', 'e-Belgeler'],
    ['settings/e-documents', 'e-Belge'],
    ['payments', 'Ödemeler'],
    ['sales', 'Satışlar'],
    ['sales/new', 'Hızlı satış'],
    ['products', 'Ürünler'],
    ['stocks', 'Stok durumu'],
    ['stock-movements', 'Stok hareketleri'],
    ['goods-receipts', 'Mal kabul'],
    ['drug-guide', 'İlaç rehberi'],
    ['reports', 'Raporlar'],
    ['reports/payments', 'Ödeme hareketleri'],
    ['reports/appointments', 'Randevu hareketleri'],
    ['reports/examinations', 'Muayene raporu'],
    ['reports/vaccinations', 'Aşı raporu'],
    ['reports/outstanding-balances', 'Borç raporu'],
    ['settings', 'Ayarlar'],
    ['settings/definitions', 'Tanımlar'],
    ['settings/definitions/species', 'Türler'],
    ['settings/definitions/breeds', 'Irklar'],
    ['settings/definitions/product-categories', 'Ürün kategorileri'],
    ['settings/definitions/clinical-snippets', 'Metin parçaları'],
    ['settings/definitions/hospitalization-wards', 'Yatış konumları'],
    ['settings/definitions/appointment-resources', 'Oda ve cihazlar'],
    ['settings/account', 'Hesabım'],
    ['settings/subscription', 'Abonelik'],
    ['settings/clinics', 'Klinikler'],
    ['settings/reminders', 'Hatırlatmalar'],
    ['settings/organization', 'Kurum ayarları'],
    ['settings/members', 'Kurum üyeleri'],
    ['settings/invites', 'Davetler'],
    ['settings/api-access', 'API erişimi'],
    ['settings/imports/migration-support', 'Geçiş desteği'],
    ['settings/custom-development', 'Size özel geliştirmeler']
];

/** Panel sayfa adını URL'den çözer; panel dışı veya bilinmeyen yol için `null`. */
export function resolvePanelPageTitle(url: string): string | null {
    const path = url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');

    if (!path.startsWith('panel/')) {
        return null;
    }

    const rest = path.slice('panel/'.length);
    let best: string | null = null;
    let bestLength = -1;

    for (const [prefix, title] of PANEL_PAGE_TITLES) {
        if ((rest === prefix || rest.startsWith(`${prefix}/`)) && prefix.length > bestLength) {
            best = title;
            bestLength = prefix.length;
        }
    }

    return best;
}

/**
 * Sekme başlığı: rota `title`'ı veya panel sayfa adı → "Muayeneler — Vetinity". Başlığı çözülemeyen sayfalarda (giriş, genel sayfalar)
 * mevcut başlığa dokunmaz; bu sayfalar başlığı kendileri ayarlar.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const pageTitle = this.buildTitle(snapshot) ?? resolvePanelPageTitle(snapshot.url);

        if (pageTitle) {
            this.title.setTitle(`${pageTitle} — ${TITLE_SUFFIX}`);
        }
    }
}
