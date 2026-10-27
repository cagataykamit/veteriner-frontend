/** Bakım talimatı metin üst sınırı (sözleşme §6). */
export const CARE_INSTRUCTION_TEXT_MAX = 4000;

export interface CareInstructionVm {
    id: string;
    text: string;
    createdAtUtc: string;
    updatedAtUtc: string | null;
    /** PUT'a aynen geri gönderilir. */
    rowVersion: string;
}

export interface CareInstructionsListQuery {
    hospitalizationId: string;
    page?: number;
    pageSize?: number;
}

export interface CreateCareInstructionRequest {
    petId: string;
    hospitalizationId: string;
    text: string;
}
