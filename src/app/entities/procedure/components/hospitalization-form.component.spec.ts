import type { Mock } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Directive, forwardRef, input, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import type { HospitalizationWardVm } from '@/app/entities/hospitalization-ward/models/hospitalization-ward-vm.model';
import { HospitalizationWardsService } from '@/app/entities/hospitalization-ward/services/hospitalization-wards.service';
import { HospitalizationsService } from '@/app/entities/hospitalization/services/hospitalizations.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { HospitalizationFormComponent } from './hospitalization-form.component';

/** Arama bileşenlerinin yerine basit değer erişimcisi (sunucu araması bu testin konusu değil). */
@Directive()
abstract class StubValueAccessor implements ControlValueAccessor {
    readonly inputId = input('');
    writeValue(): void {}
    registerOnChange(): void {}
    registerOnTouched(): void {}
}

@Component({
    selector: 'app-client-search',
    standalone: true,
    template: '',
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubClientSearchComponent), multi: true }]
})
class StubClientSearchComponent extends StubValueAccessor {}

@Component({
    selector: 'app-pet-search',
    standalone: true,
    template: '',
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubPetSearchComponent), multi: true }]
})
class StubPetSearchComponent extends StubValueAccessor {
    readonly clientId = input<string | null>(null);
}

@Component({ selector: 'app-pet-alert-banner', standalone: true, changeDetection: ChangeDetectionStrategy.Eager, template: '' })
class StubPetAlertBannerComponent {
    readonly petId = input<string | null>(null);
}

const wards: HospitalizationWardVm[] = [
    {
        id: 'w1',
        clinicId: 'clinic-1',
        name: 'Yoğun bakım',
        sortOrder: 1,
        isActive: true,
        rooms: [
            { id: 'r1', wardId: 'w1', name: 'Kafes 1', sortOrder: 1, isActive: true },
            { id: 'r2', wardId: 'w1', name: 'Kafes 2', sortOrder: 2, isActive: false }
        ]
    },
    { id: 'w2', clinicId: 'clinic-1', name: 'Pasif servis', sortOrder: 2, isActive: false, rooms: [] }
];

describe('HospitalizationFormComponent — konum: bölüm → oda (HOSP-002)', () => {
    let fixture: ComponentFixture<HospitalizationFormComponent>;
    let create: Mock;
    let listWards: Mock;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [HospitalizationFormComponent],
            providers: [
                provideRouter([]),
                { provide: HospitalizationsService, useValue: { createHospitalization: create } },
                { provide: HospitalizationWardsService, useValue: { listWards } },
                { provide: ExaminationsService, useValue: { getExaminations: () => of({ items: [] }) } },
                { provide: VisitsService, useValue: { getToday: () => of({ items: [] }) } },
                { provide: ClientsService, useValue: {} },
                { provide: PetsService, useValue: {} },
                { provide: AuthService, useValue: { getClinicId: () => 'clinic-1', getClinicName: () => 'Pati', hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideComponent(HospitalizationFormComponent, {
            remove: { imports: [ClientSearchComponent, PetSearchComponent, PetAlertBannerComponent] },
            add: { imports: [StubClientSearchComponent, StubPetSearchComponent, StubPetAlertBannerComponent] }
        });
        fixture = TestBed.createComponent(HospitalizationFormComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const fillRequired = (c: HospitalizationFormComponent) => {
        c.form.controls.clientId.setValue('client-1');
        c.form.controls.petId.setValue('pet-1');
        c.form.patchValue({ admittedAtLocal: '2026-10-20T09:00', reason: 'Gözlem' });
    };

    beforeEach(() => {
        create = vi
            .fn()
            .mockName('createHospitalization')
            .mockReturnValue(of({ id: 'h1' }));
        listWards = vi.fn().mockName('listWards').mockReturnValue(of(wards));
    });

    it('aktif kliniğin tanımlarını yükler; bölüm seçenekleri "Konum yok" + aktif bölümler, oda bölüm seçilince aktif odalar', async () => {
        const c = await setup();

        expect(listWards).toHaveBeenCalledWith('clinic-1');
        expect(c.wardOptions().map((o) => o.label)).toEqual(['Konum yok', 'Yoğun bakım']);
        expect(c.form.controls.roomId.disabled).toBe(true);

        c.form.controls.wardId.setValue('w1');
        expect(c.form.controls.roomId.disabled).toBe(false);
        expect(c.roomOptions().map((o) => o.value)).toEqual(['r1']);
    });

    it('oda seçilince payload roomId taşır; serbest metin konum gönderilmez', async () => {
        const c = await setup();

        fillRequired(c);
        c.form.controls.wardId.setValue('w1');
        c.form.controls.roomId.setValue('r1');
        c.onSubmit();

        expect(create).toHaveBeenCalledTimes(1);
        const payload = vi.mocked(create).mock.lastCall![0];

        expect(payload.roomId).toBe('r1');
        expect(payload.location).toBeNull();
        expect(payload.clearRoom).toBe(false);
    });

    it('"Konum yok" iken roomId null gider; bölüm seçili ama oda seçilmemişse form gönderilmez', async () => {
        const c = await setup();

        fillRequired(c);
        c.onSubmit();
        expect(vi.mocked(create).mock.lastCall![0].roomId).toBeNull();

        create.mockClear();
        c.form.controls.wardId.setValue('w1');
        c.onSubmit();
        expect(create).not.toHaveBeenCalled();
        expect(c.form.invalid).toBe(true);

        c.form.controls.wardId.setValue('');
        expect(c.form.controls.roomId.value).toBe('');
        expect(c.form.controls.roomId.disabled).toBe(true);
    });

    it('Hospitalizations.RoomInactive oda alanında gösterilir', async () => {
        create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'Hospitalizations.RoomInactive' } } })));
        const c = await setup();

        fillRequired(c);
        c.form.controls.wardId.setValue('w1');
        c.form.controls.roomId.setValue('r1');
        c.onSubmit();
        fixture.detectChanges();

        expect(c.apiFieldErrors().roomId).toContain('pasife alınmış');
        expect(c.submitError()).toBeNull();
    });

    it('tanımlar yüklenemezse bölüm alanında hata görünür, form yine de odasız kaydedilebilir', async () => {
        listWards.mockReturnValue(throwError(() => new Error('Yatış konumları yüklenemedi.')));
        const c = await setup();

        expect(c.wardsError()).toBe('Yatış konumları yüklenemedi.');
        fillRequired(c);
        c.onSubmit();
        expect(create).toHaveBeenCalledTimes(1);
    });
});
