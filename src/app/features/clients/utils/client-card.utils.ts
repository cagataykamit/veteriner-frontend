import { CHARGES_CREATE_CLAIM, PAYMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
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

    const balance = openBalanceTodoItem(okData(sources.balance), { petId: null, clientId: ctx.clientId, canTakePayment: canWrite(PAYMENTS_CREATE_CLAIM) });
    if (balance) {
        items.push(balance);
    }

    return todoView(items, ctx.emphasis, sources, SOURCE_LABELS);
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

function groupByPet(charges: readonly ChargeSuggestionVm[]): Map<string, ChargeSuggestionVm[]> {
    const byPet = new Map<string, ChargeSuggestionVm[]>();
    for (const c of charges) {
        byPet.set(c.petId, [...(byPet.get(c.petId) ?? []), c]);
    }
    return byPet;
}
