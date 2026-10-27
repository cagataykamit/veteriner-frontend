import { mapPetOpenItemsDtoToVm } from './pet-open-items.mapper';

describe('mapPetOpenItemsDtoToVm', () => {
    it('Ok bölümleri şekil değiştirmeden eşlenir; kimliksiz satır atlanır', () => {
        const vm = mapPetOpenItemsDtoToVm({
            petId: 'p1',
            clientId: 'c1',
            status: 'Active',
            asOfUtc: '2026-10-14T09:00:00Z',
            vaccinations: {
                state: 'Ok',
                data: { overdue: [{ id: 'v1', vaccineName: 'Karma', dueAtUtc: '2026-10-01T00:00:00Z' }, { id: null, vaccineName: 'X' }], upcoming: [{ id: 'v2', vaccineName: 'Kuduz', dueAtUtc: '2026-11-01T00:00:00Z' }] }
            },
            labResults: {
                state: 'Ok',
                data: {
                    awaitingResult: [{ id: 'l1', testName: 'Hemogram', requestedAtUtc: '2026-10-12T08:00:00Z', resultDateUtc: null }],
                    awaitingInterpretation: [{ id: 'l2', testName: 'Biyokimya', requestedAtUtc: '2026-10-10T08:00:00Z', resultDateUtc: '2026-10-11T08:00:00Z' }]
                }
            },
            pendingCharges: { state: 'Ok', data: { count: 3, totalAmount: 360, unpricedCount: 1, currency: 'TRY' } },
            nextAppointment: { state: 'Ok', data: { id: 'a1', scheduledAtUtc: '2026-10-20T09:00:00Z', durationMinutes: 30, appointmentType: 'Vaccination', clinicName: 'Merkez' } },
            outstanding: { state: 'Ok', data: { petOutstandingAmount: 600, petOpenChargeCount: 1, clientOutstandingAmount: 650, currency: 'TRY' } }
        });

        expect(vm.petId).toBe('p1');
        expect(vm.clientId).toBe('c1');
        expect(vm.vaccinations).toEqual({
            state: 'Ok',
            data: { overdue: [{ id: 'v1', vaccineName: 'Karma', dueAtUtc: '2026-10-01T00:00:00Z' }], upcoming: [{ id: 'v2', vaccineName: 'Kuduz', dueAtUtc: '2026-11-01T00:00:00Z' }] }
        });
        expect(vm.labResults.data?.awaitingInterpretation[0]).toEqual({ id: 'l2', testName: 'Biyokimya', requestedAtUtc: '2026-10-10T08:00:00Z', resultDateUtc: '2026-10-11T08:00:00Z' });
        expect(vm.pendingCharges.data).toEqual({ count: 3, totalAmount: 360, unpricedCount: 1, currency: 'TRY' });
        expect(vm.nextAppointment.data).toEqual({ id: 'a1', scheduledAtUtc: '2026-10-20T09:00:00Z', durationMinutes: 30, appointmentType: 'Vaccination', clinicName: 'Merkez' });
        expect(vm.outstanding.data).toEqual({ petOutstandingAmount: 600, petOpenChargeCount: 1, clientOutstandingAmount: 650, currency: 'TRY' });
    });

    it('Empty, Forbidden ve Unavailable verisiz korunur; eksik/bilinmeyen durum ve okunamayan Ok verisi Unavailable sayılır', () => {
        const vm = mapPetOpenItemsDtoToVm({
            petId: 'p1',
            status: 'Deceased',
            vaccinations: { state: 'Empty', data: null },
            labResults: { state: 'Forbidden', data: null },
            pendingCharges: { state: 'Unavailable', data: null },
            nextAppointment: { state: 'Ok', data: { id: null } },
            outstanding: { state: 'Whatever', data: null }
        });

        expect(vm.status).toBe('Deceased');
        expect(vm.vaccinations).toEqual({ state: 'Empty', data: null });
        expect(vm.labResults).toEqual({ state: 'Forbidden', data: null });
        expect(vm.pendingCharges).toEqual({ state: 'Unavailable', data: null });
        expect(vm.nextAppointment).toEqual({ state: 'Unavailable', data: null });
        expect(vm.outstanding).toEqual({ state: 'Unavailable', data: null });
        expect(mapPetOpenItemsDtoToVm({}).vaccinations.state).toBe('Unavailable');
    });
});
