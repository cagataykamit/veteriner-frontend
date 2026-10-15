import { mapStockBatchDtoToVm } from '@/app/features/inventory/data/stock-batch.mapper';
import { STOCK_BATCH_EXPIRY_WARNING_DAYS, stockBatchExpiryStatus, toYmdOrNull } from '@/app/features/inventory/utils/stock-batch-expiry.utils';

describe('stockBatchExpiryStatus', () => {
    const today = '2026-10-13';

    it('SKT günü dahil kullanılabilir; ertesi gün süresi geçmiş', () => {
        expect(stockBatchExpiryStatus('2026-10-13', today)).toBe('soon');
        expect(stockBatchExpiryStatus('2026-10-12', today)).toBe('expired');
    });

    it('eşik gününde yaklaşan, bir gün sonrasında normal', () => {
        expect(STOCK_BATCH_EXPIRY_WARNING_DAYS).toBe(30);
        expect(stockBatchExpiryStatus('2026-11-12', today)).toBe('soon');
        expect(stockBatchExpiryStatus('2026-11-13', today)).toBe('ok');
    });

    it('SKT yoksa none', () => {
        expect(stockBatchExpiryStatus(null, today)).toBe('none');
    });

    it('tarih ISO olarak gelse de gün alınır', () => {
        expect(toYmdOrNull('2027-03-05T00:00:00')).toBe('2027-03-05');
        expect(toYmdOrNull('')).toBeNull();
    });
});

describe('mapStockBatchDtoToVm', () => {
    const dto = { id: 'b', clinicId: 'c', productId: 'p', initialQuantity: 10, remainingQuantity: '4' };

    it('backend isExpired işaretini esas alır ve rozet üretir', () => {
        const vm = mapStockBatchDtoToVm({ ...dto, expiryDate: '2026-10-01', isExpired: true }, '2026-10-13');

        expect(vm.isExpired).toBeTrue();
        expect(vm.expiryBadgeLabel).toBe('Süresi geçmiş');
        expect(vm.expiryBadgeSeverity).toBe('danger');
    });

    it('yaklaşan SKT için kalan günü yazar', () => {
        const vm = mapStockBatchDtoToVm({ ...dto, expiryDate: '2026-10-20', isExpired: false }, '2026-10-13');

        expect(vm.expiryStatus).toBe('soon');
        expect(vm.expiryBadgeLabel).toBe('SKT yaklaşıyor (7 gün)');
    });

    it('SKT\'siz partide rozet yok, seri no yoksa tire', () => {
        const vm = mapStockBatchDtoToVm({ ...dto, isExpired: false }, '2026-10-13');

        expect(vm.expiryBadgeLabel).toBe('');
        expect(vm.lotNumber).toBe('—');
        expect(vm.remainingQuantity).toBe(4);
    });
});
