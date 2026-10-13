import { HttpParams } from '@angular/common/http';
import type {
    CareInstructionCreateRequestDto,
    CareInstructionDto,
    CareInstructionPagedResultDto,
    CareInstructionUpdateRequestDto
} from '@/app/features/care-instructions/models/care-instruction-api.model';
import type {
    CareInstructionsListQuery,
    CareInstructionVm,
    CreateCareInstructionRequest
} from '@/app/features/care-instructions/models/care-instruction-vm.model';

export function mapCareInstructionDtoToVm(dto: CareInstructionDto): CareInstructionVm {
    return {
        id: dto.id,
        text: dto.text,
        createdAtUtc: dto.createdAtUtc,
        updatedAtUtc: dto.updatedAtUtc?.trim() || null,
        rowVersion: dto.rowVersion
    };
}

export function mapPagedCareInstructionsToVm(result: CareInstructionPagedResultDto): CareInstructionVm[] {
    return (result.items ?? []).map(mapCareInstructionDtoToVm);
}

export function careInstructionsQueryToHttpParams(query: CareInstructionsListQuery, clinicId: string | undefined): HttpParams {
    let p = new HttpParams()
        .set('Page', String(query.page ?? 1))
        .set('PageSize', String(query.pageSize ?? 50))
        .set('hospitalizationId', query.hospitalizationId);
    if (clinicId) {
        p = p.set('clinicId', clinicId);
    }
    return p;
}

export function mapCreateCareInstructionToApiBody(clinicId: string, req: CreateCareInstructionRequest): CareInstructionCreateRequestDto {
    return { clinicId, petId: req.petId, hospitalizationId: req.hospitalizationId, text: req.text.trim() };
}

export function mapUpdateCareInstructionToApiBody(text: string, rowVersion: string): CareInstructionUpdateRequestDto {
    return { text: text.trim(), rowVersion };
}
