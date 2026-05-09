import { HttpParams } from '@angular/common/http';
import type { StockMovementDto, StockMovementDtoPagedResult } from '@/app/features/inventory/models/stock-movement-api.model';
import type { StockMovementsListQuery } from '@/app/features/inventory/models/stock-movement-query.model';
import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';
import { formatStockQuantityDisplay } from '@/app/features/inventory/data/product-stock.mapper';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

const EM = '—';

export type MovementKind = 'Initial' | 'In' | 'Out' | 'Adjustment' | 'Unknown';

function str(v: string | null | undefined): string {
    return v?.trim() ? v.trim() : EM;
}

function num(v: number | string | null | undefined): number | null {
    if (v == null || v === '') {
        return null;
    }
    const n = Number(v);
    return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
}

/** Backend enum string veya sayı → kanonik hareket tipi. */
export function normalizeMovementKind(raw: unknown): MovementKind {
    if (raw === null || raw === undefined) {
        return 'Unknown';
    }
    if (typeof raw === 'number') {
        if (raw === 0) {
            return 'Initial';
        }
        if (raw === 1) {
            return 'In';
        }
        if (raw === 2) {
            return 'Out';
        }
        if (raw === 3) {
            return 'Adjustment';
        }
        return 'Unknown';
    }
    const s = String(raw).trim();
    if (!s) {
        return 'Unknown';
    }
    const lower = s.toLowerCase();
    if (lower === 'initial' || s === '0') {
        return 'Initial';
    }
    if (lower === 'in' || s === '1') {
        return 'In';
    }
    if (lower === 'out' || s === '2') {
        return 'Out';
    }
    if (lower === 'adjustment' || s === '3') {
        return 'Adjustment';
    }
    return 'Unknown';
}

export function movementKindToApiParam(kind: MovementKind): string | null {
    if (kind === 'Unknown') {
        return null;
    }
    return kind;
}

export function movementKindLabel(kind: MovementKind): string {
    switch (kind) {
        case 'Initial':
            return 'İlk stok';
        case 'In':
            return 'Stok girişi';
        case 'Out':
            return 'Stok çıkışı';
        case 'Adjustment':
            return 'Stok düzeltme';
        default:
            return 'Bilinmiyor';
    }
}

export function movementKindSeverity(kind: MovementKind): StatusTagSeverity {
    switch (kind) {
        case 'Initial':
            return 'info';
        case 'In':
            return 'success';
        case 'Out':
            return 'warn';
        case 'Adjustment':
            return 'secondary';
        default:
            return 'secondary';
    }
}

function dateOnlyToUtcStartIso(dateStr: string): string | null {
    const t = dateStr.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return null;
    }
    return `${t}T00:00:00.000Z`;
}

function dateOnlyToUtcEndIso(dateStr: string): string | null {
    const t = dateStr.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return null;
    }
    return `${t}T23:59:59.999Z`;
}

function referenceLine(type: string | null | undefined, id: string | null | undefined): string {
    const tt = type?.trim();
    const ii = id?.trim();
    if (tt && ii) {
        return `${tt} · ${ii}`;
    }
    if (tt) {
        return tt;
    }
    if (ii) {
        return ii;
    }
    return EM;
}

export function mapStockMovementDtoToVm(dto: StockMovementDto): StockMovementVm {
    const kind = normalizeMovementKind(dto.movementType);
    const qty = num(dto.quantity);
    const unitCost = num(dto.unitCost);
    const productName = dto.productName?.trim() ?? '';
    const sku = dto.productSku?.trim() ?? '';
    const productDisplayName =
        productName && sku ? `${productName} (${sku})` : productName || sku || EM;

    return {
        id: dto.id,
        productId: dto.productId?.trim() ?? '',
        productName: productName || EM,
        productSku: sku || EM,
        productDisplayName,
        productCategoryName: str(dto.productCategoryName),
        clinicName: str(dto.clinicName),
        movementType: kind,
        movementTypeLabel: movementKindLabel(kind),
        movementTypeSeverity: movementKindSeverity(kind),
        quantity: qty ?? 0,
        quantityText: formatStockQuantityDisplay(qty),
        unitCostText: formatMoney(unitCost, 'TRY'),
        reason: str(dto.reason),
        referenceText: referenceLine(dto.referenceType, dto.referenceId),
        occurredAtText: dto.occurredAtUtc?.trim() ? formatUtcIsoAsLocalDateTimeDisplay(dto.occurredAtUtc) : EM,
        createdAtText: dto.createdAtUtc?.trim() ? formatUtcIsoAsLocalDateTimeDisplay(dto.createdAtUtc) : EM,
        notes: str(dto.notes)
    };
}

export function mapPagedStockMovementsToVm(raw: StockMovementDtoPagedResult): {
    items: StockMovementVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (raw.items ?? []).map((row) => mapStockMovementDtoToVm(row));
    return {
        items,
        page: raw.page,
        pageSize: raw.pageSize,
        totalItems: raw.totalItems,
        totalPages: raw.totalPages
    };
}

export function stockMovementsListQueryToHttpParams(
    query: StockMovementsListQuery,
    opts?: { omitPaging?: boolean; omitSearch?: boolean }
): HttpParams {
    let p = new HttpParams();
    if (!opts?.omitPaging) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 10;
        p = p.set('Page', String(page));
        p = p.set('PageSize', String(pageSize));
    }
    if (!opts?.omitSearch && query.search?.trim()) {
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
    if (query.movementType?.trim()) {
        const k = normalizeMovementKind(query.movementType.trim());
        const apiVal = movementKindToApiParam(k);
        if (apiVal) {
            p = p.set('MovementType', apiVal);
        }
    }
    if (query.dateFromUtc?.trim()) {
        const iso = dateOnlyToUtcStartIso(query.dateFromUtc);
        if (iso) {
            p = p.set('DateFromUtc', iso);
        }
    }
    if (query.dateToUtc?.trim()) {
        const iso = dateOnlyToUtcEndIso(query.dateToUtc);
        if (iso) {
            p = p.set('DateToUtc', iso);
        }
    }
    return p;
}
