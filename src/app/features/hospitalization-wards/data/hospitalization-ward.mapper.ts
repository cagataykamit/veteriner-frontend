import type {
    HospitalizationLocationWriteRequestDto,
    HospitalizationRoomDto,
    HospitalizationWardDto
} from '@/app/features/hospitalization-wards/models/hospitalization-ward-api.model';
import type {
    HospitalizationLocationFormValue,
    HospitalizationRoomVm,
    HospitalizationWardVm
} from '@/app/features/hospitalization-wards/models/hospitalization-ward-vm.model';

function trimmed(v: string | null | undefined): string {
    return typeof v === 'string' ? v.trim() : '';
}

function sortOrderOf(v: number | null | undefined): number {
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function mapHospitalizationRoomDtoToVm(dto: HospitalizationRoomDto, wardId: string): HospitalizationRoomVm {
    return {
        id: dto.id,
        wardId: trimmed(dto.wardId) || wardId,
        name: trimmed(dto.name),
        sortOrder: sortOrderOf(dto.sortOrder),
        // Alan gelmezse aktif sayılır: eski/pasif kaydı yanlışlıkla gizlemek yerine seçilebilir bırakmak sunucu denetimine düşer.
        isActive: dto.isActive !== false
    };
}

export function mapHospitalizationWardDtoToVm(dto: HospitalizationWardDto): HospitalizationWardVm {
    return {
        id: dto.id,
        clinicId: trimmed(dto.clinicId),
        name: trimmed(dto.name),
        sortOrder: sortOrderOf(dto.sortOrder),
        isActive: dto.isActive !== false,
        rooms: (dto.rooms ?? []).filter((r) => trimmed(r?.id)).map((r) => mapHospitalizationRoomDtoToVm(r, dto.id))
    };
}

/** GET listesi; sunucu sırası korunur, kimliksiz öğe atlanır. */
export function mapHospitalizationWardsDtoToVm(raw: HospitalizationWardDto[] | null | undefined): HospitalizationWardVm[] {
    return Array.isArray(raw) ? raw.filter((w) => trimmed(w?.id)).map(mapHospitalizationWardDtoToVm) : [];
}

/** Bölüm ve oda POST/PUT gövdesi; ad kırpılır, boş sıra 0 olur. */
export function mapHospitalizationLocationFormToApiBody(value: HospitalizationLocationFormValue): HospitalizationLocationWriteRequestDto {
    const name = value.name.trim();

    if (!name) {
        throw new Error('HOSPITALIZATION_LOCATION_NAME_REQUIRED');
    }

    return { name, sortOrder: sortOrderOf(value.sortOrder) };
}
