import type { PublicOwnerSignupRequestDto } from '@/app/features/public/models/public-owner-signup-api.model';
import type { PublicOwnerSignupFormValue } from '@/app/features/public/models/public-owner-signup-form.model';

/** Form -> `POST /public/owner-signup` gövdesi; seçim bayrağa yalnız burada çevrilir. */
export function mapPublicOwnerSignupFormToRequest(form: PublicOwnerSignupFormValue): PublicOwnerSignupRequestDto {
    const discountCode = form.discountCode.trim();

    return {
        planCode: form.planCode,
        tenantName: form.tenantName.trim(),
        clinicName: form.clinicName.trim(),
        clinicCity: form.clinicCity.trim(),
        email: form.email.trim(),
        password: form.password,
        acceptedLegalDocuments: form.acceptedLegalDocuments,
        // Kod sunucuda yeniden doğrulanır; anlık doğrulama yalnız bilgi amaçlıdır (geçersizse kayıt tek tip hatayla döner).
        ...(discountCode ? { discountCode } : {}),
        startWithExampleClinic: form.startMode === 'example'
    };
}
