import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PortalPage } from '@portal/app/core/api/portal-page';
import type { PortalLink, PortalMe } from '@portal/app/core/auth/portal-auth.models';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import type { PortalAppointment } from '@portal/app/features/appointments/portal-appointments.api';
import type { PortalBalance, PortalPayment } from '@portal/app/features/balance/portal-balance.api';
import type { PortalClinic } from '@portal/app/features/clinic/portal-clinic.api';
import type { PortalPet, PortalPetDetail, PortalPetVaccinations } from '@portal/app/features/pets/portal-pets.api';
import { configurePortalHttp, TEST_ME } from './portal-testing';

/**
 * Yalnız spec'ler: `PORTAL_API_CONTRACT.md` §6 örnek yanıtları (kimlikler kısaltıldı, tarihler `Z`'siz UTC).
 */
export const LINK_MERKEZ: PortalLink = TEST_ME.links[0];
export const LINK_SAHIL: PortalLink = { linkId: 'link-2', clinicId: 'clinic-2', clinicName: 'Sahil', clientFullName: 'Ayşe Yılmaz' };

export const PET_PAMUK: PortalPet = {
    petId: 'pet-1',
    name: 'Pamuk',
    speciesName: 'Kedi',
    breedName: 'Tekir',
    gender: 'Female',
    birthDate: '2022-03-01',
    microchipNumber: '900000000000001',
    weightKg: 4.2,
    status: 'Active'
};

export const PET_BONCUK: PortalPet = {
    petId: 'pet-2',
    name: 'Boncuk',
    speciesName: 'Kedi',
    breedName: null,
    gender: null,
    birthDate: null,
    microchipNumber: null,
    weightKg: null,
    status: 'Deceased'
};

export const PET_PAMUK_DETAIL: PortalPetDetail = { ...PET_PAMUK, isNeutered: true, colorName: 'Siyah' };
export const PET_BONCUK_DETAIL: PortalPetDetail = { ...PET_BONCUK, isNeutered: false, colorName: null };

export const VACCINATIONS_PAMUK: PortalPetVaccinations = {
    history: [
        { vaccinationId: 'v-1', vaccineName: 'Lösemi', status: 'Cancelled', appliedAtUtc: null, dueAtUtc: '2026-10-06T05:48:39.0565737' },
        { vaccinationId: 'v-2', vaccineName: 'Karma', status: 'Applied', appliedAtUtc: '2026-09-16T05:48:39.0565737', dueAtUtc: null }
    ],
    upcoming: [
        { vaccinationId: 'v-3', vaccineName: 'Karma', dueAtUtc: '2026-10-13T05:48:39.0565737', isOverdue: true },
        { vaccinationId: 'v-4', vaccineName: 'Kuduz', dueAtUtc: '2026-11-05T05:48:39.0565737', isOverdue: false }
    ]
};

/** Vefat eden hayvan: geçmiş döner, yaklaşan boş (sözleşme §6 ortak kurallar). */
export const VACCINATIONS_BONCUK: PortalPetVaccinations = {
    history: [{ vaccinationId: 'v-9', vaccineName: 'Kuduz', status: 'Applied', appliedAtUtc: '2025-05-01T07:00:00', dueAtUtc: null }],
    upcoming: []
};

export function appointment(overrides: Partial<PortalAppointment> = {}): PortalAppointment {
    return {
        appointmentId: 'ap-1',
        petId: 'pet-1',
        petName: 'Pamuk',
        clinicId: LINK_MERKEZ.clinicId,
        clinicName: 'Merkez',
        scheduledAtUtc: '2026-10-19T05:48:39.0565737',
        durationMinutes: 30,
        appointmentType: 'Vaccination',
        status: 'Scheduled',
        ...overrides
    };
}

export function page<T>(items: readonly T[], pageNo = 1, totalPages = 1, totalItems = items.length): PortalPage<T> {
    return { items, page: pageNo, pageSize: 20, totalItems, totalPages };
}

export const BALANCE: PortalBalance = {
    clinicId: LINK_MERKEZ.clinicId,
    currency: 'TRY',
    totalCharged: 1500,
    totalPaid: 1000,
    outstanding: 500,
    unallocatedPaymentsAmount: 200,
    lastPaymentAtUtc: '2026-10-14T05:48:39.0565737'
};

export const BALANCE_CLEAR: PortalBalance = { ...BALANCE, totalPaid: 1500, outstanding: 0, unallocatedPaymentsAmount: 0 };

export const PAYMENTS: readonly PortalPayment[] = [
    { paidAtUtc: '2026-10-14T05:48:39.0565737', amount: 1000, currency: 'TRY', method: 'Card' },
    { paidAtUtc: '2026-09-06T05:48:39.0565737', amount: 200, currency: 'TRY', method: 'Cash' }
];

export const CLINIC: PortalClinic = {
    clinicId: LINK_MERKEZ.clinicId,
    name: 'Merkez',
    city: 'Ankara',
    phone: '0312 555 00 00',
    email: 'merkez@example.com',
    address: 'Atatürk Bulvarı No: 1',
    workingHours: [
        { dayOfWeek: 'Sunday', isClosed: true, opensAt: null, closesAt: null, breakStartsAt: null, breakEndsAt: null },
        { dayOfWeek: 'Monday', isClosed: false, opensAt: '09:00:00', closesAt: '18:00:00', breakStartsAt: '12:30:00', breakEndsAt: '13:30:00' }
    ]
};

/** Oturum sahtesi: bağ listesi ve seçili bağ sinyal olarak; testte `active.set(...)` ile klinik değiştirilir. */
export interface PortalSessionStub {
    readonly links: WritableSignal<readonly PortalLink[]>;
    readonly activeLink: WritableSignal<PortalLink | null>;
    readonly me: WritableSignal<PortalMe | null>;
}

export function createSessionStub(links: readonly PortalLink[] = [LINK_MERKEZ]): PortalSessionStub {
    return {
        links: signal<readonly PortalLink[]>(links),
        activeLink: signal<PortalLink | null>(links[0] ?? null),
        me: signal<PortalMe | null>({ ...TEST_ME, links })
    };
}

/** Sayfa spec'leri: gerçek API servisleri + `HttpTestingController`, oturum sahtesi. */
export function configurePortalPage(component: unknown, session: PortalSessionStub): void {
    configurePortalHttp();
    TestBed.configureTestingModule({
        imports: [component as never],
        providers: [{ provide: PortalSessionService, useValue: session }]
    });
}

/** Kök + göreli yol, sorgu parametresiz. */
export const url = (path: string) => `/api/portal/v1/${path}`;
