import type { ExampleClinicLoadSummaryDto } from '@/app/features/example-clinic/models/example-clinic-api.model';
import type { LegalDocumentVersionDto } from '@/app/features/legal-acceptance/models/legal-acceptance.model';

export interface PublicOwnerSignupRequestDto {
    planCode: string;
    tenantName: string;
    clinicName: string;
    clinicCity: string;
    email: string;
    password: string;
    /** Onay kutusuyla kabul edilen belgeler ve gösterilen sürümler; sunucu güncel sürümü doğrular (ADR-029). */
    acceptedLegalDocuments: LegalDocumentVersionDto[];
    /** İsteğe bağlı satış ortağı kodu (ADR-037); sunucu yeniden doğrular, geçersizse kayıt yapılmaz. */
    discountCode?: string;
    /** Örnek Veteriner Kliniğini kayıtla aynı işlemde yükle (ADR-002); eksikse sunucu `false` sayar. */
    startWithExampleClinic: boolean;
}

/** Kayıtta kullanılan ortak kodu özeti; ortak bilgisi içermez. */
export interface SignupDiscountDto {
    code: string;
    discountPercent: number;
    discountMonths: number;
}

export interface PublicOwnerSignupResultDto {
    tenantId: string;
    clinicId: string;
    userId: string;
    planCode: string;
    trialStartsAtUtc: string;
    trialEndsAtUtc: string;
    canLogin: boolean;
    nextStep: string;
    discount?: SignupDiscountDto | null;
    /** Yüklenen örnek içerik özeti; `null`/eksik = boş klinik (`EXAMPLE_CLINIC_API_CONTRACT.md` §3). */
    exampleClinic?: ExampleClinicLoadSummaryDto | null;
}
