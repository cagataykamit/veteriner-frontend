/**
 * Detay sayfalarının ortak sınıf kümeleri (müşteri, hasta, randevu, muayene …): kimlik kartı altındaki gösterge şeridi,
 * etiket/değer listesi ve kutucuk ızgarası. Etiket `field-label`, boş durum `field-empty` (tailwind.css). Kart `@container` olmalıdır.
 */

/** Gösterge şeridi: dar kartta 2 sütun; geniş kartta (≥42rem) gösterge sayısı kadar eşit sütun ve ayırıcı çizgi; değer bir boy büyük. */
export const DETAIL_STATS_GRID_CLASS =
    'm-0 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 grid grid-cols-2 @2xl:grid-cols-none @2xl:grid-flow-col @2xl:auto-cols-fr gap-x-5 gap-y-3 [&>div]:min-w-0 [&_dt]:field-label [&_dt]:mb-1 [&_dd]:m-0 [&_dd]:text-base @2xl:[&>div+div]:pl-5 @2xl:[&>div+div]:border-l @2xl:[&>div+div]:border-surface-200 @2xl:dark:[&>div+div]:border-surface-700';

/** Etiket üstte, değer altta; satırlar ince çizgiyle ayrılı (kayıt bilgileri vb.). Her çift bir `<div>` içinde. */
export const DETAIL_FIELD_LIST_CLASS =
    'm-0 divide-y divide-surface-200 dark:divide-surface-700 [&>div]:py-2 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0 [&_dt]:field-label [&_dt]:mb-0.5 [&_dd]:m-0 [&_dd]:break-words';

/** Kutucuk ızgarası (klinik özet vb.): her madde açık zeminli kutuda; kart genişliğine göre 1–2 sütun. Her madde bir `<div>`. */
export const DETAIL_TILE_GRID_CLASS =
    'm-0 grid grid-cols-1 @xl:grid-cols-2 gap-3 [&>div]:min-w-0 [&>div]:rounded-border [&>div]:bg-surface-50 [&>div]:p-3 dark:[&>div]:bg-surface-800 [&_dt]:field-label [&_dt]:mb-1.5 [&_dd]:m-0 [&_dd]:text-surface-900 dark:[&_dd]:text-surface-0';
