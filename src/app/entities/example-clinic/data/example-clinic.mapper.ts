import type { ExampleClinicCounts, ExampleClinicDataCountsDto } from '@/app/entities/example-clinic/models/example-clinic-api.model';
import type { ExampleClinicSummaryRowVm } from '@/app/entities/example-clinic/models/example-clinic-vm.model';

type SummaryCountKey = keyof ExampleClinicCounts;

/** Kartta gösterilen sayaçlar ve sırası (sözleşme §5; ürün ve stok tek satırda özetlenmez, ayrı gösterilir). */
const SUMMARY_ROWS: readonly { readonly key: SummaryCountKey; readonly label: string }[] = [
    { key: 'clients', label: 'Müşteri' },
    { key: 'pets', label: 'Hasta' },
    { key: 'appointments', label: 'Randevu' },
    { key: 'examinations', label: 'Muayene' },
    { key: 'vaccinations', label: 'Aşı' },
    { key: 'treatments', label: 'Tedavi' },
    { key: 'labResults', label: 'Lab sonucu' },
    { key: 'charges', label: 'Ücret' },
    { key: 'payments', label: 'Ödeme' },
    { key: 'products', label: 'Ürün' },
    { key: 'stockMovements', label: 'Stok hareketi' }
];

function toCount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

/** Özet/temizlik sayıları -> kart satırları; eksik/geçersiz sayı 0 olarak gösterilir. */
export function mapExampleClinicSummaryToRows(dto: ExampleClinicCounts): ExampleClinicSummaryRowVm[] {
    return SUMMARY_ROWS.map((row) => ({ key: row.key, label: row.label, count: toCount(dto[row.key]) }));
}

/** Toast gibi tek satırlık yerler için kısa özet: "12 müşteri, 20 hasta, 38 randevu". */
export function exampleClinicSummaryShortText(dto: ExampleClinicCounts): string {
    return `${toCount(dto.clients)} müşteri, ${toCount(dto.pets)} hasta, ${toCount(dto.appointments)} randevu`;
}

/** Pasife alınacak/alınan örnek ürün sayısı (§10.1: kullanıcının kendi kaydında kullanılmış ürün silinmez). */
export function exampleClinicDeactivatedProducts(dto: ExampleClinicDataCountsDto): number {
    return toCount(dto.productsDeactivated);
}

/** Satırlarda ayrı gösterilmeyen bağlı kayıtlar (ziyaret, reçete, görüntüleme, yatış vb.; §10.2 `otherRecords`). */
export function exampleClinicOtherRecords(dto: ExampleClinicDataCountsDto): number {
    return toCount(dto.otherRecords);
}
