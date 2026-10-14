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

/** GET `/api/v1/reports/registers/vaccines` satırı (REGISTERS_API_CONTRACT bölüm 13). Tarihler takvim günüdür (`yyyy-MM-dd`). */
export interface VaccineRegisterRowDto {
    readonly rowNumber: number;
    readonly movementId: string;
    readonly productId: string;
    readonly tradeName: string;
    readonly lotNumber?: string | null;
    readonly expiryDate?: string | null;
    readonly totalQuantity: number;
    readonly supplierName?: string | null;
    readonly transportMethod?: string | null;
    readonly coldChainMonitor?: string | null;
    readonly dispatchedDate?: string | null;
    readonly deliveredDate: string;
    readonly invoiceDate?: string | null;
    readonly invoiceNumber?: string | null;
    readonly isBatched: boolean;
    readonly isReversed: boolean;
}

/** GET `/api/v1/reports/registers/medications` satırı (REGISTERS_API_CONTRACT bölüm 14). */
export interface MedicationRegisterRowDto {
    readonly rowNumber: number;
    readonly movementId: string;
    readonly productId: string;
    readonly productName: string;
    readonly pharmacologicalForm?: string | null;
    readonly presentationForm?: string | null;
    readonly quantity: number;
    readonly unit: string;
    readonly supplierName?: string | null;
    readonly receivedDate: string;
    readonly invoiceDate?: string | null;
    readonly invoiceNumber?: string | null;
    readonly lotNumber?: string | null;
    readonly isBatched: boolean;
    readonly isReversed: boolean;
}

export type ControlledSubstanceDirection = 'Received' | 'Issued' | 'Undetermined';

/** GET `/api/v1/reports/registers/controlled-substances` satırı (REGISTERS_API_CONTRACT bölüm 15): hareket başına bir satır, yalnız bir taraf dolu. */
export interface ControlledSubstanceRegisterRowDto {
    readonly rowNumber: number;
    readonly movementId: string;
    readonly productId: string;
    readonly movementType: 'Initial' | 'In' | 'Out' | 'Adjustment' | 'Reversal';
    readonly direction: ControlledSubstanceDirection;
    readonly productName: string;
    readonly pharmacologicalForm?: string | null;
    readonly commercialPresentation?: string | null;
    readonly quantity: number;
    readonly lotNumber?: string | null;
    readonly receivedFrom?: string | null;
    readonly receivedDate?: string | null;
    readonly receivedDocumentNumber?: string | null;
    readonly issuedTo?: string | null;
    readonly issuedDate?: string | null;
    readonly issuedDocumentNumber?: string | null;
    readonly isBatched: boolean;
}

/** GET `/api/v1/reports/registers/vaccine-info` satırı (REGISTERS_API_CONTRACT bölüm 16). */
export interface VaccineInfoRegisterRowDto {
    readonly rowNumber: number;
    readonly administrationId: string;
    readonly administeredAtUtc: string;
    readonly ownerName: string;
    readonly clientIdentityNumber?: string | null;
    readonly petName: string;
    readonly species: string;
    readonly microchipNumber?: string | null;
    readonly productName: string;
    readonly lotNumber?: string | null;
    readonly expiryDate?: string | null;
    readonly unit: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly totalPrice: number;
    readonly currency: string;
    readonly addedAfterFinalization: boolean;
    readonly isVoided: boolean;
}
