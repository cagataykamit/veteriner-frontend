import { VACCINE_DEFINITIONS_READ_CLAIM, VACCINATIONS_CREATE_CLAIM, VACCINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

/**
 * Aşı düzenleme rotasına (`/panel/vaccinations/:id/edit`) girilebilir mi: güncelleme yetkisi ve formun yüklediği aşı kataloğu
 * (`VaccineDefinitions.Read`). Rota koruması ve bu rotaya giden tüm Düzenle/Uygula bağlantıları aynı kuralı kullanır;
 * yetkisi eksik kullanıcıya bağlantı gösterilmez (yetkiniz yok ekranına düşmez).
 */
export function canOpenVaccinationEdit(hasClaim: (claim: string) => boolean): boolean {
    return hasClaim(VACCINATIONS_UPDATE_CLAIM) && hasClaim(VACCINE_DEFINITIONS_READ_CLAIM);
}

/** Yeni aşı formuna (`/panel/vaccinations/new`) girilebilir mi: oluşturma yetkisi ve aşı kataloğu. Sonraki dozu uygulama bu yoldan gider. */
export function canOpenVaccinationCreate(hasClaim: (claim: string) => boolean): boolean {
    return hasClaim(VACCINATIONS_CREATE_CLAIM) && hasClaim(VACCINE_DEFINITIONS_READ_CLAIM);
}
