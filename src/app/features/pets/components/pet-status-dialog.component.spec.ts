import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { PetDetailVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { PetStatusDialogComponent } from './pet-status-dialog.component';

const pet = { id: 'p1', name: 'Pamuk', status: 'Active', deceasedOn: null, rowVersion: 'rv1', birthDate: '2020-05-01' } as PetDetailVm;

describe('PetStatusDialogComponent', () => {
    let fixture: ComponentFixture<PetStatusDialogComponent>;
    let updatePetStatus: jasmine.Spy;

    const create = (p: PetDetailVm) => {
        TestBed.configureTestingModule({
            imports: [PetStatusDialogComponent],
            providers: [provideRouter([]), { provide: PetsService, useValue: { updatePetStatus } }]
        });
        fixture = TestBed.createComponent(PetStatusDialogComponent);
        fixture.componentRef.setInput('pet', p);
        fixture.componentInstance.visible.set(true);
        fixture.detectChanges();
        return fixture.componentInstance;
    };

    beforeEach(() => {
        updatePetStatus = jasmine.createSpy('updatePetStatus').and.returnValue(of({ status: 'Deceased', deceasedOn: '2026-01-02', rowVersion: 'rv2' }));
    });

    it('aktif hayvanı tarih ve rowVersion ile vefat olarak işaretler, sonucu yayar ve kapanır', () => {
        const c = create(pet);
        const changed = jasmine.createSpy('changed');
        c.changed.subscribe(changed);
        c.deceasedOn.setValue('2026-01-02');

        c.onSubmit();

        expect(updatePetStatus).toHaveBeenCalledWith('p1', { status: 'Deceased', deceasedOn: '2026-01-02', rowVersion: 'rv1' });
        expect(changed).toHaveBeenCalledWith({ status: 'Deceased', deceasedOn: '2026-01-02', rowVersion: 'rv2' });
        expect(c.visible()).toBeFalse();
    });

    it('tarih boşsa tarihsiz gönderir; gelecek veya doğumdan önceki tarih engellenir', () => {
        const c = create(pet);
        c.deceasedOn.setValue('2999-01-01');
        expect(c.dateError()).toContain('ileri');
        c.deceasedOn.setValue('2019-01-01');
        expect(c.dateError()).toContain('doğum');
        c.onSubmit();
        expect(updatePetStatus).not.toHaveBeenCalled();

        c.deceasedOn.setValue('');
        c.onSubmit();
        expect(updatePetStatus).toHaveBeenCalledWith('p1', { status: 'Deceased', deceasedOn: null, rowVersion: 'rv1' });
    });

    it('vefat eden hayvanda aktife alır (tarih gönderilmez)', () => {
        const c = create({ ...pet, status: 'Deceased', deceasedOn: '2026-01-02' });
        expect(c.markingDeceased()).toBeFalse();
        c.onSubmit();
        expect(updatePetStatus).toHaveBeenCalledWith('p1', { status: 'Active', deceasedOn: null, rowVersion: 'rv1' });
    });

    it('409 Pets.ConcurrencyConflict mesajı gösterir ve detay yenilemesi ister', () => {
        updatePetStatus.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Conflict', extensions: { code: 'Pets.ConcurrencyConflict' } } }))
        );
        const c = create(pet);
        const stale = jasmine.createSpy('stale');
        c.stale.subscribe(stale);

        c.onSubmit();

        expect(stale).toHaveBeenCalled();
        expect(c.submitError()).toContain('başka biri');
        expect(c.visible()).toBeTrue();
    });
});
