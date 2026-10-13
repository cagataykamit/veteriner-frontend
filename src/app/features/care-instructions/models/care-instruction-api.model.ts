/**
 * Bakım talimatı (CareInstruction) API DTO'ları — `docs/HOSPITALIZATION_MODEL_API_CONTRACT.md` §6.
 * Yalnızca mapper ve servis kullanır.
 */

export interface CareInstructionDto {
    id: string;
    clinicId: string;
    petId: string;
    hospitalizationId?: string | null;
    examinationId?: string | null;
    visitId?: string | null;
    text: string;
    createdAtUtc: string;
    updatedAtUtc?: string | null;
    rowVersion: string;
}

export interface CareInstructionPagedResultDto {
    items?: CareInstructionDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** POST gövdesi; bağlar oluşturulduktan sonra değişmez. */
export interface CareInstructionCreateRequestDto {
    clinicId: string;
    petId: string;
    hospitalizationId?: string | null;
    examinationId?: string | null;
    visitId?: string | null;
    text: string;
}

/** PUT gövdesi: yalnız metin değişir. */
export interface CareInstructionUpdateRequestDto {
    text: string;
    rowVersion: string;
}

/** PUT yanıtı (200). */
export interface CareInstructionWriteResultDto {
    id: string;
    rowVersion: string;
}
