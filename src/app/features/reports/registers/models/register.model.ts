/** Kayıt defteri JSON yanıtı: `{ totalCount, items }`; sayfa bilgisi isteğin kendisinden eklenir. */
export interface RegisterDto<T> {
    readonly totalCount: number;
    readonly items: readonly T[];
}

export interface RegisterResultVm<T> extends RegisterDto<T> {
    readonly page: number;
    readonly pageSize: number;
}

export interface RegisterPrescriptionDto {
    readonly title: string;
    readonly items: readonly { name: string; quantity?: number | null; instructions?: string | null }[];
}

export interface RegisterAdministrationDto {
    readonly productName: string;
    readonly quantity: number;
    readonly unit: string;
    readonly addedAfterFinalization: boolean;
    readonly isVoided: boolean;
}

/** GET `/api/v1/reports/registers/examinations` satırı (REGISTERS_API_CONTRACT bölüm 2). */
export interface ExaminationRegisterRowDto {
    readonly rowNumber: number;
    readonly examinationId: string;
    readonly examinedAtUtc: string;
    readonly isFinalized: boolean;
    readonly ownerName: string;
    readonly ownerPhone?: string | null;
    readonly ownerAddress?: string | null;
    readonly petName: string;
    readonly species: string;
    readonly breed?: string | null;
    readonly gender?: string | null;
    readonly age?: string | null;
    readonly cardNumber?: string | null;
    readonly microchipNumber?: string | null;
    readonly protocolNumber?: string | null;
    readonly ePrescriptionId?: string | null;
    readonly complaint: string;
    readonly diagnosis?: string | null;
    readonly treatments: readonly string[];
    readonly prescriptions: readonly RegisterPrescriptionDto[];
    readonly administrations: readonly RegisterAdministrationDto[];
    readonly veterinarianName?: string | null;
}

export interface PrescriptionRegisterItemDto {
    readonly name: string;
    readonly pharmacologicalForm?: string | null;
    readonly packaging?: string | null;
    readonly quantity?: number | null;
}

/** GET `/api/v1/reports/registers/prescriptions` satırı (REGISTERS_API_CONTRACT bölüm 5). */
export interface PrescriptionRegisterRowDto {
    readonly rowNumber: number;
    readonly prescriptionId: string;
    readonly prescribedAtUtc: string;
    readonly prescriptionClass?: string | null;
    readonly volumeSequenceNumber?: string | null;
    readonly veterinarianName?: string | null;
    readonly veterinarianAddress?: string | null;
    readonly ownerName: string;
    readonly ownerAddress?: string | null;
    readonly species: string;
    readonly earTagNumber?: string | null;
    readonly animalCount: number;
    readonly items: readonly PrescriptionRegisterItemDto[];
}
