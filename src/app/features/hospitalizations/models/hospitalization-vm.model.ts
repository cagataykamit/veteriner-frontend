/**
 * Hospitalizations — UI view modelleri.
 */

export interface HospitalizationListItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    examinationId: string | null;
    visitId: string | null;
    /** Atama anında türetilmiş ya da eski serbest metin konum. */
    location: string;
    roomId: string | null;
    roomName: string | null;
    wardName: string | null;
    /** Ekranda gösterilen konum: oda varsa "Bölüm / Oda", yoksa `location` metni; ikisi de yoksa `''`. */
    locationLabel: string;
    admittedAtUtc: string | null;
    plannedDischargeAtUtc: string | null;
    dischargedAtUtc: string | null;
    reason: string;
    isActive: boolean;
}

export interface HospitalizationDetailVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    examinationId: string | null;
    visitId: string | null;
    location: string;
    roomId: string | null;
    roomName: string | null;
    wardName: string | null;
    locationLabel: string;
    admittedAtUtc: string | null;
    plannedDischargeAtUtc: string | null;
    dischargedAtUtc: string | null;
    reason: string;
    notes: string;
    dischargeNote: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
    isActive: boolean;
    /** Yazma çağrılarına aynen geri gönderilir. */
    rowVersion: string;
}

export interface HospitalizationEditVm {
    id: string;
    clinicId: string;
    clientId: string;
    petId: string;
    clientName: string | null;
    petName: string | null;
    examinationId: string;
    visitId: string;
    /** Kayıtlı konum metni; oda yoksa eski serbest metin olabilir. */
    location: string;
    /** Kayıtlı oda; yoksa `''`. Pasifleşmiş olsa da seçicide gösterilir. */
    roomId: string;
    admittedAtUtc: string | null;
    plannedDischargeAtUtc: string | null;
    reason: string;
    notes: string;
    isActive: boolean;
    rowVersion: string;
}
