/**
 * Online talepte "acil" nedeni uyarısı (ADR-042 eki): online talep klinik onayını beklediği için acil vaka telefonla alınmalı.
 * Engel değil, yalnız uyarı; ad Türkçe küçük harfe çevrilip "acil" aranır.
 */
export const URGENT_ONLINE_REASON_WARNING = 'Acil vakalar online talep yerine telefonla alınmalı: online talep kliniğin onayını bekler. Bu nedeni online talepte gizlemeniz önerilir.';

export function isUrgentOnlineReason(name: string | null | undefined, isOnlineBookable: boolean): boolean {
    return isOnlineBookable && (name ?? '').toLocaleLowerCase('tr-TR').includes('acil');
}

/**
 * Sahip portalında her zaman listenin sonunda duran sistem seçeneği; klinik tanımlamaz, kapatamaz (ADR-042 eki).
 * Ad ve süre backend `AppointmentRequest.OtherReasonName` / `OtherReasonDurationMinutes` ile aynıdır; panelde yalnız gösterilir.
 */
export const ONLINE_OTHER_REASON = { name: 'Diğer / emin değilim', durationMinutes: 30 } as const;

export const ONLINE_OTHER_REASON_NOTE = `Online talepte listenin sonunda her zaman "${ONLINE_OTHER_REASON.name}" seçeneği de bulunur; onu seçen sahip ne için geldiğini yazar.`;
