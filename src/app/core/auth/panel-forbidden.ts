/**
 * Yetkisi olmayan rotanın tek hedefi: panel içinde "yetkiniz yok" ekranı (menü ve üst çubuk yerinde kalır).
 * Rota korumaları genel 404'e değil buraya yönlendirir; kullanıcı sayfanın yok olduğunu sanmasın (H6).
 * Platform yönetimi sayfaları (ADR-037) kasıtlı olarak bulunamadı sayfasına gider.
 */
export const PANEL_FORBIDDEN_URL = '/panel/forbidden';
