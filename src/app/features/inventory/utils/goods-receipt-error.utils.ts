import { HttpErrorResponse } from '@angular/common/http';
import { GoodsReceiptSubmitError } from '@/app/features/inventory/models/goods-receipt-form.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

const NOTHING_SAVED = 'Hiçbir satır kaydedilmedi; düzeltip aynı formu tekrar gönderebilirsiniz.';

const LINE_FIELD_MESSAGES: Record<string, string> = {
    productid: 'Ürün seçimi geçersiz.',
    quantity: 'Miktar 0’dan büyük olmalıdır.',
    unitcost: 'Birim maliyet 0 veya üzeri olmalıdır.',
    lotnumber: 'Seri/lot no çok uzun.',
    expirydate: 'Son kullanma tarihi geçersiz.'
};

const CODE_MESSAGES: Record<string, string> = {
    'GoodsReceipts.DuplicateRequestId': 'Bu kayıt kimliği farklı içerikli bir mal kabul için kullanılmış. Yeni bir mal kabul başlatın.',
    'GoodsReceipts.TooManyLines': 'En çok 100 satır girilebilir.',
    'StockMovements.ConcurrencyConflict': 'Stok başka bir işlemle güncellendi.',
    'StockMovements.ClinicContextMismatch': 'Seçili klinik ile aktif klinik bağlamı uyuşmuyor.',
    'Clinics.AccessDenied': 'Bu klinik için stok işlemi yapma yetkiniz yok.',
    'StockBatches.Validation': 'Depo çıkış tarihi geliş / teslim tarihinden sonra olamaz.'
};

/** `lines[2].quantity` → satır 2 (0 tabanlı), alan `quantity`. */
const LINE_KEY = /^lines\[(\d+)\]\.(\w+)$/i;
/** `Satır 3: …` → satır 3 (1 tabanlı). */
const LINE_DETAIL = /^Satır\s+(\d+):\s*([\s\S]*)$/;

function detailOf(err: HttpErrorResponse): string | null {
    const detail = (err.error as { detail?: unknown } | null)?.detail;

    return typeof detail === 'string' && detail.trim() ? detail.trim() : null;
}

function validationLineErrors(err: HttpErrorResponse): Record<number, string> {
    const errors = (err.error as { errors?: unknown } | null)?.errors;
    const out: Record<number, string> = {};

    if (!errors || typeof errors !== 'object') {
        return out;
    }

    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
        const m = LINE_KEY.exec(key);

        if (!m) {
            continue;
        }

        const index = Number(m[1]);
        const fallback = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');

        out[index] ??= LINE_FIELD_MESSAGES[m[2].toLowerCase()] ?? (fallback || 'Satırda geçersiz değer var.');
    }

    return out;
}

/** Mal kabul gönderim hatasını genel mesaj ve satır mesajlarına ayırır (tek kural yeri). */
export function toGoodsReceiptSubmitError(err: HttpErrorResponse): GoodsReceiptSubmitError {
    const code = problemCodeFromHttpError(err);
    const fieldErrors = validationLineErrors(err);

    if (Object.keys(fieldErrors).length > 0) {
        return new GoodsReceiptSubmitError(`Satırlarda düzeltilmesi gereken alanlar var. ${NOTHING_SAVED}`, fieldErrors);
    }

    const detail = detailOf(err);
    const line = detail ? LINE_DETAIL.exec(detail) : null;

    if (line) {
        return new GoodsReceiptSubmitError(`Satır ${line[1]} kaydedilemedi. ${NOTHING_SAVED}`, { [Number(line[1]) - 1]: line[2].trim() });
    }

    if (code === 'GoodsReceipts.DuplicateRequestId') {
        return new GoodsReceiptSubmitError(CODE_MESSAGES[code]);
    }

    if (code && CODE_MESSAGES[code]) {
        return new GoodsReceiptSubmitError(`${CODE_MESSAGES[code]} ${NOTHING_SAVED}`);
    }

    return new GoodsReceiptSubmitError(`${messageFromHttpError(err, 'Mal kabul kaydedilemedi.')} ${NOTHING_SAVED}`);
}
