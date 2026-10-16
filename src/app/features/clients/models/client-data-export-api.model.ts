/**
 * `GET /api/v1/clients/{id}/data-export` yanıtı (`CLIENT_DATA_EXPORT_API_CONTRACT.md`, ADR-032 madde 2).
 * Enum alanları metin döner. Yanıt olduğu gibi "JSON indir" ile verilir; ekranda yalnız etiketlenir (VM'e çevrilmez).
 */
export interface ClientDataExportSectionDto<T> {
    items: T[];
    /** Bölüm üst sınırı (`maxRowsPerSection`) aşıldı; en yeni kayıtlar geldi. */
    isTruncated: boolean;
}

export interface ClientDataExportClientDto {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    createdAtUtc: string;
    preferredContactChannel: string;
    remindersOptedOut: boolean;
}

export interface ClientDataExportKvkkConsentDto {
    status: string;
    recordedOn: string | null;
    recordedByName: string | null;
}

export interface ClientDataExportPetDto {
    id: string;
    name: string;
    speciesName: string;
    breed: string | null;
    gender: string | null;
    birthDate: string | null;
    isNeutered: boolean;
    microchipNumber: string | null;
    passportOrTagNumber: string | null;
    status: string;
    deceasedOn: string | null;
}

export interface ClientDataExportAppointmentDto {
    scheduledAtUtc: string;
    durationMinutes: number;
    petId: string;
    petName: string;
    appointmentType: string;
    status: string;
}

export interface ClientDataExportExaminationDto {
    examinedAtUtc: string;
    petId: string;
    petName: string;
    complaint: string;
    assessment: string | null;
    status: string;
}

export interface ClientDataExportVaccinationDto {
    vaccineName: string;
    appliedAtUtc: string | null;
    dueAtUtc: string | null;
    petId: string;
    petName: string;
    status: string;
}

export interface ClientDataExportTreatmentDto {
    treatmentDateUtc: string;
    title: string;
    petId: string;
    petName: string;
}

export interface ClientDataExportPrescriptionDto {
    prescribedAtUtc: string;
    title: string;
    itemNames: string[];
    petId: string;
    petName: string;
}

export interface ClientDataExportChargeDto {
    createdAtUtc: string;
    description: string;
    petId: string | null;
    petName: string | null;
    amount: number;
    allocatedAmount: number;
    outstandingAmount: number;
    currency: string;
    isVoided: boolean;
    voidedAtUtc: string | null;
}

export interface ClientDataExportPaymentDto {
    paidAtUtc: string;
    amount: number;
    allocatedAmount: number;
    unallocatedAmount: number;
    currency: string;
    method: string;
    petId: string | null;
    petName: string | null;
    isVoided: boolean;
    voidedAtUtc: string | null;
}

export interface ClientDataExportBalanceDto {
    currency: string;
    chargedAmount: number;
    allocatedAmount: number;
    outstandingAmount: number;
    unallocatedPaymentAmount: number;
}

export interface ClientDataExportDto {
    generatedAtUtc: string;
    clinicId: string | null;
    maxRowsPerSection: number;
    client: ClientDataExportClientDto;
    kvkkConsent: ClientDataExportKvkkConsentDto;
    pets: ClientDataExportSectionDto<ClientDataExportPetDto>;
    appointments: ClientDataExportSectionDto<ClientDataExportAppointmentDto>;
    examinations: ClientDataExportSectionDto<ClientDataExportExaminationDto>;
    vaccinations: ClientDataExportSectionDto<ClientDataExportVaccinationDto>;
    treatments: ClientDataExportSectionDto<ClientDataExportTreatmentDto>;
    prescriptions: ClientDataExportSectionDto<ClientDataExportPrescriptionDto>;
    charges: ClientDataExportSectionDto<ClientDataExportChargeDto>;
    payments: ClientDataExportSectionDto<ClientDataExportPaymentDto>;
    balance: ClientDataExportBalanceDto;
}
