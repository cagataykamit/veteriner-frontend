import type { ClientBalanceDto } from '@/app/features/clients/models/client-balance-api.model';
import type { ClientBalanceVm, ClientOpenChargeVm } from '@/app/features/clients/models/client-balance-vm.model';

function trimmedOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();

    return t ? t : null;
}

/** Hayvan → ziyaret → ücret ağacını düzleştirir; sıra backend'dedir (hayvan, ziyaret, ücret). */
export function mapClientBalanceDtoToVm(dto: ClientBalanceDto): ClientBalanceVm {
    const openCharges: ClientOpenChargeVm[] = [];

    for (const pet of dto.pets ?? []) {
        for (const visit of pet.visits ?? []) {
            for (const charge of visit.charges ?? []) {
                openCharges.push({
                    chargeId: charge.chargeId,
                    clinicId: charge.clinicId,
                    petId: trimmedOrNull(pet.petId),
                    petName: trimmedOrNull(pet.petName),
                    visitId: trimmedOrNull(visit.visitId),
                    visitArrivedAtUtc: trimmedOrNull(visit.visitArrivedAtUtc),
                    examinationId: trimmedOrNull(charge.examinationId),
                    description: charge.description,
                    amount: charge.amount,
                    allocatedAmount: charge.allocatedAmount,
                    outstandingAmount: charge.outstandingAmount,
                    createdAtUtc: charge.createdAtUtc
                });
            }
        }
    }

    return {
        clientId: dto.clientId,
        clientName: trimmedOrNull(dto.clientName) ?? '—',
        currency: trimmedOrNull(dto.currency) ?? 'TRY',
        chargedAmount: dto.chargedAmount,
        allocatedAmount: dto.allocatedAmount,
        outstandingAmount: dto.outstandingAmount,
        openCharges
    };
}
