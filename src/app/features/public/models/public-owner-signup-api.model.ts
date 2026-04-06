export interface PublicOwnerSignupRequestDto {
    planCode: string;
    tenantName: string;
    clinicName: string;
    clinicCity: string;
    email: string;
    password: string;
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
}
