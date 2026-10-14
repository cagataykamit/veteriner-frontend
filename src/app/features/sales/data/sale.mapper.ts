import { HttpParams } from '@angular/common/http';
import { formatStockQuantityDisplay } from '@/app/features/inventory/data/product-stock.mapper';
import type { ProductDto } from '@/app/features/inventory/models/product-api.model';
import { productControlledClassFromApi, productKindFromApi } from '@/app/features/inventory/utils/product-classification.utils';
import type {
    CreateSaleResponseDto,
    SaleDto,
    SaleDtoPagedResult,
    SaleLineDto,
    SalesListQuery,
    SaleStockOutcomeApi
} from '@/app/features/sales/models/sale-api.model';
import type {
    CreateSaleResultVm,
    SaleDetailVm,
    SaleLineVm,
    SaleListItemVm,
    SaleProductVm,
    SalesPagedVm
} from '@/app/features/sales/models/sale-vm.model';
import { toYmdOrNull } from '@/app/features/inventory/utils/stock-batch-expiry.utils';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

const EM = '—';
const WALK_IN_NAME = 'Peşin müşteri';

function num(v: number | string | null | undefined): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function str(v: string | null | undefined, fallback = EM): string {
    return v?.trim() ? v.trim() : fallback;
}

export function saleStockOutcomeLabel(outcome: SaleStockOutcomeApi | null | undefined): string {
    switch (outcome) {
        case 'StockReturned':
            return 'Stoğa döndü';
        case 'WrittenOff':
            return 'Zarar yazıldı';
        default:
            return EM;
    }
}

export function mapSaleLineDtoToVm(dto: SaleLineDto): SaleLineVm {
    const quantity = num(dto.quantity);
    const lot = dto.lotNumber?.trim() ?? '';
    const expiry = toYmdOrNull(dto.expiryDate);
    return {
        id: dto.id,
        productId: dto.productId,
        productName: str(dto.productName),
        unit: dto.unit?.trim() ?? '',
        quantity,
        quantityText: formatStockQuantityDisplay(quantity),
        unitPriceText: formatMoney(num(dto.unitPrice)),
        lineAmountText: formatMoney(num(dto.lineAmount)),
        batchText: lot ? (expiry ? `${lot} · SKT ${formatDateDisplay(expiry)}` : lot) : ''
    };
}

function productsSummary(lines: SaleLineDto[]): string {
    const names = lines.map((l) => str(l.productName));
    if (names.length === 0) {
        return EM;
    }
    return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export function mapSaleDtoToListItemVm(dto: SaleDto): SaleListItemVm {
    const currency = dto.currency?.trim() || 'TRY';
    const isVoided = dto.status === 'Voided';
    const outstanding = num(dto.outstandingAmount);
    return {
        id: dto.id,
        clientId: dto.clientId,
        clientName: dto.isWalkIn ? WALK_IN_NAME : str(dto.clientName),
        isWalkIn: dto.isWalkIn === true,
        isVoided,
        statusLabel: isVoided ? 'İptal edildi' : 'Geçerli',
        statusSeverity: isVoided ? 'secondary' : 'success',
        soldAtUtc: dto.soldAtUtc,
        totalText: formatMoney(num(dto.totalAmount), currency),
        paidText: formatMoney(num(dto.paidAmount), currency),
        outstandingText: formatMoney(outstanding, currency),
        hasOutstanding: !isVoided && outstanding > 0,
        productsSummary: productsSummary(dto.lines ?? [])
    };
}

export function mapSaleDtoToDetailVm(dto: SaleDto): SaleDetailVm {
    return {
        ...mapSaleDtoToListItemVm(dto),
        currency: dto.currency?.trim() || 'TRY',
        totalAmount: num(dto.totalAmount),
        paidAmount: num(dto.paidAmount),
        outstandingAmount: num(dto.outstandingAmount),
        notes: dto.notes?.trim() ?? '',
        lines: (dto.lines ?? []).map(mapSaleLineDtoToVm),
        voidReason: dto.voidReason?.trim() ?? '',
        voidedAtUtc: dto.voidedAtUtc ?? null,
        voidStockOutcome: dto.voidStockOutcome ?? null,
        voidStockOutcomeLabel: saleStockOutcomeLabel(dto.voidStockOutcome)
    };
}

export function mapPagedSalesToVm(raw: SaleDtoPagedResult): SalesPagedVm {
    return {
        items: (raw.items ?? []).map(mapSaleDtoToListItemVm),
        page: raw.page,
        pageSize: raw.pageSize,
        totalItems: raw.totalItems,
        totalPages: raw.totalPages
    };
}

export function mapCreateSaleResponseToVm(raw: CreateSaleResponseDto): CreateSaleResultVm {
    return {
        created: raw.created,
        sale: mapSaleDtoToDetailVm(raw.sale),
        stocks: (raw.stocks ?? []).map((s) => ({
            productId: s.productId,
            quantityText: formatStockQuantityDisplay(num(s.quantityOnHand)),
            isBelowMinimum: s.isBelowMinimum === true
        }))
    };
}

export function salesQueryToHttpParams(query: SalesListQuery): HttpParams {
    let p = new HttpParams().set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 20));
    for (const key of ['clinicId', 'clientId', 'productId', 'fromUtc', 'toUtc'] as const) {
        const v = query[key]?.trim();
        if (v) {
            p = p.set(key, v);
        }
    }
    if (query.includeVoided) {
        p = p.set('includeVoided', 'true');
    }
    return p;
}

export function mapProductDtoToSaleProductVm(dto: ProductDto): SaleProductVm {
    return {
        id: dto.id,
        name: str(dto.name),
        sku: dto.sku?.trim() ?? '',
        barcode: dto.barcode?.trim() ?? '',
        unit: dto.unit?.trim() ?? '',
        unitPrice: num(dto.unitPrice),
        currency: dto.currency?.trim() || 'TRY',
        kind: productKindFromApi(dto.kind),
        controlledClass: productControlledClassFromApi(dto.controlledClass)
    };
}

/** Aşı ve narkotik/psikotropik ürün satılamaz (ADR-016); sunucu da reddeder, arama önceden süzer. */
export function isSellableProduct(product: Pick<SaleProductVm, 'kind' | 'controlledClass'>): boolean {
    return product.kind !== 'Vaccine' && product.controlledClass === 'None';
}
