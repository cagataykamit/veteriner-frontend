/** Uygulama yolu (RECORD-005, `ADMINISTRATIONS_API_CONTRACT.md` §11); sunucu enum adı. */
export type AdministrationRouteApi =
    | 'Oral'
    | 'Subcutaneous'
    | 'Intramuscular'
    | 'Intravenous'
    | 'Intranasal'
    | 'Intradermal'
    | 'Topical'
    | 'Ophthalmic'
    | 'Otic'
    | 'Rectal'
    | 'Other';

/** Sözleşme: bölge en çok 100 karakter. */
export const ADMINISTRATION_SITE_MAX = 100;

/** Klinikte yaygın kısaltma parantez içinde; seçim listesi ve satır metni aynı etiketi kullanır. */
const ROUTE_LABELS: Record<AdministrationRouteApi, string> = {
    Subcutaneous: 'Deri altı (SC)',
    Intramuscular: 'Kas içi (IM)',
    Intravenous: 'Damar içi (IV)',
    Oral: 'Ağızdan (PO)',
    Intranasal: 'Burun içi (IN)',
    Intradermal: 'Deri içi (ID)',
    Topical: 'Haricen (deriye)',
    Ophthalmic: 'Göze',
    Otic: 'Kulağa',
    Rectal: 'Rektal',
    Other: 'Diğer'
};

/** Sık kullanılan önce. */
export const ADMINISTRATION_ROUTE_OPTIONS: readonly { label: string; value: AdministrationRouteApi }[] = (
    Object.keys(ROUTE_LABELS) as AdministrationRouteApi[]
).map((value) => ({ label: ROUTE_LABELS[value], value }));

export function administrationRouteFromApi(value: string | null | undefined): AdministrationRouteApi | null {
    return value && value in ROUTE_LABELS ? (value as AdministrationRouteApi) : null;
}

export function administrationRouteLabel(route: AdministrationRouteApi | null): string | null {
    return route ? ROUTE_LABELS[route] : null;
}

/** Satır/detay metni: "Kas içi (IM) · Sağ arka bacak"; ikisi de boşsa `null`. */
export function administrationRouteSiteText(row: { route: AdministrationRouteApi | null; site: string | null }): string | null {
    const parts = [administrationRouteLabel(row.route), row.site?.trim() || null].filter((p): p is string => !!p);

    return parts.length > 0 ? parts.join(' · ') : null;
}
