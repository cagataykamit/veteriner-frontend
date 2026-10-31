/**
 * Kimlik kartı altındaki gösterge şeridi (müşteri, hasta, randevu detayı): dar kartta 2 sütun; geniş kartta (`@container`, ≥42rem)
 * gösterge sayısı kadar eşit sütun ve ayırıcı çizgi. Etiket `field-label`, değer bir boy büyük. Kart `@container` olmalıdır.
 */
export const DETAIL_STATS_GRID_CLASS =
    'm-0 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 grid grid-cols-2 @2xl:grid-cols-none @2xl:grid-flow-col @2xl:auto-cols-fr gap-x-5 gap-y-3 [&>div]:min-w-0 [&_dt]:field-label [&_dt]:mb-1 [&_dd]:m-0 [&_dd]:text-base @2xl:[&>div+div]:pl-5 @2xl:[&>div+div]:border-l @2xl:[&>div+div]:border-surface-200 @2xl:dark:[&>div+div]:border-surface-700';
