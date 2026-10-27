import { VACCINE_DEFINITIONS_READ_CLAIM, VACCINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

/**
 * Aşı düzenleme rotasına (`/panel/vaccinations/:id/edit`) girilebilir mi: güncelleme yetkisi ve formun yüklediği aşı kataloğu
 * (`VaccineDefinitions.Read`). Rota koruması ve bu rotaya giden tüm Düzenle/Uygula bağlantıları aynı kuralı kullanır;
 * yetkisi eksik kullanıcıya bağlantı gösterilmez (`/notfound`'a düşmez).
 */
export function canOpenVaccinationEdit(hasClaim: (claim: string) => boolean): boolean {
    return hasClaim(VACCINATIONS_UPDATE_CLAIM) && hasClaim(VACCINE_DEFINITIONS_READ_CLAIM);
}
