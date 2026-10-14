import { formatStockQuantityDisplay } from '@/app/features/inventory/data/product-stock.mapper';
import type { ProductStockBatchesDto, StockBatchDto } from '@/app/features/inventory/models/stock-batch-api.model';
import type { ProductStockBatchesVm, StockBatchExpiryStatus, StockBatchVm } from '@/app/features/inventory/models/stock-batch-vm.model';
import {
    istanbulTodayYmdNow,
    stockBatchDaysLeft,
    stockBatchExpiryStatus,
    toYmdOrNull
} from '@/app/features/inventory/utils/stock-batch-expiry.utils';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v.trim() : EM;
}

function qty(v: number | string | null | undefined): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function dateText(v: string | null | undefined): string {
    const ymd = toYmdOrNull(v);
    return ymd ? formatDateDisplay(ymd) : EM;
}

function expiryBadge(status: StockBatchExpiryStatus, expiryYmd: string | null, todayYmd: string): { label: string; severity: StatusTagSeverity } {
    if (status === 'expired') {
        return { label: 'Süresi geçmiş', severity: 'danger' };
    }
    if (status === 'soon' && expiryYmd) {
        const days = stockBatchDaysLeft(expiryYmd, todayYmd);
        return { label: days === 0 ? 'SKT bugün' : `SKT yaklaşıyor (${days} gün)`, severity: 'warn' };
    }
    return { label: '', severity: 'secondary' };
}

export function mapStockBatchDtoToVm(dto: StockBatchDto, todayYmd: string = istanbulTodayYmdNow()): StockBatchVm {
    const expiryDate = toYmdOrNull(dto.expiryDate);
    // "Süresi geçmiş" kararı backend'indir; yaklaşan uyarısı gün farkından türetilir.
    const byDate = stockBatchExpiryStatus(expiryDate, todayYmd);
    const status: StockBatchExpiryStatus = dto.isExpired ? 'expired' : byDate === 'expired' ? 'soon' : byDate;
    const badge = expiryBadge(status, expiryDate, todayYmd);
    const remaining = qty(dto.remainingQuantity);
    const invoiceNumber = dto.invoiceNumber?.trim() ?? '';
    const invoiceDate = toYmdOrNull(dto.invoiceDate);
    return {
        id: dto.id,
        lotNumber: str(dto.lotNumber),
        expiryDate,
        expiryText: dateText(dto.expiryDate),
        expiryStatus: status,
        expiryBadgeLabel: badge.label,
        expiryBadgeSeverity: badge.severity,
        isExpired: status === 'expired',
        initialQuantity: qty(dto.initialQuantity),
        remainingQuantity: remaining,
        remainingText: formatStockQuantityDisplay(remaining),
        unit: dto.unit?.trim() ?? '',
        supplierName: str(dto.supplierName),
        invoiceText: invoiceNumber ? (invoiceDate ? `${invoiceNumber} · ${dateText(invoiceDate)}` : invoiceNumber) : EM,
        receivedText: dateText(dto.receivedDate)
    };
}

export function mapProductStockBatchesDtoToVm(dto: ProductStockBatchesDto): ProductStockBatchesVm {
    const today = istanbulTodayYmdNow();
    const unit = dto.unit?.trim() ?? '';
    return {
        productId: dto.productId,
        clinicId: dto.clinicId,
        unit,
        quantityOnHand: qty(dto.quantityOnHand),
        quantityOnHandText: formatStockQuantityDisplay(qty(dto.quantityOnHand)),
        availableText: formatStockQuantityDisplay(dto.availableQuantity == null ? qty(dto.quantityOnHand) : qty(dto.availableQuantity)),
        expiredQuantity: qty(dto.expiredQuantity),
        expiredText: formatStockQuantityDisplay(qty(dto.expiredQuantity)),
        batchedQuantityText: formatStockQuantityDisplay(qty(dto.batchedQuantity)),
        unbatchedQuantity: qty(dto.unbatchedQuantity),
        unbatchedQuantityText: formatStockQuantityDisplay(qty(dto.unbatchedQuantity)),
        batches: (dto.batches ?? []).map((b) => mapStockBatchDtoToVm({ ...b, unit: b.unit ?? unit }, today))
    };
}
