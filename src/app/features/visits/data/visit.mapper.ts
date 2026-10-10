import { HttpParams } from '@angular/common/http';
import type {
    CorrectVisitRequestDto,
    CreateVisitRequestDto,
    RestoreVisitRequestDto,
    UpdateVisitUrgencyRequestDto,
    TodayDto,
    TodayItemDto,
    VeterinarianDto,
    VisitCreateResultDto,
    VisitDto
} from '@/app/features/visits/models/visit-api.model';
import type {
    CorrectVisitRequest,
    CreateVisitRequest,
    TodayItemVm,
    TodayQuery,
    TodayVm,
    VeterinarianVm,
    VisitCreateResultVm,
    VisitVm
} from '@/app/features/visits/models/visit-vm.model';

const EM = '—';

function trimmedOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

export function mapVisitDtoToVm(dto: VisitDto): VisitVm {
    return {
        id: dto.id,
        clinicId: dto.clinicId,
        petId: dto.petId,
        appointmentId: trimmedOrNull(dto.appointmentId),
        responsibleVeterinarianUserId: trimmedOrNull(dto.responsibleVeterinarianUserId),
        responsibleVeterinarianName: trimmedOrNull(dto.responsibleVeterinarianName),
        arrivedAtUtc: dto.arrivedAtUtc,
        careStatus: dto.careStatus,
        isVoided: dto.isVoided,
        isUrgent: dto.isUrgent === true
    };
}

export function mapVisitCreateResultDtoToVm(dto: VisitCreateResultDto): VisitCreateResultVm {
    return { created: dto.created, visit: mapVisitDtoToVm(dto.visit) };
}

export function mapTodayItemDtoToVm(dto: TodayItemDto): TodayItemVm {
    const visitId = trimmedOrNull(dto.visitId);
    const appointmentId = trimmedOrNull(dto.appointmentId);
    return {
        key: visitId ?? appointmentId ?? dto.petId,
        visitId,
        appointmentId,
        petId: dto.petId,
        petName: trimmedOrNull(dto.petName) ?? EM,
        speciesName: trimmedOrNull(dto.speciesName) ?? EM,
        clientId: dto.clientId,
        clientName: trimmedOrNull(dto.clientName) ?? EM,
        clientPhone: trimmedOrNull(dto.clientPhone),
        scheduledAtUtc: trimmedOrNull(dto.scheduledAtUtc),
        arrivedAtUtc: trimmedOrNull(dto.arrivedAtUtc),
        careStatus: dto.careStatus ?? null,
        appointmentStatus: dto.appointmentStatus ?? null,
        responsibleVeterinarianName: trimmedOrNull(dto.responsibleVeterinarianName),
        isCarriedOver: dto.isCarriedOver,
        paymentIndicator: dto.paymentIndicator ?? 'NoPaymentRecorded',
        hasActiveHospitalization: dto.hasActiveHospitalization === true,
        isVoided: dto.isVoided === true,
        voidReason: trimmedOrNull(dto.voidReason),
        isUrgent: dto.isUrgent === true
    };
}

export function mapTodayDtoToVm(dto: TodayDto): TodayVm {
    return { date: dto.date, items: (dto.items ?? []).map(mapTodayItemDtoToVm) };
}

export function mapVeterinarianDtoToVm(dto: VeterinarianDto): VeterinarianVm {
    return { userId: dto.userId, name: trimmedOrNull(dto.name) ?? EM };
}

/** Klinik bağlamı (JWT) yoksa `clinicId` zorunludur; varsa da açıkça gönderilir. */
export function todayQueryToHttpParams(clinicId: string | null, query: TodayQuery = {}): HttpParams {
    let params = new HttpParams();
    if (clinicId) {
        params = params.set('clinicId', clinicId);
    }
    if (query.voided) {
        params = params.set('voided', true);
    }
    return query.responsibleVeterinarianUserId ? params.set('responsibleVeterinarianUserId', query.responsibleVeterinarianUserId) : params;
}

/** Boş alanlar gövdeye girmez; hekim seçilmediyse `responsibleVeterinarianUserId` hiç gönderilmez. */
export function mapCreateVisitToApiBody(req: CreateVisitRequest): CreateVisitRequestDto {
    const body: CreateVisitRequestDto = {};
    const appointmentId = trimmedOrNull(req.appointmentId);
    const petId = trimmedOrNull(req.petId);
    const clinicId = trimmedOrNull(req.clinicId);
    const vet = trimmedOrNull(req.responsibleVeterinarianUserId);
    if (appointmentId) {
        body.appointmentId = appointmentId;
    }
    if (petId) {
        body.petId = petId;
    }
    if (clinicId) {
        body.clinicId = clinicId;
    }
    if (vet) {
        body.responsibleVeterinarianUserId = vet;
    }
    if (req.isUrgent) {
        body.isUrgent = true;
    }
    return body;
}

/** Sözleşme: `targetCareStatus` ve `markAsMistaken` tam olarak biri verilir. */
export function mapCorrectVisitToApiBody(req: CorrectVisitRequest): CorrectVisitRequestDto {
    return {
        reason: req.reason.trim(),
        targetCareStatus: req.action === 'Mistaken' ? null : req.action,
        markAsMistaken: req.action === 'Mistaken'
    };
}

export function mapRestoreVisitToApiBody(reason: string): RestoreVisitRequestDto {
    return { reason: reason.trim() };
}

export function mapUrgencyToApiBody(isUrgent: boolean): UpdateVisitUrgencyRequestDto {
    return { isUrgent };
}
