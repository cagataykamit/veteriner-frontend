import {
    CHARGES_CREATE_CLAIM,
    EXAMINATIONS_CREATE_CLAIM,
    LAB_RESULTS_UPDATE_CLAIM,
    PAYMENTS_CREATE_CLAIM,
    VACCINATIONS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import type { LabResultListItemVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import type { PetDetailVm, PetHistoryAppointmentItemVm, PetHistoryLabResultItemVm } from '@/app/features/pets/models/pet-vm.model';
import { petGenderLabel } from '@/app/features/pets/utils/pet-status.utils';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { parseAppointmentStatusRawToEnum } from '@/app/features/appointments/utils/appointment-status.utils';
import { formatUtcIsoAsLocalDateDisplay, parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/**
 * Hasta kartı bölüm durumu (ADR-020): `null` = okuma izni yok (bölüm gösterilmez), `error` = veri alınamadı.
 * "Kayıt yok" `ok` + boş veriyle ifade edilir; üçü birbirine karışmaz.
 */
export type PetCardSection<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error' } | null;

/** Rol bazlı vurgu (ADR-020 karar 3): yeni ekran yok, yalnız sıralama. Muayene açabilen klinik bilgiyi, ücret/ödeme alan parayı öne alır. */
export type PetCardEmphasis = 'clinical' | 'frontDesk';

export function petCardEmphasis(hasClaim: (claim: string) => boolean): PetCardEmphasis {
    if (hasClaim(EXAMINATIONS_CREATE_CLAIM)) {
        return 'clinical';
    }
    return hasClaim(PAYMENTS_CREATE_CLAIM) || hasClaim(CHARGES_CREATE_CLAIM) ? 'frontDesk' : 'clinical';
}

/** Doğum tarihinden okunur yaş: 1 yaş ve üstü "n yaş", altı "n ay", bir aydan küçük "1 aydan küçük". Geçersiz/gelecek tarih → `null`. */
export function petAgeLabel(birthDate: string | null | undefined, now: Date = new Date()): string | null {
    const ymd = birthDate?.trim().slice(0, 10) ?? '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) {
        return null;
    }
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
    if (now.getDate() < d) {
        months -= 1;
    }
    if (months < 0 || new Date(y, mo - 1, d).getTime() > now.getTime()) {
        return null;
    }
    if (months >= 12) {
        return `${Math.floor(months / 12)} yaş`;
    }
    return months > 0 ? `${months} ay` : '1 aydan küçük';
}

/**
 * Başlıktaki kimlik satırı: tür, ırk, cinsiyet, yaş, kilo, çip; boş alan atlanır.
 * Kilo: muayeneden ölçülen son kilo, yoksa profildeki tarihsiz kilo.
 */
export function petIdentityParts(pet: PetDetailVm, measuredWeightKg: number | null, now: Date = new Date()): string[] {
    const filled = (v: string | null | undefined): v is string => !!v && !!v.trim() && v.trim() !== '—';
    const gender = petGenderLabel(pet.gender);
    const weight = measuredWeightKg !== null ? String(measuredWeightKg) : pet.weight;
    return [
        pet.speciesName,
        pet.breed,
        gender,
        petAgeLabel(pet.birthDate, now),
        filled(weight) ? `${weight} kg` : null,
        filled(pet.microchipNumber) ? `Çip ${pet.microchipNumber.trim()}` : null
    ].filter(filled);
}

/** Özet uçlarındaki (en yeni 10) randevulardan ileri tarihli en yakın `Planlandı` randevu (hasta geçmişi ve müşteri son özeti). */
export function nextScheduledAppointment<T extends Pick<PetHistoryAppointmentItemVm, 'scheduledAtUtc' | 'status'>>(rows: readonly T[], now: Date = new Date()): T | null {
    const at = (r: T) => parseUtcApiInstantIsoString(r.scheduledAtUtc)?.getTime() ?? NaN;
    return (
        rows
            .filter((r) => parseAppointmentStatusRawToEnum(r.status) === 0 && at(r) >= now.getTime())
            .sort((a, b) => at(a) - at(b))[0] ?? null
    );
}

/** Tedavide durum alanı yok: "aktif tedavi" = takip tarihi bugün veya ileride olan tedavi; en yakın takip önce. */
export function activeFollowUpTreatments(items: readonly TreatmentListItemVm[], now: Date = new Date()): TreatmentListItemVm[] {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const at = (t: TreatmentListItemVm) => parseUtcApiInstantIsoString(t.followUpDateUtc)?.getTime() ?? NaN;
    return items.filter((t) => at(t) >= startOfToday).sort((a, b) => at(a) - at(b));
}

/** Son muayenenin vital satırı (kilo ayrı gösterilir); hiç ölçüm yoksa `null`. Birimler muayene detayıyla aynı. */
export function examinationVitalsLine(e: Pick<ExaminationDetailVm, 'temperatureC' | 'heartRateBpm' | 'respiratoryRatePerMin'>): string | null {
    const parts = [
        e.temperatureC !== null ? `${e.temperatureC} °C` : null,
        e.heartRateBpm !== null ? `${e.heartRateBpm} atım/dk` : null,
        e.respiratoryRatePerMin !== null ? `${e.respiratoryRatePerMin} soluk/dk` : null
    ].filter((p): p is string => p !== null);
    return parts.length ? parts.join(' · ') : null;
}

/** Muayene eşleyicisi boş metni `—` yapar; kartta "yazılmamış" olarak gösterilsin diye `null`. */
export function examinationAssessmentText(e: Pick<ExaminationDetailVm, 'assessment'>): string | null {
    const t = e.assessment?.trim() ?? '';
    return t && t !== '—' ? t : null;
}

/** Yaklaşan aşı penceresi (gün): vadesi bu süre içinde olan planlı aşı "yaklaşan" sayılır. */
export const PET_TODO_UPCOMING_VACCINE_DAYS = 30;

export type PetTodoKind = 'overdueVaccine' | 'labInterpretation' | 'pendingLab' | 'upcomingVaccine' | 'pendingCharge' | 'openBalance';

export interface PetTodoAction {
    label: string;
    route: string[];
    queryParams?: Record<string, string>;
}

export interface PetTodoItem {
    key: string;
    kind: PetTodoKind;
    tone: 'danger' | 'warn' | 'info';
    icon: string;
    title: string;
    detail: string;
    action: PetTodoAction;
}

/** Yapılacaklar kaynakları; her biri kendi izni ve yükleme durumuyla. */
export interface PetTodoSources {
    scheduledVaccinations: PetCardSection<VaccinationListItemVm[]>;
    requestedLabs: PetCardSection<LabResultListItemVm[]>;
    /** Geçmiş özetinden: "yorum bekliyor" (sonuçlu lab) yalnız en yeni 10 lab içinden. */
    recentLabs: PetCardSection<PetHistoryLabResultItemVm[]>;
    pendingCharges: PetCardSection<ChargeSuggestionVm[]>;
    balance: PetCardSection<ClientBalanceVm>;
}

export interface PetTodoContext {
    petId: string;
    clientId: string | null;
    hasClaim: (claim: string) => boolean;
    /** Salt okunur kiracı: yazma eylemleri "Aç" bağlantısına düşer. */
    mutationBlocked: boolean;
    emphasis: PetCardEmphasis;
    now?: Date;
}

const KIND_ORDER: Record<PetCardEmphasis, readonly PetTodoKind[]> = {
    clinical: ['overdueVaccine', 'labInterpretation', 'pendingLab', 'upcomingVaccine', 'pendingCharge', 'openBalance'],
    frontDesk: ['openBalance', 'pendingCharge', 'overdueVaccine', 'upcomingVaccine', 'pendingLab', 'labInterpretation']
};

const SOURCE_LABELS: Record<keyof PetTodoSources, string> = {
    scheduledVaccinations: 'Aşı',
    requestedLabs: 'Lab',
    recentLabs: 'Lab yorumu',
    pendingCharges: 'Ücret bekleyen işlem',
    balance: 'Bakiye'
};

export interface PetTodoView {
    items: PetTodoItem[];
    loading: boolean;
    /** Yüklenemeyen kaynakların okunur adları. */
    failed: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function okData<T>(s: PetCardSection<T>): T | null {
    return s?.state === 'ok' ? s.data : null;
}

/**
 * Hasta bazlı "Yapılacaklar" (ADR-020 karar 2c): gecikmiş/yaklaşan aşı, bekleyen lab ve yorum, ücret bekleyen işlem, açık borç.
 * Hasta bazlı tek okuma ucu olmadığından mevcut uçların sonuçları burada birleşir (kural tek yer).
 * Her satırda tek eylem: yazma izni varsa işi yapan form, yoksa kaydın detayı.
 */
export function buildPetTodo(sources: PetTodoSources, ctx: PetTodoContext): PetTodoView {
    const now = (ctx.now ?? new Date()).getTime();
    const canWrite = (claim: string) => !ctx.mutationBlocked && ctx.hasClaim(claim);
    const items: PetTodoItem[] = [];

    const canApplyVaccine = canWrite(VACCINATIONS_UPDATE_CLAIM);
    for (const v of okData(sources.scheduledVaccinations) ?? []) {
        const due = parseUtcApiInstantIsoString(v.dueAtUtc)?.getTime();
        if (due === undefined) {
            continue;
        }
        const overdue = due < now;
        if (!overdue && due > now + PET_TODO_UPCOMING_VACCINE_DAYS * DAY_MS) {
            continue;
        }
        const lateDays = Math.floor((now - due) / DAY_MS);
        items.push({
            key: `vaccine-${v.id}`,
            kind: overdue ? 'overdueVaccine' : 'upcomingVaccine',
            tone: overdue ? 'danger' : 'info',
            icon: 'pi pi-shield',
            title: `${overdue ? 'Gecikmiş aşı' : 'Yaklaşan aşı'}: ${v.vaccineName}`,
            detail: `Vade ${formatUtcIsoAsLocalDateDisplay(v.dueAtUtc)}${overdue && lateDays > 0 ? ` · ${lateDays} gün geçti` : ''}`,
            action: canApplyVaccine ? { label: 'Uygula', route: ['/panel/vaccinations', v.id, 'edit'] } : { label: 'Aç', route: ['/panel/vaccinations', v.id] }
        });
    }

    const canEditLab = canWrite(LAB_RESULTS_UPDATE_CLAIM);
    for (const l of okData(sources.requestedLabs) ?? []) {
        items.push({
            key: `lab-${l.id}`,
            kind: 'pendingLab',
            tone: 'warn',
            icon: 'pi pi-chart-bar',
            title: `Lab sonucu bekleniyor: ${l.testName}`,
            detail: `İstendi ${formatUtcIsoAsLocalDateDisplay(l.requestedAtUtc)}`,
            action: canEditLab ? { label: 'Sonuç gir', route: ['/panel/lab-results', l.id, 'edit'] } : { label: 'Aç', route: ['/panel/lab-results', l.id] }
        });
    }
    for (const l of (okData(sources.recentLabs) ?? []).filter((x) => x.awaitingInterpretation && x.status === 'Resulted')) {
        items.push({
            key: `lab-${l.id}`,
            kind: 'labInterpretation',
            tone: 'warn',
            icon: 'pi pi-comment',
            title: `Lab yorumu bekliyor: ${l.testName}`,
            detail: `Sonuç ${formatUtcIsoAsLocalDateDisplay(l.resultDateUtc)}`,
            action: canEditLab ? { label: 'Yorum yaz', route: ['/panel/lab-results', l.id, 'edit'] } : { label: 'Aç', route: ['/panel/lab-results', l.id] }
        });
    }

    const charges = pendingChargesTodoItem(okData(sources.pendingCharges) ?? [], ctx.petId, canWrite(CHARGES_CREATE_CLAIM));
    if (charges) {
        items.push(charges);
    }

    const balance = openBalanceTodoItem(okData(sources.balance), { petId: ctx.petId, clientId: ctx.clientId, canTakePayment: canWrite(PAYMENTS_CREATE_CLAIM) });
    if (balance) {
        items.push(balance);
    }

    return todoView(items, ctx.emphasis, sources, SOURCE_LABELS);
}

/** Satırları rol vurgusuna göre sıralar; yüklenen ve alınamayan kaynakları okunur adlarıyla raporlar (hasta ve müşteri kartı ortak). */
export function todoView<K extends string>(
    items: readonly PetTodoItem[],
    emphasis: PetCardEmphasis,
    sources: Record<K, PetCardSection<unknown>>,
    labels: Record<K, string>
): PetTodoView {
    const order = KIND_ORDER[emphasis];
    const entries = Object.entries(sources) as [K, PetCardSection<unknown>][];
    return {
        items: [...items].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)),
        loading: entries.some(([, s]) => s?.state === 'loading'),
        failed: entries.filter(([, s]) => s?.state === 'error').map(([k]) => labels[k])
    };
}

/**
 * Bir hayvanın ücret bekleyen işlemleri tek satırda; eylem hayvana süzülmüş Ücretlendir sayfası (öneri ucu hayvan bazlı süzer).
 * `petName` verilirse (müşteri kartı) başlık hayvan adıyla başlar.
 */
export function pendingChargesTodoItem(charges: readonly ChargeSuggestionVm[], petId: string, canCharge: boolean, petName?: string): PetTodoItem | null {
    if (charges.length === 0) {
        return null;
    }
    const names = charges.slice(0, 3).map((c) => c.description);
    return {
        key: `pending-charges-${petId}`,
        kind: 'pendingCharge',
        tone: 'warn',
        icon: 'pi pi-receipt',
        title: `${petName ? `${petName}: ` : ''}${charges.length} işlem ücret bekliyor`,
        detail: names.join(', ') + (charges.length > names.length ? ` ve ${charges.length - names.length} işlem daha` : ''),
        action: { label: canCharge ? 'Ücretlendir' : 'Gör', route: ['/panel/charges/pending'], queryParams: { petId } }
    };
}

/**
 * Açık borç satırı; borç müşterinindir (ADR-012). Hasta kartında (`petId` dolu) bu hayvanın payı, müşteri kartında hayvan kırılımı yazılır.
 * Ödeme alma izni yoksa hasta kartı müşteri bakiyesine, müşteri kartı müşterinin ücret listesine gider.
 */
export function openBalanceTodoItem(balance: ClientBalanceVm | null, opts: { petId: string | null; clientId: string | null; canTakePayment: boolean }): PetTodoItem | null {
    if (!balance || balance.outstandingAmount <= 0) {
        return null;
    }
    const currency = balance.currency || 'TRY';
    let detail: string;
    if (opts.petId) {
        const petOutstanding = balance.openCharges.filter((c) => c.petId === opts.petId).reduce((sum, c) => sum + c.outstandingAmount, 0);
        detail = petOutstanding > 0 ? `Bu hayvan: ${formatMoney(petOutstanding, currency)} · sahibin toplam borcu` : 'Sahibin toplam borcu (diğer hayvanlar veya genel)';
    } else {
        detail = outstandingByPet(balance)
            .map((p) => `${p.petName?.trim() || 'Genel'} ${formatMoney(p.outstandingAmount, currency)}`)
            .join(' · ');
    }
    const fallback: PetTodoAction = opts.petId
        ? { label: 'Bakiyeyi gör', route: ['/panel/clients', balance.clientId] }
        : { label: 'Ücretleri gör', route: ['/panel/charges'], queryParams: { clientId: balance.clientId } };
    return {
        key: 'open-balance',
        kind: 'openBalance',
        tone: 'danger',
        icon: 'pi pi-wallet',
        title: `Açık borç: ${formatMoney(balance.outstandingAmount, currency)}`,
        detail,
        action: opts.canTakePayment && opts.clientId ? { label: 'Ödeme al', route: ['/panel/payments/new'], queryParams: { clientId: opts.clientId } } : fallback
    };
}

/** Açık ücretlerin hayvan bazında kalan toplamı, büyükten küçüğe; hayvansız (genel) ücretler `petId: null` altında toplanır. */
export function outstandingByPet(balance: ClientBalanceVm): { petId: string | null; petName: string | null; outstandingAmount: number }[] {
    const byPet = new Map<string | null, { petId: string | null; petName: string | null; outstandingAmount: number }>();
    for (const c of balance.openCharges) {
        const row = byPet.get(c.petId) ?? { petId: c.petId, petName: c.petName, outstandingAmount: 0 };
        row.outstandingAmount += c.outstandingAmount;
        byPet.set(c.petId, row);
    }
    return [...byPet.values()].sort((a, b) => b.outstandingAmount - a.outstandingAmount);
}
