import type { ActivatedRoute, Router } from '@angular/router';
import type { EDocumentSource } from '@/app/entities/e-document/models/e-document.model';

/**
 * "Belge kes" penceresinden eksik ayar için ayar sayfasına gidip dönüş: seçim ve dönüş adresi oturum belleğinde (sessionStorage)
 * tutulur, çünkü entegratör bağlantısı sağlayıcı sayfasına gidip döner ve sorgu parametreleri kaybolur. Dönüş adresinde
 * `?resumeEDocument=1` görünce çağıran sayfa seçimi geri yükler ve pencereyi yeniden açar.
 */
export interface EDocumentResume {
    source: EDocumentSource;
    returnTo: string;
    savedAt: number;
}

export const E_DOCUMENT_RETURN_PARAM = 'returnTo';
export const E_DOCUMENT_RESUME_PARAM = 'resumeEDocument';

const STORAGE_KEY = 'vetinity.eDocumentResume';
/** Yarım bırakılan dönüş bir süre sonra unutulur; ayar sayfası eski bir şeridi göstermez. */
const MAX_AGE_MS = 60 * 60 * 1000;

/** Yalnız panel içi adres (dış adrese yönlendirme yok). */
export function isEDocumentReturnUrl(url: string | null | undefined): url is string {
    return !!url && url.startsWith('/panel/') && !url.startsWith('//') && !url.includes('\\');
}

export function storeEDocumentResume(source: EDocumentSource, returnTo: string, now = Date.now()): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ source, returnTo, savedAt: now } satisfies EDocumentResume));
    } catch {
        // Gizli pencere vb.: dönüş adresi sorgu parametresinde taşınır, pencere yeniden açılmaz.
    }
}

export function readEDocumentResume(now = Date.now()): EDocumentResume | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const value = raw ? (JSON.parse(raw) as EDocumentResume) : null;

        return value && isEDocumentReturnUrl(value.returnTo) && now - value.savedAt <= MAX_AGE_MS ? value : null;
    } catch {
        return null;
    }
}

export function clearEDocumentResume(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // yok say
    }
}

/** Adresten dönüş işaretini siler (yeniden yüklemede pencere tekrar açılmasın). */
export function withoutEDocumentResumeParam(router: Router, url: string): string {
    const tree = router.parseUrl(url);
    const queryParams = { ...tree.queryParams };

    delete queryParams[E_DOCUMENT_RESUME_PARAM];
    tree.queryParams = queryParams;

    return router.serializeUrl(tree);
}

/** Dönüş adresi: pencere yeniden açılsın diye işaret eklenir. */
export function eDocumentResumeUrl(router: Router, returnTo: string): string {
    const tree = router.parseUrl(returnTo);

    tree.queryParams = { ...tree.queryParams, [E_DOCUMENT_RESUME_PARAM]: '1' };

    return router.serializeUrl(tree);
}

/**
 * Çağıran sayfa açılışında: dönüş işareti varsa saklanan seçimi bir kez verir ve işareti adresten siler. Seçim bu sayfaya ait
 * değilse (başka sayfadan kalmışsa) `null`.
 */
export function consumeEDocumentResume(route: ActivatedRoute, router: Router): EDocumentSource | null {
    if (route.snapshot.queryParamMap.get(E_DOCUMENT_RESUME_PARAM) !== '1') {
        return null;
    }

    const resume = readEDocumentResume();
    const here = withoutEDocumentResumeParam(router, router.url).split('?')[0];

    clearEDocumentResume();
    void router.navigate([], { relativeTo: route, queryParams: { [E_DOCUMENT_RESUME_PARAM]: null }, queryParamsHandling: 'merge', replaceUrl: true });

    return resume && resume.returnTo.split('?')[0] === here ? resume.source : null;
}
