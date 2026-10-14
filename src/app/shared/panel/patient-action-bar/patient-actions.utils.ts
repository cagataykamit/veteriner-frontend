import {
    APPOINTMENTS_CREATE_CLAIM,
    CHARGES_CREATE_CLAIM,
    EXAMINATIONS_CREATE_CLAIM,
    HOSPITALIZATIONS_CREATE_CLAIM,
    LAB_RESULTS_CREATE_CLAIM,
    PAYMENTS_CREATE_CLAIM,
    PETS_CREATE_CLAIM,
    VACCINATIONS_CREATE_CLAIM,
    VISITS_CREATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';

export type PatientActionKey =
    | 'arrive'
    | 'examination'
    | 'appointment'
    | 'vaccination'
    | 'labResult'
    | 'hospitalization'
    | 'charge'
    | 'payment'
    | 'newPet';

export interface PatientAction {
    key: PatientActionKey;
    label: string;
    icon: string;
    /** `null`: rota değil, hasta detayında diyalog açar (Geldi). */
    route: string | null;
    queryParams: Record<string, string>;
}

export interface PatientActionContext {
    clientId: string;
    /** Müşteri sayfasında `null`. */
    petId: string | null;
}

interface PatientActionDefinition extends Omit<PatientAction, 'queryParams'> {
    claim: string;
    /** Hayvan kimliği de taşınır (ödeme müşteri bazlıdır). */
    carriesPet: boolean;
}

/** Sıra = ekrandaki sıra; ilk eylem birincil. */
const ACTIONS: readonly PatientActionDefinition[] = [
    { key: 'arrive', label: 'Geldi', icon: 'pi pi-sign-in', route: null, claim: VISITS_CREATE_CLAIM, carriesPet: true },
    { key: 'examination', label: 'Muayene başlat', icon: 'pi pi-heart', route: '/panel/examinations/new', claim: EXAMINATIONS_CREATE_CLAIM, carriesPet: true },
    { key: 'appointment', label: 'Randevu al', icon: 'pi pi-calendar-plus', route: '/panel/appointments/new', claim: APPOINTMENTS_CREATE_CLAIM, carriesPet: true },
    { key: 'vaccination', label: 'Aşı', icon: 'pi pi-shield', route: '/panel/vaccinations/new', claim: VACCINATIONS_CREATE_CLAIM, carriesPet: true },
    { key: 'labResult', label: 'Lab', icon: 'pi pi-chart-bar', route: '/panel/lab-results/new', claim: LAB_RESULTS_CREATE_CLAIM, carriesPet: true },
    { key: 'hospitalization', label: 'Yatış', icon: 'pi pi-building', route: '/panel/hospitalizations/new', claim: HOSPITALIZATIONS_CREATE_CLAIM, carriesPet: true },
    { key: 'newPet', label: 'Yeni hayvan', icon: 'pi pi-plus', route: '/panel/pets/new', claim: PETS_CREATE_CLAIM, carriesPet: false },
    { key: 'charge', label: 'Ücret ekle', icon: 'pi pi-receipt', route: '/panel/charges/new', claim: CHARGES_CREATE_CLAIM, carriesPet: true },
    { key: 'payment', label: 'Ödeme al', icon: 'pi pi-wallet', route: '/panel/payments/new', claim: PAYMENTS_CREATE_CLAIM, carriesPet: false }
];

/** Müşteri kartında (ADR-020 karar 6) geliş, randevu, hayvan ekleme, ücret ve ödeme; klinik eylemler hayvana özgüdür. */
const CLIENT_PAGE_KEYS: ReadonlySet<PatientActionKey> = new Set(['arrive', 'appointment', 'newPet', 'charge', 'payment']);

/** Yetkisi olmayan eylem listede yer almaz (UX ilkesi 11); her eylem müşteri ve (varsa) hayvan bağlamını sorgu parametresiyle taşır. */
export function buildPatientActions(ctx: PatientActionContext, hasClaim: (claim: string) => boolean): PatientAction[] {
    return ACTIONS.filter((a) => hasClaim(a.claim) && (ctx.petId ? a.key !== 'newPet' : CLIENT_PAGE_KEYS.has(a.key))).map(({ key, label, icon, route, carriesPet }): PatientAction => ({
        key,
        label,
        icon,
        route,
        queryParams: ctx.petId && carriesPet ? { clientId: ctx.clientId, petId: ctx.petId } : { clientId: ctx.clientId }
    }));
}
