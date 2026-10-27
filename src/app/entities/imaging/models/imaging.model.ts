/**
 * Görüntüleme kaydı sözleşmesi (`docs/IMAGING_API_CONTRACT.md` §4). Backend tek doğruluk kaynağıdır.
 */
import type { StoredFileDto, StoredFileVm } from '@/app/shared/files/stored-file.model';

export type ImagingModality = 'XRay' | 'Ultrasound' | 'CT' | 'MRI' | 'Endoscopy' | 'ClinicalPhoto' | 'Other';
export type ImagingRecordStatus = 'Active' | 'Cancelled';

export interface ImagingRecordListItemDto {
    id: string;
    clinicId: string;
    petId: string;
    petName: string;
    clientId: string;
    clientName: string;
    examinationId: string | null;
    performedAtUtc: string;
    modality: ImagingModality;
    description: string | null;
    status: ImagingRecordStatus;
    fileCount: number;
    addedAfterExaminationFinalization: boolean;
}

export interface ImagingRecordListItemDtoPagedResult {
    items: ImagingRecordListItemDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ImagingRecordDetailDto extends Omit<ImagingRecordListItemDto, 'fileCount'> {
    clinicalNote: string | null;
    createdAtUtc: string;
    createdByUserId: string;
    updatedAtUtc: string | null;
    cancelledAtUtc: string | null;
    cancelledByUserId: string | null;
    cancelReason: string | null;
    rowVersion: string;
    files: StoredFileDto[];
}

/** `POST /imaging-records` gövdesi (dosyalar ayrı çağrıyla yüklenir). */
export interface CreateImagingRecordRequest {
    clinicId: string;
    petId: string;
    examinationId: string | null;
    performedAtUtc: string;
    modality: ImagingModality;
    description: string | null;
    clinicalNote: string | null;
}

export type ImagingRecordListItemVm = ImagingRecordListItemDto;

export interface ImagingRecordDetailVm extends Omit<ImagingRecordDetailDto, 'files'> {
    files: StoredFileVm[];
}

/**
 * GET `/api/v1/imaging-records` sorgusu. `fromDate` / `toDate` (**yyyy-MM-dd**) istekte İstanbul günü başı / sonu UTC olarak
 * `dateFromUtc` / `dateToUtc` gider (görüntüleme zamanı). `status` boşsa yalnız etkin kayıtlar (backend varsayılanı).
 */
export interface ImagingRecordsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    petId?: string;
    examinationId?: string;
    modality?: ImagingModality;
    status?: ImagingRecordStatus;
    fromDate?: string;
    toDate?: string;
}

export interface ImagingRecordsPagedVm {
    items: ImagingRecordListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
