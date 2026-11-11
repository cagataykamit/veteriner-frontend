import type { AdministrationRouteApi } from '@/app/entities/administration/utils/administration-route.utils';
import type { AdministrationVm } from '@/app/entities/administration/models/administration-vm.model';

/**
 * "Tekrar uygula" (RECORD-004 2. dilim): yeni uygulama formunun ön dolumu; kopyalanan alanlar yalnız burada tanımlıdır.
 * Kopyalanır: ürün, miktar, uygulama yolu ve bölgesi. Kopyalanmaz: parti/lot (sunucu FEFO ile yeniden seçer, stoktan yeniden düşer),
 * zaman, not, iptal ve geç kayıt alanları. Hedef bölümün bağlamıdır (muayene/tedavi); kesinleşmiş muayenede gerekçe istenir (ADR-013).
 * Aşı kaydına bağlı uygulama tekrarlanmaz (aşı kapsam dışı; sonraki doz aşı takviminden doğar).
 */
export interface AdministrationCopyDraft {
    productId: string;
    productName: string;
    quantity: number;
    route: AdministrationRouteApi | null;
    site: string;
}

export function canRepeatAdministration(row: AdministrationVm): boolean {
    return !row.vaccinationId;
}

export function administrationCopyDraft(row: AdministrationVm): AdministrationCopyDraft {
    return { productId: row.productId, productName: row.productName, quantity: row.quantity, route: row.route, site: row.site ?? '' };
}
