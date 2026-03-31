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
    notes: string;
}
