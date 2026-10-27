import {
    CHARGES_CREATE_CLAIM,
    EXAMINATIONS_CREATE_CLAIM,
    LAB_RESULTS_UPDATE_CLAIM,
    PAYMENTS_CREATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import type { PetOpenItemsVm, PetOpenVaccinationVm } from '@/app/features/pets/models/pet-open-items-vm.model';
import type { PetSummarySectionVm } from '@/app/features/pets/models/pet-summary-vm.model';
import type { PetDetailVm, PetHistoryAppointmentItemVm } from '@/app/features/pets/models/pet-vm.model';
import { petGenderLabel } from '@/app/features/pets/utils/pet-status.utils';
import { parseAppointmentStatusRawToEnum } from '@/app/entities/appointment/utils/appointment-status.utils';
import { upcomingScheduledAppointmentsLinkQuery } from '@/app/entities/appointment/utils/appointments-list-link.utils';
import { canOpenVaccinationEdit } from '@/app/features/vaccinations/utils/vaccination-access.utils';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalDateTimeDisplay, parseUtcApiInstantIsoString, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
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

/** İleri tarihli `Planlandı` (açık) randevular, en yakın önce. */
export function upcomingScheduledAppointments<T extends Pick<PetHistoryAppointmentItemVm, 'scheduledAtUtc' | 'status'>>(rows: readonly T[], now: Date = new Date()): T[] {
    const at = (r: T) => parseUtcApiInstantIsoString(r.scheduledAtUtc)?.getTime() ?? NaN;

    return rows.filter((r) => parseAppointmentStatusRawToEnum(r.status) === 0 && at(r) >= now.getTime()).sort((a, b) => at(a) - at(b));
}

/** Müşteri son özetindeki (en yeni 10) randevulardan ileri tarihli en yakın `Planlandı` randevu (hasta kartı sonraki randevuyu açık işler ucundan okur). */
export function nextScheduledAppointment<T extends Pick<PetHistoryAppointmentItemVm, 'scheduledAtUtc' | 'status'>>(rows: readonly T[], now: Date = new Date()): T | null {
    return upcomingScheduledAppointments(rows, now)[0] ?? null;
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

export type PetTodoKind = 'deceasedAppointment' | 'overdueVaccine' | 'labInterpretation' | 'pendingLab' | 'upcomingVaccine' | 'pendingCharge' | 'openBalance';

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
    clinical: ['deceasedAppointment', 'overdueVaccine', 'labInterpretation', 'pendingLab', 'upcomingVaccine', 'pendingCharge', 'openBalance'],
    frontDesk: ['deceasedAppointment', 'openBalance', 'pendingCharge', 'overdueVaccine', 'upcomingVaccine', 'pendingLab', 'labInterpretation']
};

/** Yapılacaklar'ı besleyen açık işler bölümleri (sonraki randevu başlıkta gösterilir; Yapılacaklar'da yalnız vefat eden hastada bilgi satırıdır). */
type PetTodoSectionKey = 'vaccinations' | 'labResults' | 'pendingCharges' | 'outstanding';

const SOURCE_LABELS: Record<PetTodoSectionKey, string> = {
    vaccinations: 'Aşı',
    labResults: 'Lab',
    pendingCharges: 'Ücret bekleyen işlem',
    outstanding: 'Bakiye'
};

export interface PetTodoView {
    items: PetTodoItem[];
    loading: boolean;
    /** Yüklenemeyen kaynakların okunur adları. */
    failed: string[];
    /** Hiçbir kaynağı okuma izni yok: liste "bilinmiyor"dur, "iş yok" denmez. */
    forbidden: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function okData<T>(s: PetCardSection<T>): T | null {
    return s?.state === 'ok' ? s.data : null;
}

/**
 * Açık işler ucunun bir bölümü kart bölümüne (`PET_OPEN_ITEMS_API_CONTRACT.md` bölüm zarfı). İstek yükleniyor/alınamadıysa bölüm de öyledir.
 * `Forbidden` → `null` (gösterilmez; "yok" denmez), `Unavailable` → `error`, `Empty` → `ok` + `null` (açık iş yok).
 */
export function openItemsSection<T>(openItems: PetCardSection<PetOpenItemsVm>, pick: (o: PetOpenItemsVm) => PetSummarySectionVm<T>): PetCardSection<T | null> {
    if (openItems?.state !== 'ok') {
        return openItems;
    }

    const section = pick(openItems.data);

    switch (section.state) {
        case 'Forbidden':
            return null;
        case 'Unavailable':
            return { state: 'error' };
        default:
            return { state: 'ok', data: section.data };
    }
}

/** Başlıktaki "Açık borç": sahibin toplam borcu (bakiye ucuyla aynı değer); `Empty` = borç yok. */
export function ownerOutstandingSection(openItems: PetCardSection<PetOpenItemsVm>): PetCardSection<Pick<ClientBalanceVm, 'outstandingAmount' | 'currency'>> {
    const s = openItemsSection(openItems, (o) => o.outstanding);

    return s?.state === 'ok' ? { state: 'ok', data: { outstandingAmount: s.data?.clientOutstandingAmount ?? 0, currency: s.data?.currency ?? 'TRY' } } : s;
}

/**
 * Hasta bazlı "Yapılacaklar" (ADR-020 karar 2c): `GET /pets/{id}/open-items` yanıtını satırlara çevirir.
 * Hangi kaydın açık iş olduğu (aşı penceresi, yorum bekleme, tutar, vefat eden hastada aşı yok) sunucu kuralıdır; burada yeniden hesaplanmaz.
 * Her satırda tek eylem: yazma izni varsa işi yapan form, yoksa kaydın detayı.
 */
export function buildPetTodo(openItems: PetCardSection<PetOpenItemsVm>, ctx: PetTodoContext): PetTodoView {
    const now = ctx.now ?? new Date();
    const canWrite = (claim: string) => !ctx.mutationBlocked && ctx.hasClaim(claim);
    const sources = {
        vaccinations: openItemsSection(openItems, (o) => o.vaccinations),
        labResults: openItemsSection(openItems, (o) => o.labResults),
        pendingCharges: openItemsSection(openItems, (o) => o.pendingCharges),
        outstanding: openItemsSection(openItems, (o) => o.outstanding)
    } satisfies Record<PetTodoSectionKey, PetCardSection<unknown>>;
    const items: PetTodoItem[] = [];

    // Vefat eden hastanın randevusu otomatik iptal edilmez (K4); iptal kullanıcıya bırakılır, satır yalnız listeye götürür. Uç tek (en yakın) randevu döner, sayı verilmez.
    const nextAppointment = openItems?.state === 'ok' && openItems.data.status === 'Deceased' ? okData(openItemsSection(openItems, (o) => o.nextAppointment)) : null;

    if (nextAppointment) {
        items.push({
            key: `deceased-appointment-${nextAppointment.id}`,
            kind: 'deceasedAppointment',
            tone: 'info',
            icon: 'pi pi-calendar',
            title: 'Vefat eden hastanın açık randevusu var',
            detail: `En yakını: ${formatUtcIsoAsLocalDateTimeDisplay(nextAppointment.scheduledAtUtc)}`,
            // Liste, satırın tanımıyla aynı kümeyi gösterir: bu hastanın bugünden itibaren planlı randevuları.
            action: {
                label: 'Randevuları gör',
                route: ['/panel/appointments'],
                queryParams: { petId: ctx.petId, ...upcomingScheduledAppointmentsLinkQuery(now) }
            }
        });
    }

    // "Uygula" aşı düzenleme rotasına gider; o rotanın yetki koşulu (aşı kataloğu okuma dahil) aynen uygulanır.
    const canApplyVaccine = !ctx.mutationBlocked && canOpenVaccinationEdit(ctx.hasClaim);

    const todayYmd = toIstanbulDateInputValue(now.toISOString());

    const vaccineItem = (v: PetOpenVaccinationVm, overdue: boolean): PetTodoItem => {
        // Gecikmiş olup olmadığı sunucudan gelir (ADR-028); burada yalnız kaç takvim günü geçtiği yazılır (İstanbul günü, saat değil).
        const dueYmd = toIstanbulDateInputValue(v.dueAtUtc);
        const lateDays = dueYmd ? Math.round((Date.parse(`${todayYmd}T00:00:00Z`) - Date.parse(`${dueYmd}T00:00:00Z`)) / DAY_MS) : 0;

        return {
            key: `vaccine-${v.id}`,
            kind: overdue ? 'overdueVaccine' : 'upcomingVaccine',
            tone: overdue ? 'danger' : 'info',
            icon: 'pi pi-shield',
            title: `${overdue ? 'Gecikmiş aşı' : 'Yaklaşan aşı'}: ${v.vaccineName}`,
            detail: `Vade ${formatUtcIsoAsLocalDateDisplay(v.dueAtUtc)}${overdue && lateDays > 0 ? ` · ${lateDays} gün geçti` : ''}`,
            action: canApplyVaccine ? { label: 'Uygula', route: ['/panel/vaccinations', v.id, 'edit'] } : { label: 'Aç', route: ['/panel/vaccinations', v.id] }
        };
    };

    const vaccinations = okData(sources.vaccinations);

    for (const v of vaccinations?.overdue ?? []) {
        items.push(vaccineItem(v, true));
    }

    for (const v of vaccinations?.upcoming ?? []) {
        items.push(vaccineItem(v, false));
    }

    const canEditLab = canWrite(LAB_RESULTS_UPDATE_CLAIM);
    const labAction = (id: string, label: string): PetTodoAction => (canEditLab ? { label, route: ['/panel/lab-results', id, 'edit'] } : { label: 'Aç', route: ['/panel/lab-results', id] });
    const labs = okData(sources.labResults);

    for (const l of labs?.awaitingResult ?? []) {
        items.push({
            key: `lab-${l.id}`,
            kind: 'pendingLab',
            tone: 'warn',
            icon: 'pi pi-chart-bar',
            title: `Lab sonucu bekleniyor: ${l.testName}`,
            detail: `İstendi ${formatUtcIsoAsLocalDateDisplay(l.requestedAtUtc)}`,
            action: labAction(l.id, 'Sonuç gir')
        });
    }

    for (const l of labs?.awaitingInterpretation ?? []) {
        items.push({
            key: `lab-${l.id}`,
            kind: 'labInterpretation',
            tone: 'warn',
            icon: 'pi pi-comment',
            title: `Lab yorumu bekliyor: ${l.testName}`,
            detail: `Sonuç ${formatUtcIsoAsLocalDateDisplay(l.resultDateUtc)}`,
            action: labAction(l.id, 'Yorum yaz')
        });
    }

    const charges = okData(sources.pendingCharges);

    if (charges && charges.count > 0) {
        const priced = charges.count - charges.unpricedCount;

        items.push({
            key: `pending-charges-${ctx.petId}`,
            kind: 'pendingCharge',
            tone: 'warn',
            icon: 'pi pi-receipt',
            title: `${charges.count} işlem ücret bekliyor`,
            detail: [priced > 0 ? `Toplam ${formatMoney(charges.totalAmount, charges.currency)}` : null, charges.unpricedCount > 0 ? `${charges.unpricedCount} kalem fiyat bekliyor` : null]
                .filter((p): p is string => p !== null)
                .join(' · '),
            action: pendingChargesAction(ctx.petId, canWrite(CHARGES_CREATE_CLAIM))
        });
    }

    const outstanding = okData(sources.outstanding);

    if (outstanding && outstanding.clientOutstandingAmount > 0 && ctx.clientId) {
        const detail =
            outstanding.petOutstandingAmount > 0
                ? `Bu hasta: ${formatMoney(outstanding.petOutstandingAmount, outstanding.currency)} · sahibin toplam borcu`
                : 'Sahibin toplam borcu (diğer hastalar veya genel)';
        const action = canWrite(PAYMENTS_CREATE_CLAIM) ? takePaymentAction(ctx.clientId) : { label: 'Bakiyeyi gör', route: ['/panel/clients', ctx.clientId] };

        items.push(openBalanceItem(outstanding.clientOutstandingAmount, outstanding.currency, detail, action));
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
        failed: entries.filter(([, s]) => s?.state === 'error').map(([k]) => labels[k]),
        forbidden: entries.every(([, s]) => s === null)
    };
}

/** Ücret bekleyen satırın eylemi: hayvana süzülmüş Ücretlendir sayfası (öneri ucu hayvan bazlı süzer); hasta ve müşteri kartı ortak. */
function pendingChargesAction(petId: string, canCharge: boolean): PetTodoAction {
    return { label: canCharge ? 'Ücretlendir' : 'Gör', route: ['/panel/charges/pending'], queryParams: { petId } };
}

/**
 * Müşteri kartı: bir hayvanın ücret bekleyen işlemleri tek satırda (kalem adlarıyla).
 * `petName` verilirse başlık hayvan adıyla başlar.
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
        action: pendingChargesAction(petId, canCharge)
    };
}

function takePaymentAction(clientId: string): PetTodoAction {
    return { label: 'Ödeme al', route: ['/panel/payments/new'], queryParams: { clientId } };
}

/** Açık borç satırı; borç müşterinindir (ADR-012), başlık sahibin toplamıdır. Hasta ve müşteri kartı ortak. */
function openBalanceItem(outstandingAmount: number, currency: string, detail: string, action: PetTodoAction): PetTodoItem {
    return {
        key: 'open-balance',
        kind: 'openBalance',
        tone: 'danger',
        icon: 'pi pi-wallet',
        title: `Açık borç: ${formatMoney(outstandingAmount, currency)}`,
        detail,
        action
    };
}

/** Müşteri kartı açık borç satırı: hayvan kırılımıyla; ödeme alma izni yoksa müşterinin ücret listesine gider. */
export function openBalanceTodoItem(balance: ClientBalanceVm | null, opts: { clientId: string | null; canTakePayment: boolean }): PetTodoItem | null {
    if (!balance || balance.outstandingAmount <= 0) {
        return null;
    }

    const currency = balance.currency || 'TRY';
    const detail = outstandingByPet(balance)
        .map((p) => `${p.petName?.trim() || 'Genel'} ${formatMoney(p.outstandingAmount, currency)}`)
        .join(' · ');
    const action =
        opts.canTakePayment && opts.clientId
            ? takePaymentAction(opts.clientId)
            : { label: 'Ücretleri gör', route: ['/panel/charges'], queryParams: { clientId: balance.clientId } };

    return openBalanceItem(balance.outstandingAmount, currency, detail, action);
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
