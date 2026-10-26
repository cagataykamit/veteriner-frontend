/** `POST /api/v1/public/demo-requests` (TRIAL-005, `docs/TRIAL_DEMO_REQUEST_API_CONTRACT.md` §2). */
export type DemoClinicSize = 'SingleVet' | 'SmallTeam' | 'MultiBranch';

export interface PublicDemoRequestDto {
    contactName: string;
    clinicName: string;
    city: string | null;
    email: string;
    phone: string | null;
    clinicSize: DemoClinicSize;
    currentSoftware: string | null;
    message: string | null;
    privacyNoticeAccepted: boolean;
    /** Tuzak alan (honeypot); insan doldurmaz. */
    website: string | null;
}

export interface PublicDemoRequestForm {
    contactName: string;
    clinicName: string;
    city: string;
    email: string;
    phone: string;
    clinicSize: DemoClinicSize | null;
    currentSoftware: string;
    message: string;
    privacyNoticeAccepted: boolean;
    website: string;
}

export type PublicDemoRequestField = Exclude<keyof PublicDemoRequestForm, 'website'>;

/** Sözleşme §2 uzunlukları (kırpılmış değer). */
export const DEMO_REQUEST_LIMITS = {
    minName: 2,
    contactName: 100,
    clinicName: 200,
    city: 100,
    email: 200,
    phone: 30,
    currentSoftware: 200,
    message: 2000
} as const;

export const DEMO_CLINIC_SIZE_OPTIONS: readonly { value: DemoClinicSize; label: string }[] = [
    { value: 'SingleVet', label: 'Tek hekim' },
    { value: 'SmallTeam', label: '2–5 hekim' },
    { value: 'MultiBranch', label: '6+ hekim ya da birden fazla şube' }
];

export function emptyPublicDemoRequestForm(): PublicDemoRequestForm {
    return {
        contactName: '',
        clinicName: '',
        city: '',
        email: '',
        phone: '',
        clinicSize: null,
        currentSoftware: '',
        message: '',
        privacyNoticeAccepted: false,
        website: ''
    };
}
