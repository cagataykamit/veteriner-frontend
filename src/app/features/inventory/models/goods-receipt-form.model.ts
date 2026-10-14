/** Mal kabul satırında ürün seçici değeri; AutoComplete seçilince nesne, yazarken metin tutar. */
export interface GoodsReceiptProductPick {
    id: string;
    label: string;
    barcode: string;
    requiresLotAndExpiry: boolean;
}

/** Sunucu özeti: kaç satır kaydedildi, daha önce mi kaydedilmişti. */
export interface GoodsReceiptResultVm {
    created: boolean;
    lineCount: number;
}

/** Sunucu hatası: genel mesaj + satır indeksine (0 tabanlı) göre mesajlar. */
export class GoodsReceiptSubmitError extends Error {
    constructor(
        message: string,
        readonly lineErrors: Readonly<Record<number, string>> = {}
    ) {
        super(message);
    }
}
