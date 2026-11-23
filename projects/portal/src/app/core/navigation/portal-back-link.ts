import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Alt sayfadan üst sayfaya dönüş (PO-04): rota verisinde `PORTAL_BACK_LINK` taşıyan sayfada kabuk başlığının solunda "Geri"
 * çıkar ve bu yola döner. Ana sekmelerde (alt gezinme) yoktur.
 */
export const PORTAL_BACK_LINK = 'back';

/** Etkin rotanın en derin parçasının üst sayfa yolu; yoksa `null`. */
export function portalBackLink(root: ActivatedRouteSnapshot): string | null {
    let route = root;

    while (route.firstChild) {
        route = route.firstChild;
    }

    return (route.data[PORTAL_BACK_LINK] as string | undefined) ?? null;
}
