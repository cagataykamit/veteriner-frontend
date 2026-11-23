import { HttpParams } from '@angular/common/http';
import type {
    DeletedClientDto,
    DeletedPetDto,
    DeletedRecordRowVm,
    DeletedRecordsPageDto,
    DeletedRecordsPagedVm,
    DeletedRecordsQuery
} from '@/app/entities/record-deletion/models/record-deletion.model';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

const trimmed = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

export function deletedRecordsQueryToHttpParams(q: DeletedRecordsQuery): HttpParams {
    const params = new HttpParams().set('page', String(q.page)).set('pageSize', String(q.pageSize));
    const search = q.search?.trim();

    return search ? params.set('search', search) : params;
}

export function mapDeletedClientDtoToRow(dto: DeletedClientDto): DeletedRecordRowVm {
    const phone = trimmed(dto.phone);

    return {
        kind: 'client',
        id: dto.id,
        title: trimmed(dto.fullName) ?? '—',
        detail: phone ? formatClientPhoneForDisplay(phone) : trimmed(dto.email),
        clientId: null,
        clientName: null,
        clientDeleted: false,
        deletedWithClient: false,
        deletedAtUtc: dto.deletedAtUtc,
        deletedByUserName: trimmed(dto.deletedByUserName)
    };
}

export function mapDeletedPetDtoToRow(dto: DeletedPetDto): DeletedRecordRowVm {
    return {
        kind: 'pet',
        id: dto.id,
        title: trimmed(dto.name) ?? '—',
        detail: trimmed(dto.speciesName),
        clientId: trimmed(dto.clientId),
        clientName: trimmed(dto.clientFullName),
        clientDeleted: dto.clientIsDeleted === true,
        deletedWithClient: dto.deletedWithClient === true,
        deletedAtUtc: dto.deletedAtUtc,
        deletedByUserName: trimmed(dto.deletedByUserName)
    };
}

export function mapDeletedRecordsPage<T>(dto: DeletedRecordsPageDto<T>, mapRow: (row: T) => DeletedRecordRowVm): DeletedRecordsPagedVm {
    return {
        items: (dto.items ?? []).map(mapRow),
        page: dto.page,
        pageSize: dto.pageSize,
        totalItems: dto.totalItems,
        totalPages: dto.totalPages
    };
}
