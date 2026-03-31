/**
 * PrimeNG popup `p-menu` bazen layout/destroy sırasında `document.body` altında orphan kalır
 * (özellikle motion wrapper `p-motion` ile). Login veya çıkış sonrası görünür overlay kalmaması için sökülür.
 */
function containsPrimeMenuOverlay(child: Element): boolean {
    return child.querySelector('ul[data-pc-section="menu"][role="menu"]') !== null;
}

export function removeOrphanedPrimeMenuPopupsFromBody(doc: Document): void {
    const { body } = doc;
    if (!body) {
        return;
    }

    const toRemove: Element[] = [];

    for (const child of Array.from(body.children)) {
        if (child.matches('.p-menu.p-menu-overlay')) {
            toRemove.push(child);
            continue;
        }
        if (child.tagName.toLowerCase() === 'p-motion' && containsPrimeMenuOverlay(child)) {
            toRemove.push(child);
        }
    }

    for (const el of toRemove) {
        el.remove();
    }
}
