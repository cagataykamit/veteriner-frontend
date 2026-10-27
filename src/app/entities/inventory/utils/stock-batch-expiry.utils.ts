import type { StockBatchExpiryStatus } from '@/app/entities/inventory/models/stock-batch-vm.model';
import { toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/** SKT'ye bu kadar gün veya daha az kalan parti "yaklaşan" sayılır (sözleşmede eşik yok; arayüz kararı). */
export const STOCK_BATCH_EXPIRY_WARNING_DAYS = 30;

const MS_PER_DAY = 86_400_000;

function ymdToUtcMs(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);

    return Date.UTC(y, m - 1, d);
}

/** API tarihi (`yyyy-MM-dd` veya ISO) → `yyyy-MM-dd`; boş/geçersiz → `null`. */
export function toYmdOrNull(value: string | null | undefined): string | null {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(value?.trim() ?? '');

    return m ? m[1] : null;
}

export function istanbulTodayYmdNow(now: Date = new Date()): string {
    return toIstanbulDateInputValue(now.toISOString());
}

/** SKT günü dahil kullanılabilir; SKT bugünden önceyse geçmiştir (sözleşme §1). */
export function stockBatchExpiryStatus(expiryYmd: string | null, todayYmd: string): StockBatchExpiryStatus {
    if (!expiryYmd) {
        return 'none';
    }

    const daysLeft = Math.round((ymdToUtcMs(expiryYmd) - ymdToUtcMs(todayYmd)) / MS_PER_DAY);

    if (daysLeft < 0) {
        return 'expired';
    }

    return daysLeft <= STOCK_BATCH_EXPIRY_WARNING_DAYS ? 'soon' : 'ok';
}

export function stockBatchDaysLeft(expiryYmd: string, todayYmd: string): number {
    return Math.round((ymdToUtcMs(expiryYmd) - ymdToUtcMs(todayYmd)) / MS_PER_DAY);
}
