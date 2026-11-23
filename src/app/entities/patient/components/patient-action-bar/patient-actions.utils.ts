import {
    APPOINTMENTS_CREATE_CLAIM,
    CHARGES_CREATE_CLAIM,
    EXAMINATIONS_CREATE_CLAIM,
    HOSPITALIZATIONS_CREATE_CLAIM,
    IMAGING_CREATE_CLAIM,
    LAB_RESULTS_CREATE_CLAIM,
    PAYMENTS_CREATE_CLAIM,
    PETS_CREATE_CLAIM,
    VACCINATIONS_CREATE_CLAIM,
    VISITS_CREATE_CLAIM,
    VISITS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { TODAY_ROUTE } from '@/app/core/routing/panel-navigation';
import type { PetCardEmphasis } from '@/app/entities/patient/utils/pet-card.utils';

export type PatientActionKey =
    | 'arrive'
    | 'openToday'
    | 'examination'
    | 'takeIn'
    | 'appointment'
    | 'vaccination'
    | 'labResult'
    | 'imaging'
    | 'hospitalization'
    | 'charge'
    | 'payment'
    | 'newPet';

export interface PatientAction {
    key: PatientActionKey;
    label: string;
    icon: string;
    /** `null`: rota değil; bileşen yürütür (Geldi diyaloğu, Muayeneye al). */
    route: string | null;
    queryParams: Record<string, string>;
}

export interface PatientActionContext {
    clientId: string;
    /** Müşteri sayfasında `null`. */
    petId: string | null;
    /** Vefat eden hayvanda yeni bakım (geliş, muayene, randevu) açılmaz; sunucu da 409 `Pets.Deceased` döner. */
    petDeceased?: boolean;
    /** Hastanın açık gelişi (klinikte: bekliyor ya da muayenede); Geldi yerine Bugün'de aç, Muayene başlat yerine Muayeneye al (M-02). */
    openVisit?: PatientOpenVisit | null;
}

export interface PatientOpenVisit {
    visitId: string;
    /** Bekliyorsa Muayeneye al önce bakımı başlatır. */
    waiting: boolean;
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
    { key: 'imaging', label: 'Görüntüleme', icon: 'pi pi-image', route: '/panel/imaging/new', claim: IMAGING_CREATE_CLAIM, carriesPet: true },
    { key: 'hospitalization', label: 'Yatış', icon: 'pi pi-building', route: '/panel/hospitalizations/new', claim: HOSPITALIZATIONS_CREATE_CLAIM, carriesPet: true },
    { key: 'newPet', label: 'Yeni hasta', icon: 'pi pi-plus', route: '/panel/pets/new', claim: PETS_CREATE_CLAIM, carriesPet: false },
    { key: 'charge', label: 'Ücret ekle', icon: 'pi pi-receipt', route: '/panel/charges/new', claim: CHARGES_CREATE_CLAIM, carriesPet: true },
    { key: 'payment', label: 'Ödeme al', icon: 'pi pi-wallet', route: '/panel/payments/new', claim: PAYMENTS_CREATE_CLAIM, carriesPet: false }
];

/** Müşteri kartında (ADR-020 karar 6) geliş, randevu, hayvan ekleme, ücret ve ödeme; klinik eylemler hayvana özgüdür. */
const CLIENT_PAGE_KEYS: ReadonlySet<PatientActionKey> = new Set(['arrive', 'appointment', 'newPet', 'charge', 'payment']);

/** Yeni bakım kaydı açan eylemler (`Pet.EnsureCanStartCare`): vefat eden hayvanda gösterilmez. Aşı, lab, yatış, ücret ve ödeme açık kalır (K5). */
const CARE_START_KEYS: ReadonlySet<PatientActionKey> = new Set(['arrive', 'examination', 'appointment']);

/** Hasta klinikteyken (açık geliş) Geldi ve Muayene başlat yerine gelen eylemler (M-02). Muayeneye al rota değildir: bekleyen gelişte önce bakım başlar. */
const OPEN_VISIT_REPLACEMENTS: Partial<Record<PatientActionKey, PatientActionDefinition>> = {
    arrive: { key: 'openToday', label: "Bugün'de aç", icon: 'pi pi-calendar', route: TODAY_ROUTE, claim: VISITS_READ_CLAIM, carriesPet: false },
    examination: { key: 'takeIn', label: 'Muayeneye al', icon: 'pi pi-heart', route: null, claim: EXAMINATIONS_CREATE_CLAIM, carriesPet: true }
};

/** Yetkisi olmayan eylem listede yer almaz (UX ilkesi 11); her eylem müşteri ve (varsa) hayvan bağlamını sorgu parametresiyle taşır. */
export function buildPatientActions(ctx: PatientActionContext, hasClaim: (claim: string) => boolean): PatientAction[] {
    const visible = (a: PatientActionDefinition) =>
        hasClaim(a.claim) && (ctx.petId ? a.key !== 'newPet' : CLIENT_PAGE_KEYS.has(a.key)) && !(ctx.petDeceased && CARE_START_KEYS.has(a.key));
    const openVisit = ctx.petId ? (ctx.openVisit ?? null) : null;

    return ACTIONS.filter(visible)
        .map((a) => (openVisit ? (OPEN_VISIT_REPLACEMENTS[a.key] ?? a) : a))
        .filter((a) => hasClaim(a.claim))
        .map(({ key, label, icon, route, carriesPet }): PatientAction => ({
            key,
            label,
            icon,
            route,
            queryParams: key === 'openToday' ? {} : ctx.petId && carriesPet ? { clientId: ctx.clientId, petId: ctx.petId, ...(key === 'takeIn' ? { visitId: openVisit!.visitId } : {}) } : { clientId: ctx.clientId }
        }));
}

export type PatientActionGroupKey = 'visit' | 'clinic' | 'money';

/** Hasta kartı şeridinin bir grubu (M-02 B): rolün grubu açık düğmelerle, diğerleri grup adlı menüyle. */
export interface PatientActionGroup {
    key: PatientActionGroupKey;
    label: string;
    open: boolean;
    actions: PatientAction[];
}

const GROUPS: readonly { key: PatientActionGroupKey; label: string; keys: readonly PatientActionKey[] }[] = [
    { key: 'visit', label: 'Geliş ve randevu', keys: ['arrive', 'openToday', 'appointment'] },
    { key: 'clinic', label: 'Klinik', keys: ['examination', 'takeIn', 'vaccination', 'labResult', 'imaging', 'hospitalization'] },
    { key: 'money', label: 'Para', keys: ['charge', 'payment'] }
];

/**
 * Rol grubu: rol hasta kartı vurgusundan (`petCardEmphasis`, tek kural) gelir. Hekim (muayene açabilen) için Klinik açık; ön büro
 * (ücret ya da ödeme alan, muayene açamayan) için Geliş ve randevu ile Para açık. Açık gruplar önce, sıra rolün iş sırası.
 */
const ROLE_GROUP_ORDER: Record<PetCardEmphasis, { open: readonly PatientActionGroupKey[]; order: readonly PatientActionGroupKey[] }> = {
    clinical: { open: ['clinic'], order: ['clinic', 'visit', 'money'] },
    frontDesk: { open: ['visit', 'money'], order: ['visit', 'money', 'clinic'] }
};

/** Birincil olabilecek eylemler: rolün ilk işi (ön büroda geliş, hekimde muayene). Yoksa birincil düğme olmaz. */
const PRIMARY_KEYS: Record<PetCardEmphasis, readonly PatientActionKey[]> = {
    clinical: ['examination', 'takeIn'],
    frontDesk: ['arrive', 'openToday']
};

export function groupPatientActions(actions: readonly PatientAction[], emphasis: PetCardEmphasis): PatientActionGroup[] {
    const role = ROLE_GROUP_ORDER[emphasis];

    return role.order
        .map((key) => GROUPS.find((g) => g.key === key)!)
        .map((g) => ({ key: g.key, label: g.label, open: role.open.includes(g.key), actions: actions.filter((a) => g.keys.includes(a.key)) }))
        .filter((g) => g.actions.length > 0);
}

export function primaryPatientActionKey(actions: readonly PatientAction[], emphasis: PetCardEmphasis): PatientActionKey | null {
    return actions.find((a) => PRIMARY_KEYS[emphasis].includes(a.key))?.key ?? null;
}
