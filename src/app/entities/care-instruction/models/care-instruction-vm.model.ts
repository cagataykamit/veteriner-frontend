import type { AiProvenanceVm } from '@/app/entities/ai/models/ai-vm.model';

/** Bakım talimatı metin üst sınırı (sözleşme §6). */
export const CARE_INSTRUCTION_TEXT_MAX = 4000;

export interface CareInstructionVm {
    id: string;
    text: string;
    createdAtUtc: string;
    updatedAtUtc: string | null;
    /** PUT'a aynen geri gönderilir. */
    rowVersion: string;
    /** "AI taslağından" izi (AI-004); kabulden sonra metin düzeltildiyse "düzenlendi". */
    aiProvenance?: AiProvenanceVm[];
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
