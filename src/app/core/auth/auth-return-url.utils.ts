/**
 * Login, guest guard ve klinik seçimi için ortak: yalnızca uygulama içi `/panel/...` hedeflerine izin (open-redirect riski yok).
 */
export function safePanelReturnUrl(raw: string | null | undefined): string | null {
    const s = raw?.trim();
    return s && s.startsWith('/panel') && !s.startsWith('//') ? s : null;
}

export const DEFAULT_PANEL_AFTER_AUTH = '/panel/dashboard';

export function panelReturnUrlOrDefault(raw: string | null | undefined): string {
    return safePanelReturnUrl(raw) ?? DEFAULT_PANEL_AFTER_AUTH;
}
