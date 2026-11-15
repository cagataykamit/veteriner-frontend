import { inject } from '@angular/core';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { safePanelReturnUrl } from '@/app/core/auth/auth-return-url.utils';

/** Bağlam parametresinden açılan kart; sıra en özelden en genele (muayeneden açılan formda hasta ve müşteri de gelir). */
const CONTEXT_CARDS: ReadonlyArray<{ readonly param: string; readonly path: string }> = [
    { param: 'examinationId', path: '/panel/examinations' },
    { param: 'hospitalizationId', path: '/panel/hospitalizations' },
    { param: 'petId', path: '/panel/pets' },
    { param: 'clientId', path: '/panel/clients' }
];

const pathOf = (url: string): string => url.split(/[?#]/)[0];

/** Dönüş hedefi ve nereden geldiği; `list` ise kullanıcı sayfaya doğrudan (adres/yenileme) gelmiştir. */
export interface ReturnTarget {
    readonly url: string;
    readonly source: 'returnUrl' | 'previous' | 'context' | 'list';
}

/**
 * Formun "İptal" ve kayıt sonrası dönüş hedefi: önce `?returnUrl=`, yoksa panelde gelinen sayfa, yoksa bağlamdaki kart
 * (`?examinationId` / `?hospitalizationId` / `?petId` / `?clientId`), yoksa liste. Gelinen sayfa yalnız gezinme sırasında
 * bilinir; bu yüzden bileşen alan başlatıcısında çağrılır.
 */
export function resolveReturnTarget(
    query: ParamMap,
    previousUrl: string | null,
    currentUrl: string,
    listUrl: string
): ReturnTarget {
    const explicit = safePanelReturnUrl(query.get('returnUrl'));

    if (explicit) {
        return { url: explicit, source: 'returnUrl' };
    }

    const previous = safePanelReturnUrl(previousUrl);

    if (previous && pathOf(previous) !== pathOf(currentUrl)) {
        return { url: previous, source: 'previous' };
    }

    for (const card of CONTEXT_CARDS) {
        const id = query.get(card.param)?.trim();

        if (id) {
            return { url: `${card.path}/${encodeURIComponent(id)}`, source: 'context' };
        }
    }

    return { url: listUrl, source: 'list' };
}

/** {@link resolveReturnTarget} için yönlendirici ve rotadan okur; injection context ister. */
export function injectReturnTarget(listUrl: string): ReturnTarget {
    const router = inject(Router);
    const route = inject(ActivatedRoute);
    const navigation = router.currentNavigation();
    const previousTree = navigation?.previousNavigation?.finalUrl ?? null;
    const currentUrl = navigation?.finalUrl ? router.serializeUrl(navigation.finalUrl) : router.url;

    return resolveReturnTarget(
        route.snapshot.queryParamMap,
        previousTree ? router.serializeUrl(previousTree) : null,
        currentUrl,
        listUrl
    );
}
