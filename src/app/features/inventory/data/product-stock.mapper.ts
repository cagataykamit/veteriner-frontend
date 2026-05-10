import { HttpParams } from '@angular/common/http';
import type {
    ProductStockDto,
    ProductStockDtoPagedResult,
    ProductStocksListQuery,
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

export interface ProductStocksPagedVm {
    items: ProductStockVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export function productStocksQueryToHttpParams(query: ProductStocksListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.clinicId?.trim()) {
        p = p.set('ClinicId', query.clinicId.trim());
    }
    if (query.productId?.trim()) {
        p = p.set('ProductId', query.productId.trim());
    }
    if (query.productCategoryId?.trim()) {
        p = p.set('ProductCategoryId', query.productCategoryId.trim());
    }
    if (query.isBelowMinimum === true) {
        p = p.set('IsBelowMinimum', 'true');
    } else if (query.isBelowMinimum === false) {
        p = p.set('IsBelowMinimum', 'false');
    }
    return p;
}

export function mapPagedProductStocksToVm(res: ProductStockDtoPagedResult): ProductStocksPagedVm {
    const raw = Array.isArray(res.items) ? res.items : [];
    return {
        items: raw.map((dto) => mapProductStockDtoToVm(dto)),
        page: res.page,
        pageSize: res.pageSize,
        totalItems: res.totalItems,
        totalPages: res.totalPages
    };
}

export function mapProductStockDtoToVm(dto: ProductStockDto): ProductStockVm {
    const qoh = num(dto.quantityOnHand);
    const minLvl = num(dto.minimumStockLevel);
    const below = dto.isBelowMinimum === true;
    const statusLabel = below ? 'Düşük stok' : 'Yeterli';
    const statusSeverity: StatusTagSeverity = below ? 'warn' : 'success';
    const clinicName = dto.clinicName?.trim() ? dto.clinicName.trim() : EM;
    const productName = dto.productName?.trim() ? dto.productName.trim() : EM;
    const skuRaw = dto.productSku?.trim();
    const productSkuText = skuRaw ? skuRaw : EM;
    const productCategoryName = dto.productCategoryName?.trim() ? dto.productCategoryName.trim() : EM;

    return {
        id: dto.id,
        productId: dto.productId?.trim() ?? '',
        productName,
        productSkuText,
        productCategoryName,
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
