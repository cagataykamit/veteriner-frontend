import type { AiProvenanceVm } from '@/app/entities/ai/models/ai-vm.model';

export interface OwnerExplanationVm {
    id: string;
    text: string;
    createdByName: string | null;
    createdAtUtc: string;
    aiProvenance: AiProvenanceVm[];
}
