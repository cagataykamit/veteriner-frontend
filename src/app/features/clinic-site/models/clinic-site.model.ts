/** Klinik web sitesi yönetim uçlarının şekilleri (Veteriner `docs/CLINIC_SITE_API_CONTRACT.md` §2). */
export interface ClinicSiteStateDto {
    readonly siteId: string;
    readonly clinicId: string;
    readonly slug: string;
    readonly publicPath: string;
    readonly isTemporarilyClosed: boolean;
    readonly publishedVersionNumber: number | null;
    readonly publishedAtUtc: string | null;
    readonly hasUnpublishedChanges: boolean;
    readonly draftUpdatedAtUtc: string;
    readonly rowVersion: string;
}

export interface ClinicSiteImageDto {
    readonly id: string;
    readonly reference: string;
    readonly contentType: string;
    readonly sizeBytes: number;
    readonly createdAtUtc: string;
}

export type ClinicSiteMissing = 'name' | 'phone' | 'address' | 'workingHours';

export interface ClinicSiteDetailDto {
    readonly exists: boolean;
    readonly suggestedSlug: string | null;
    readonly site: ClinicSiteStateDto | null;
    readonly draft: unknown;
    readonly isClosedBySubscription: boolean;
    readonly missingForPublish: readonly ClinicSiteMissing[];
    readonly missingImageIds: readonly string[];
    readonly images: readonly ClinicSiteImageDto[];
}

export interface ClinicSiteVersionDto {
    readonly versionNumber: number;
    readonly isPublished: boolean;
    readonly publishedAtUtc: string;
    readonly publishedByUserId: string | null;
    readonly publishedByName: string | null;
}

export type ClinicSiteAddressReason = 'Invalid' | 'Reserved' | 'Taken';

export interface ClinicSiteAddressAvailabilityDto {
    readonly slug: string;
    readonly isAvailable: boolean;
    readonly reason: ClinicSiteAddressReason | null;
}

export const CLINIC_SITE_MISSING_LABELS: Readonly<Record<ClinicSiteMissing, string>> = {
    name: 'Klinik adı',
    phone: 'Telefon',
    address: 'Adres',
    workingHours: 'En az bir çalışma saati'
};
