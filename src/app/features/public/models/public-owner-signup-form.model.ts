import type { LegalDocumentVersionDto } from '@/app/features/legal-acceptance/models/legal-acceptance.model';
import type { PricingPlanApiCode } from '@/app/entities/subscription/utils/pricing-plan.utils';

/** "Nasıl başlayalım?" seçimi (ADR-002): örnek klinik önerilen ve varsayılan. */
export type OnboardingStartMode = 'example' | 'empty';

export const DEFAULT_ONBOARDING_START_MODE: OnboardingStartMode = 'example';

/** Kayıt formunun kırpılmış, doğrulanmış değeri; API gövdesi mapper'da kurulur. */
export interface PublicOwnerSignupFormValue {
    readonly planCode: PricingPlanApiCode;
    readonly tenantName: string;
    readonly clinicName: string;
    readonly clinicCity: string;
    readonly email: string;
    readonly password: string;
    readonly acceptedLegalDocuments: LegalDocumentVersionDto[];
    /** Boş ise gönderilmez. */
    readonly discountCode: string;
    readonly startMode: OnboardingStartMode;
}
