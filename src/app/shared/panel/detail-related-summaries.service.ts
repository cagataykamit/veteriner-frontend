import { inject, Injectable } from '@angular/core';
import { map, type Observable, of } from 'rxjs';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';

const DETAIL_FETCH_SIZE = 24;
const DETAIL_LIMIT = 5;

function sortIsoDesc<T>(items: T[], get: (x: T) => string | null): T[] {
    return [...items].sort((a, b) => {
        const ta = new Date(get(a) ?? 0).getTime();
        const tb = new Date(get(b) ?? 0).getTime();
        return tb - ta;
    });
}

function filterByPetId<T extends { petId: string | null }>(items: T[], petId: string): T[] {
    return items.filter((i) => (i.petId ?? '').trim() === petId);
}

function filterByClientId<T extends { clientId: string | null }>(items: T[], clientId: string): T[] {
    return items.filter((i) => (i.clientId ?? '').trim() === clientId);
}

/**
 * Detay sayfaları için ilişkili kısa listeler — mevcut liste endpoint’leri üzerinden.
 * Backend filtre parametrelerini yok sayarsa istemci tarafında daraltma yapılır.
 */
@Injectable({ providedIn: 'root' })
export class DetailRelatedSummariesService {
    private readonly vaccinations = inject(VaccinationsService);
    private readonly examinations = inject(ExaminationsService);
    private readonly appointments = inject(AppointmentsService);
    private readonly pets = inject(PetsService);
    private readonly payments = inject(PaymentsService);

    /** Son aşılar (uygulama tarihine göre, en yeni önce). */
    loadRecentVaccinationsForPet(petId: string): Observable<VaccinationListItemVm[]> {
        return this.vaccinations
            .getVaccinations({ page: 1, pageSize: DETAIL_FETCH_SIZE, petId })
            .pipe(
                map((r) => {
                    const rows = filterByPetId(r.items, petId);
                    return sortIsoDesc(rows, (x) => x.appliedAtUtc).slice(0, DETAIL_LIMIT);
                })
            );
    }

    /** Son muayeneler (muayene tarihine göre, en yeni önce). */
    loadRecentExaminationsForPet(petId: string): Observable<ExaminationListItemVm[]> {
        return this.examinations
            .getExaminations({ page: 1, pageSize: DETAIL_FETCH_SIZE, petId })
            .pipe(
                map((r) => {
                    const rows = filterByPetId(r.items, petId);
                    return sortIsoDesc(rows, (x) => x.examinationDateUtc).slice(0, DETAIL_LIMIT);
                })
            );
    }

    /** Yaklaşan randevular (şimdiden sonraki, en yakın önce). */
    loadUpcomingAppointmentsForPet(petId: string): Observable<AppointmentListItemVm[]> {
        return this.appointments
            .getAppointments({ page: 1, pageSize: DETAIL_FETCH_SIZE, petId })
            .pipe(
                map((r) => {
                    const rows = filterByPetId(r.items, petId);
                    const now = Date.now();
                    const future = rows.filter((a) => {
                        const t = a.scheduledAtUtc ? new Date(a.scheduledAtUtc).getTime() : 0;
                        return t >= now;
                    });
                    future.sort((a, b) => {
                        const ta = new Date(a.scheduledAtUtc ?? 0).getTime();
                        const tb = new Date(b.scheduledAtUtc ?? 0).getTime();
                        return ta - tb;
                    });
                    return future.slice(0, DETAIL_LIMIT);
                })
            );
    }

    /** Müşteriye bağlı hayvanlar (liste, kısa). */
    loadPetsForClient(clientId: string): Observable<PetListItemVm[]> {
        return this.pets.getPets({ page: 1, pageSize: DETAIL_FETCH_SIZE, clientId }).pipe(
            map((r) => {
                const rows = filterByClientId(r.items, clientId);
                return rows.slice(0, DETAIL_LIMIT);
            })
        );
    }

    /** Son randevular (planlanan zamana göre, en yeni önce). */
    loadRecentAppointmentsForClient(clientId: string): Observable<AppointmentListItemVm[]> {
        return this.appointments
            .getAppointments({ page: 1, pageSize: DETAIL_FETCH_SIZE, clientId })
            .pipe(
                map((r) => {
                    const rows = filterByClientId(r.items, clientId);
                    return sortIsoDesc(rows, (x) => x.scheduledAtUtc).slice(0, DETAIL_LIMIT);
                })
            );
    }

    /** Son ödemeler (ödeme / oluşturma zamanına göre, en yeni önce). */
    loadRecentPaymentsForClient(clientId: string): Observable<PaymentListItemVm[]> {
        return this.payments.getPayments({ page: 1, pageSize: DETAIL_FETCH_SIZE, clientId }).pipe(
            map((r) => {
                const rows = filterByClientId(r.items, clientId);
                const sorted = [...rows].sort((a, b) => {
                    const ta = new Date(a.paidAtUtc ?? a.createdAtUtc ?? 0).getTime();
                    const tb = new Date(b.paidAtUtc ?? b.createdAtUtc ?? 0).getTime();
                    return tb - ta;
                });
                return sorted.slice(0, DETAIL_LIMIT);
            })
        );
    }

    /**
     * Muayene bağlamı: aynı hayvan veya müşteriye ait ödemeler (ödeme↔muayene FK yoksa liste üzerinden bağlamsal özet).
     * Önce `petId` daraltması, yoksa `clientId`.
     */
    loadRelatedPaymentsForExaminationContext(petId: string | null, clientId: string | null): Observable<PaymentListItemVm[]> {
        const pid = petId?.trim();
        const cid = clientId?.trim();
        if (pid) {
            return this.payments.getPayments({ page: 1, pageSize: DETAIL_FETCH_SIZE, petId: pid }).pipe(
                map((r) => {
                    const rows = filterByPetId(r.items, pid);
                    return sortPaymentsByRecent(rows).slice(0, DETAIL_LIMIT);
                })
            );
        }
        if (cid) {
            return this.payments.getPayments({ page: 1, pageSize: DETAIL_FETCH_SIZE, clientId: cid }).pipe(
                map((r) => {
                    const rows = filterByClientId(r.items, cid);
                    return sortPaymentsByRecent(rows).slice(0, DETAIL_LIMIT);
                })
            );
        }
        return of([]);
    }

    /** Aynı hayvana ait diğer muayeneler (mevcut kayıt hariç, en yeni önce). */
    loadSiblingExaminationsForPet(petId: string, excludeExaminationId: string): Observable<ExaminationListItemVm[]> {
        const pid = petId.trim();
        const exId = excludeExaminationId.trim();
        return this.examinations.getExaminations({ page: 1, pageSize: DETAIL_FETCH_SIZE, petId: pid }).pipe(
            map((r) => {
                const rows = filterByPetId(r.items, pid).filter((x) => x.id !== exId);
                return sortIsoDesc(rows, (x) => x.examinationDateUtc).slice(0, DETAIL_LIMIT);
            })
        );
    }

    /** Aynı hayvana ait randevular (geçmiş + gelecek, planlanan zamana göre en yeni önce). */
    loadRecentAppointmentsForPetChronological(petId: string): Observable<AppointmentListItemVm[]> {
        const pid = petId.trim();
        return this.appointments.getAppointments({ page: 1, pageSize: DETAIL_FETCH_SIZE, petId: pid }).pipe(
            map((r) => {
                const rows = filterByPetId(r.items, pid);
                return sortIsoDesc(rows, (x) => x.scheduledAtUtc).slice(0, DETAIL_LIMIT);
            })
        );
    }

    /**
     * Ödeme bağlamı: ilgili muayeneler — önce hayvan, yoksa müşteri listesi.
     * Ödeme DTO’sunda `examinationId` yoksa tam eşleşme yapılamaz; bağlamsal kısa liste.
     */
    loadRelatedExaminationsForPaymentContext(petId: string | null, clientId: string | null): Observable<ExaminationListItemVm[]> {
        const pid = petId?.trim();
        const cid = clientId?.trim();
        if (pid) {
            return this.loadRecentExaminationsForPet(pid);
        }
        if (cid) {
            return this.examinations.getExaminations({ page: 1, pageSize: DETAIL_FETCH_SIZE, clientId: cid }).pipe(
                map((r) => {
                    const rows = filterByClientId(r.items, cid);
                    return sortIsoDesc(rows, (x) => x.examinationDateUtc).slice(0, DETAIL_LIMIT);
                })
            );
        }
        return of([]);
    }

    /** Ödeme detayı: aynı hayvana ait son randevular (planlanan zamana göre, en yeni önce). */
    loadRecentAppointmentsForPaymentPetContext(petId: string | null): Observable<AppointmentListItemVm[]> {
        const pid = petId?.trim();
        if (!pid) {
            return of([]);
        }
        return this.loadRecentAppointmentsForPetChronological(pid);
    }
}

function sortPaymentsByRecent(items: PaymentListItemVm[]): PaymentListItemVm[] {
    return [...items].sort((a, b) => {
        const ta = new Date(a.paidAtUtc ?? a.createdAtUtc ?? 0).getTime();
        const tb = new Date(b.paidAtUtc ?? b.createdAtUtc ?? 0).getTime();
        return tb - ta;
    });
}
