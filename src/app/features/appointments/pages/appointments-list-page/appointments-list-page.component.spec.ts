import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CANCEL_CLAIM, APPOINTMENTS_RESCHEDULE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { isLastRowAction, isRightAfterDetail, rowDangerActions, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppointmentsListPageComponent } from './appointments-list-page.component';

const STATE_KEY = 'panel:appointments:listState';

describe('AppointmentsListPageComponent — karttan gelen süzgeç bağlantısı', () => {
    const setup = (query: Record<string, string>) => {
        const getAppointments = jasmine.createSpy('getAppointments').and.returnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));

        TestBed.configureTestingModule({
            imports: [AppointmentsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: AppointmentsService, useValue: { getAppointments } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const fixture = TestBed.createComponent(AppointmentsListPageComponent);

        fixture.detectChanges();

        return { fixture, getAppointments, navigate, cmp: fixture.componentInstance };
    };

    beforeEach(() => sessionStorage.removeItem(STATE_KEY));
    afterEach(() => sessionStorage.removeItem(STATE_KEY));

    it('status ve fromDate API çağrısına gider, süzgeç çubuğunda etkin görünür ve adres çubuğundan kaldırılır', () => {
        const { getAppointments, navigate, cmp } = setup({ petId: 'pet-1', status: '0', fromDate: '2026-10-16' });
        const args = getAppointments.calls.mostRecent().args[0];

        expect(args.petId).toBe('pet-1');
        expect(args.status).toBe('0');
        expect(args.fromDate).toBe('2026-10-16');
        expect(args.toDate).toBeUndefined();
        expect(cmp.statusFilter).toBe('0');
        expect(cmp.fromDateInput).toBe('2026-10-16');
        expect(cmp.isStatusActive()).toBeTrue();
        expect(cmp.isFromDateActive()).toBeTrue();
        expect(cmp.isToDateActive()).toBeFalse();
        expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { status: null, fromDate: null, toDate: null }, replaceUrl: true }));
    });

    it('bağlantı süzgeçleri oturumdaki eski süzgeçlerin (arama, sayfa) yerine geçer', () => {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ search: 'eski', status: '2', fromDate: '2025-01-01', toDate: '2025-01-31', page: 3, pageSize: 20 }));

        const { getAppointments } = setup({ fromDate: '2026-10-16', toDate: '2026-10-16' });
        const args = getAppointments.calls.mostRecent().args[0];

        expect(args.search).toBeUndefined();
        expect(args.status).toBeUndefined();
        expect(args.fromDate).toBe('2026-10-16');
        expect(args.toDate).toBe('2026-10-16');
        expect(args.page).toBe(1);
        expect(JSON.parse(sessionStorage.getItem(STATE_KEY)!).fromDate).toBe('2026-10-16');
    });

    it('geçersiz değerler yok sayılır; süzgeç parametresi yoksa oturum durumu korunur ve adres değiştirilmez', () => {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ search: '', status: '1', fromDate: '', toDate: '', page: 2, pageSize: 10 }));

        const { getAppointments, navigate } = setup({ status: 'x', fromDate: '16.10.2026' });
        const args = getAppointments.calls.mostRecent().args[0];

        expect(args.status).toBe('1');
        expect(args.fromDate).toBeUndefined();
        expect(args.page).toBe(2);
        expect(navigate).not.toHaveBeenCalled();
    });
});

/** ADR-026 madde 6: Düzenle, detay sayfasındaki Düzenle ile aynı yetki (Appointments.Reschedule) ve salt okunur koşuluyla satırda Detay'ın yanındadır. */
describe('AppointmentsListPageComponent — satırda Düzenle', () => {
    const appt: AppointmentListItemVm = {
        id: 'a1',
        scheduledAtUtc: '2026-10-16T07:00:00Z',
        scheduledEndUtc: '2026-10-16T07:30:00Z',
        durationMinutes: 30,
        durationLabel: '30 dk',
        clientId: 'c1',
        clientName: 'Ali Veli',
        petId: 'p1',
        petName: 'Pamuk',
        speciesName: 'Kedi',
        appointmentType: 0,
        appointmentTypeName: null,
        status: 0,
        lifecycleStatus: null
    };

    const create = (claims: string[], mutationBlocked = false): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [AppointmentsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AppointmentsService, useValue: { getAppointments: () => of({ items: [appt], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(AppointmentsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    beforeEach(() => sessionStorage.removeItem(STATE_KEY));
    afterEach(() => sessionStorage.removeItem(STATE_KEY));

    it("Appointments.Reschedule varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", () => {
        const edits = rowEditActions(create([APPOINTMENTS_RESCHEDULE_CLAIM]));

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/appointments/a1/edit');
            expect(isRightAfterDetail(edit)).toBeTrue();
        }
    });

    it('yetki yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([APPOINTMENTS_RESCHEDULE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBeTrue();
    });
});

/** ADR-026 madde 7: İptal simgesi `Appointments.Cancel` ile yalnız Planlandı randevuda; salt okunur kiracıda yok. */
describe('AppointmentsListPageComponent — satırda İptal', () => {
    const appt = (status: number): AppointmentListItemVm => ({
        id: 'a1',
        scheduledAtUtc: '2026-10-16T07:00:00Z',
        scheduledEndUtc: '2026-10-16T07:30:00Z',
        durationMinutes: 30,
        durationLabel: '30 dk',
        clientId: 'c1',
        clientName: 'Ali Veli',
        petId: 'p1',
        petName: 'Pamuk',
        speciesName: 'Kedi',
        appointmentType: 0,
        appointmentTypeName: null,
        status,
        lifecycleStatus: null
    });

    let getAppointments: jasmine.Spy;
    let cancelAppointment: jasmine.Spy;

    const create = (claims: string[], opts: { status?: number; mutationBlocked?: boolean } = {}) => {
        getAppointments = jasmine.createSpy('getAppointments').and.returnValue(of({ items: [appt(opts.status ?? 0)], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
        cancelAppointment = jasmine.createSpy('cancelAppointment').and.returnValue(of(void 0));
        TestBed.configureTestingModule({
            imports: [AppointmentsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AppointmentsService, useValue: { getAppointments, cancelAppointment } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => !!opts.mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(AppointmentsListPageComponent);

        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement };
    };

    const dialogOf = (fixture: ReturnType<typeof create>['fixture']) =>
        fixture.debugElement.query((d) => d.name === 'app-reason-confirm-dialog').componentInstance as ReasonConfirmDialogComponent;

    beforeEach(() => sessionStorage.removeItem(STATE_KEY));
    afterEach(() => sessionStorage.removeItem(STATE_KEY));

    it("Appointments.Cancel ile Planlandı randevuda tablo ve mobil kartta Detay, Düzenle'den sonra son eylemdir", () => {
        const voids = rowDangerActions(create([APPOINTMENTS_RESCHEDULE_CLAIM, APPOINTMENTS_CANCEL_CLAIM]).el);

        expect(voids.length).withContext('tablo + mobil kart').toBe(2);

        for (const v of voids) {
            expect(v.getAttribute('aria-label')).toBe('İptal et');
            expect(isLastRowAction(v)).toBeTrue();
            expect(v.closest('app-row-action-button')?.previousElementSibling?.querySelector('.fa-pen-to-square')).not.toBeNull();
        }
    });

    it('yetki yoksa, salt okunur kiracıda ve Planlandı dışındaki durumlarda İptal görünmez', () => {
        expect(rowDangerActions(create([]).el).length).toBe(0);

        TestBed.resetTestingModule();
        expect(rowDangerActions(create([APPOINTMENTS_CANCEL_CLAIM], { mutationBlocked: true }).el).length).toBe(0);

        for (const status of [1, 2, 3]) {
            TestBed.resetTestingModule();
            expect(rowDangerActions(create([APPOINTMENTS_CANCEL_CLAIM], { status }).el).length).withContext(`durum ${status}`).toBe(0);
        }
    });

    it('İptal tıklanınca diyalog açılır, onaylanmadan servis çağrılmaz; onayda cancelAppointment çağrılır ve liste yenilenir', () => {
        const { fixture, el } = create([APPOINTMENTS_CANCEL_CLAIM]);

        rowDangerActions(el)[0].click();
        fixture.detectChanges();

        expect(fixture.debugElement.query((d) => d.name === 'app-appointment-cancel-dialog')).not.toBeNull();
        const dialog = dialogOf(fixture);

        expect(dialog.visible()).toBeTrue();
        expect(dialog.reasonOptional()).toBeTrue();
        expect(dialog.summary()).toContain('Pamuk · Ali Veli · 16.10.2026');
        expect(dialog.description()).toContain('geri alınamaz');
        expect(cancelAppointment).not.toHaveBeenCalled();

        getAppointments.calls.reset();
        dialog.form.controls.reason.setValue('Sahibi aradı');
        dialog.onSubmit();

        expect(cancelAppointment).toHaveBeenCalledOnceWith('a1', 'Sahibi aradı');
        expect(getAppointments).toHaveBeenCalledTimes(1);
        expect(dialog.visible()).toBeFalse();
    });

    it('mobil karttan açılıp vazgeçilirse servis çağrılmaz ve liste yenilenmez', () => {
        const { fixture, el } = create([APPOINTMENTS_CANCEL_CLAIM]);

        rowDangerActions(el)[1].click();
        fixture.detectChanges();
        const dialog = dialogOf(fixture);

        expect(dialog.visible()).toBeTrue();
        getAppointments.calls.reset();
        dialog.close();
        fixture.detectChanges();

        expect(cancelAppointment).not.toHaveBeenCalled();
        expect(getAppointments).not.toHaveBeenCalled();
    });
});
