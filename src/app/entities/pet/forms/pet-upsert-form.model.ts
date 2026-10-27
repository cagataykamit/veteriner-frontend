import type { PetAlertFlag } from '@/app/shared/pet-alerts/pet-alerts.utils';
/**
 * Pet create/edit — tek form değer şekli (typed `FormGroup` ile birebir).
 * API veya VM modellerinden ayrı; yalnızca kullanıcı girdisi.
 */
export interface PetUpsertFormValue {
    clientId: string;
    name: string;
    speciesId: string;
    breedId: string;
    gender: string;
    birthDate: string;
    colorId: string;
    /** `type="number"` ile bazen `number` döner. */
    weightStr: string | number;
    microchipNumber: string;
    passportOrTagNumber: string;
    specialProtocolNumber: string;
    /** HBS hayvan kimlik no (ADR-036); boş = temizle. */
    hbsAnimalId: string;
    isNeutered: boolean;
    notes: string;
    alertFlags: PetAlertFlag[];
    alertNote: string;
}
