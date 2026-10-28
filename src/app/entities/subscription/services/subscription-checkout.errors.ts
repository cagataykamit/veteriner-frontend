/** Backend `Subscriptions.CheckoutAlreadyPaid`: açık oturumun ödemesi sağlayıcıda alınmış ve aboneliğe işlenmiş. */
export const CHECKOUT_ALREADY_PAID_CODE = 'Subscriptions.CheckoutAlreadyPaid';

/** Ödeme başlatılırken önceki ödemenin işlendiği anlaşıldı; ekran hata değil bilgi gösterir ve özeti yeniler. */
export class CheckoutAlreadyPaidError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CheckoutAlreadyPaidError';
    }
}
