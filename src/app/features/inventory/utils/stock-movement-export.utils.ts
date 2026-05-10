import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';

export const STOCK_MOVEMENT_CSV_HEADERS = [
    'Tarih',
    'Ürün',
    'SKU',
    'Kategori',
    'Klinik',
    'Hareket Tipi',
    'Miktar',
    'Birim Maliyet',
    'Neden',
    'Referans',
    'Not',
    'Oluşturulma Tarihi'
] as const;

function exportDisplayCell(value: string): string {
    const t = (value ?? '').trim();
    return t === '—' ? '' : t;
}

/** CSV için kanonik hareket tipi → kullanıcı etiketi (Initial/In/Out/Adjustment). */
export function movementTypeLabelForCsvExport(movementType: string): string {
    switch (movementType) {
        case 'Initial':
            return 'Başlangıç stoğu';
        case 'In':
            return 'Stok girişi';
        case 'Out':
            return 'Stok çıkışı';
        case 'Adjustment':
            return 'Stok düzeltme';
        default:
            return exportDisplayCell(movementType);
    }
}

export function stockMovementVmToCsvRow(row: StockMovementVm): string[] {
    return [
        exportDisplayCell(row.occurredAtText),
        exportDisplayCell(row.productDisplayName),
        exportDisplayCell(row.productSku),
        exportDisplayCell(row.productCategoryName),
        exportDisplayCell(row.clinicName),
        movementTypeLabelForCsvExport(row.movementType),
        exportDisplayCell(row.quantityText),
        exportDisplayCell(row.unitCostText),
        exportDisplayCell(row.reason),
        exportDisplayCell(row.referenceText),
        exportDisplayCell(row.notes),
        exportDisplayCell(row.createdAtText)
    ];
}
