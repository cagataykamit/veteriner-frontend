import { CHARGES_CREATE_CLAIM, PAYMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import type { ChargeSuggestionsPagedVm, ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import { computeChargeAmount } from '@/app/features/charges/utils/charge-amount.utils';
import type { ClientBalanceVm } from '@/app/entities/client/models/client-balance-vm.model';
import type { PetListItemVm } from '@/app/entities/pet/models/pet-vm.model';
import {
    nextScheduledAppointment,
    okData,
    openBalanceTodoItem,
    outstandingByPet,
    type PetCardEmphasis,
    type PetCardSection,
    pendingChargesTodoItem,
    type PetTodoItem,
    type PetTodoView,
    todoView
} from '@/app/features/pets/utils/pet-card.utils';

/** Müşteri kartı "Yapılacaklar" kaynakları (ADR-020 karar 6): para tarafı; klinik işler hayvan kartındadır. */
export interface ClientTodoSources {
    pendingCharges: PetCardSection<ChargeSuggestionVm[]>;
    balance: PetCardSection<ClientBalanceVm>;
}

export interface ClientTodoContext {
    clientId: string;
    hasClaim: (claim: string) => boolean;
    /** Salt okunur kiracı: yazma eylemleri okuma bağlantısına düşer. */
    mutationBlocked: boolean;
    emphasis: PetCardEmphasis;
}

const SOURCE_LABELS: Record<keyof ClientTodoSources, string> = {
    pendingCharges: 'Ücret bekleyen işlem',
    balance: 'Bakiye'
};

/** Müşteri bazlı Yapılacaklar: açık borç (hayvan kırılımıyla) ve hayvan başına ücret bekleyen işlemler; satır kuralları hasta kartıyla ortak. */
export function buildClientTodo(sources: ClientTodoSources, ctx: ClientTodoContext): PetTodoView {
    const canWrite = (claim: string) => !ctx.mutationBlocked && ctx.hasClaim(claim);
    const items: PetTodoItem[] = [];

    for (const charges of groupByPet(okData(sources.pendingCharges) ?? []).values()) {
        const item = pendingChargesTodoItem(charges, charges[0].petId, canWrite(CHARGES_CREATE_CLAIM), charges[0].petName);

        if (item) {
            items.push(item);
        }
    }

    const balance = openBalanceTodoItem(okData(sources.balance), { clientId: ctx.clientId, canTakePayment: canWrite(PAYMENTS_CREATE_CLAIM) });

    if (balance) {
        items.push(balance);
    }

    return todoView(items, ctx.emphasis, sources, SOURCE_LABELS);
}

/** Müşteri kartında "Geldi"nin önceden seçeceği hayvan: tek aktif hayvan varsa o (vefat eden yeni geliş açamaz). */
export function soleActivePet(pets: readonly PetListItemVm[]): PetListItemVm | null {
    const active = pets.filter((p) => p.status !== 'Deceased');

    return active.length === 1 ? active[0] : null;
}

/** Hayvanlar listesindeki satır: kimlik ve hayvana düşen para/randevu ipuçları. `null` = o bilgi okunamıyor (yetki/hata). */
export interface ClientPetRow {
    pet: PetListItemVm;
    outstandingAmount: number | null;
    pendingChargeCount: number | null;
    nextAppointment: AppointmentListItemVm | null;
}

/**
 * Hayvan satırlarını bakiye, ücret bekleyen işlem ve son özetteki randevularla birleştirir (müşteri bazlı tek uç yok).
 * Sonraki randevu müşteri son özetindeki en yeni 10 randevudan seçilir.
 */
export function buildClientPetRows(
    pets: readonly PetListItemVm[],
    balance: ClientBalanceVm | null,
    pendingCharges: readonly ChargeSuggestionVm[] | null,
    appointments: readonly AppointmentListItemVm[],
    now: Date = new Date()
): ClientPetRow[] {
    const outstanding = balance ? new Map(outstandingByPet(balance).map((p) => [p.petId, p.outstandingAmount])) : null;
    const pending = pendingCharges ? groupByPet(pendingCharges) : null;

    return pets.map((pet) => ({
        pet,
        outstandingAmount: outstanding ? (outstanding.get(pet.id) ?? 0) : null,
        pendingChargeCount: pending ? (pending.get(pet.id)?.length ?? 0) : null,
        nextAppointment: nextScheduledAppointment(
            appointments.filter((a) => a.petId === pet.id),
            now
        )
    }));
}

/** Müşteri kartındaki "Ücret bekleyen" özeti. */
export interface PendingChargesSummary {
    /** Bekleyen kalem sayısı (sunucunun `totalItems`'ı). */
    count: number;
    /** Fiyatlı kalemlerin önerilen tutar toplamı. */
    amount: number;
    currency: string;
    /** Önerilen birim fiyatı olmayan ("fiyat bekliyor") kalem sayısı; tutara katılmaz. */
    unpricedCount: number;
    /** Sayfa tüm kalemleri içermiyor: tutar yalnız okunan kalemlerden. */
    partial: boolean;
}

/**
 * Müşteri bazlı ücret önerisi özeti (sözleşme §3, K10): sayı `totalItems`, tutar sayfadaki kalemlerden `quantity × suggestedUnitPrice`
 * (satır başına ücretle aynı yuvarlama); fiyatsız kalem tutara girmez, ayrı sayılır.
 */
export function pendingChargesSummary(page: Pick<ChargeSuggestionsPagedVm, 'items' | 'totalItems'>): PendingChargesSummary {
    let amount = 0;
    let unpricedCount = 0;

    for (const c of page.items) {
        if (c.suggestedUnitPrice === null) {
            unpricedCount += 1;
        } else {
            amount += computeChargeAmount(c.quantity, c.suggestedUnitPrice) ?? 0;
        }
    }

    return {
        count: page.totalItems,
        amount: Math.round(amount * 100) / 100,
        currency: page.items.find((c) => c.currency?.trim())?.currency ?? 'TRY',
        unpricedCount,
        partial: page.totalItems > page.items.length
    };
}

function groupByPet(charges: readonly ChargeSuggestionVm[]): Map<string, ChargeSuggestionVm[]> {
    const byPet = new Map<string, ChargeSuggestionVm[]>();

    for (const c of charges) {
        byPet.set(c.petId, [...(byPet.get(c.petId) ?? []), c]);
    }

    return byPet;
}
