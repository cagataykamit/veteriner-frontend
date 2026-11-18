import { mapAiProvenanceDtosToVm } from '@/app/entities/ai/data/ai.mapper';
import type { OwnerExplanationDto } from '@/app/entities/owner-explanation/models/owner-explanation-api.model';
import type { OwnerExplanationVm } from '@/app/entities/owner-explanation/models/owner-explanation-vm.model';

export function mapOwnerExplanationDtoToVm(dto: OwnerExplanationDto): OwnerExplanationVm {
    return {
        id: dto.id,
        text: dto.text ?? '',
        createdByName: dto.createdByName?.trim() || null,
        createdAtUtc: dto.createdAtUtc,
        // Kayıt oluşturulduktan sonra değişmez: iz yalnız kabulden önceki düzenlemeyi söyler.
        aiProvenance: mapAiProvenanceDtosToVm(dto.aiProvenance)
    };
}
