/** GET /pets/{id}/timeline — `docs/PET_TIMELINE_API_CONTRACT.md` §2. */
export interface PetTimelineLinkRefDto {
    type?: string | null;
    id?: string | null;
}

export interface PetTimelineItemDto {
    type?: string | null;
    sourceId?: string | null;
    eventAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    title?: string | null;
    summary?: string | null;
    status?: string | null;
    isVoided?: boolean | null;
    linkRef?: PetTimelineLinkRefDto | null;
    relatedExaminationId?: string | null;
    relatedVisitId?: string | null;
    relatedAppointmentId?: string | null;
    updatedAtUtc?: string | null;
}

export interface PetTimelinePageDto {
    items?: PetTimelineItemDto[] | null;
    nextCursor?: string | null;
    omittedTypes?: string[] | null;
}
