/**
 * Online talepte "acil" nedeni uyarısı (ADR-042 eki): online talep klinik onayını beklediği için acil vaka telefonla alınmalı.
 * Engel değil, yalnız uyarı; ad Türkçe küçük harfe çevrilip "acil" aranır.
 */
export const URGENT_ONLINE_REASON_WARNING = 'Acil vakalar online talep yerine telefonla alınmalı: online talep kliniğin onayını bekler. Bu nedeni online talepte gizlemeniz önerilir.';

export function isUrgentOnlineReason(name: string | null | undefined, isOnlineBookable: boolean): boolean {
    return isOnlineBookable && (name ?? '').toLocaleLowerCase('tr-TR').includes('acil');
}

/** Sahip portalında her zaman listenin sonunda duran sistem seçeneği; klinik tanımlamaz (ADR-042 eki). */
export const ONLINE_OTHER_REASON_NOTE = 'Online talepte listenin sonunda her zaman "Diğer / emin değilim" seçeneği de bulunur; onu seçen sahip ne için geldiğini yazar.';
