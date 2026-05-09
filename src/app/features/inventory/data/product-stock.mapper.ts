import type {
    ProductStockDto,
    UpdateProductStockMinimumStockLevelRequest
} from '@/app/features/inventory/models/product-stock-api.model';
import type { ProductStockVm } from '@/app/features/inventory/models/product-stock-vm.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

const EM = '—';

function num(v: number | string | null | undefined): number | null {
    if (v == null || v === '') {
        return null;
    }
    const n = Number(v);
    return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
}

/** Stok miktarları için sade TR gösterim (para birimi yok). */
export function formatStockQuantityDisplay(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
        return EM;
    }
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(value);
}

export function mapMinimumStockLevelValueToRequest(level: number): UpdateProductStockMinimumStockLevelRequest {
    return { minimumStockLevel: level };
}

export function mapProductStockDtoToVm(dto: ProductStockDto): ProductStockVm {
    const qoh = num(dto.quantityOnHand);
    const minLvl = num(dto.minimumStockLevel);
    const below = dto.isBelowMinimum === true;
    const statusLabel = below ? 'Düşük stok' : 'Yeterli';
    const statusSeverity: StatusTagSeverity = below ? 'warn' : 'success';
    const clinicName = dto.clinicName?.trim() ? dto.clinicName.trim() : EM;

    return {
        id: dto.id,
        clinicId: dto.clinicId?.trim() ?? '',
        clinicName,
        quantityOnHand: qoh ?? 0,
        quantityText: formatStockQuantityDisplay(qoh),
        minimumStockLevel: minLvl ?? 0,
        minimumStockLevelText: formatStockQuantityDisplay(minLvl),
        isBelowMinimum: below,
        statusLabel,
        statusSeverity,
        updatedAtText: dto.updatedAtUtc?.trim()
            ? formatUtcIsoAsLocalDateTimeDisplay(dto.updatedAtUtc)
            : EM
    };
}
