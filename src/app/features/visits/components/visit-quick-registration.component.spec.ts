import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { VisitQuickRegistrationComponent } from './visit-quick-registration.component';

const httpError = (status: number, body: unknown) => new HttpErrorResponse({ status, error: body });

describe('VisitQuickRegistrationComponent', () => {
    let fixture: ComponentFixture<VisitQuickRegistrationComponent>;
    let cmp: VisitQuickRegistrationComponent;
    let clients: jasmine.SpyObj<ClientsService>;
    let pets: jasmine.SpyObj<PetsService>;
    let registered: PetSuggestion[];
    let cancelled: number;

    const create = (inputs: { searchTerm?: string; existingOwner?: { id: string; name: string } | null } = {}) => {
        fixture = TestBed.createComponent(VisitQuickRegistrationComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('searchTerm', inputs.searchTerm ?? '');
        fixture.componentRef.setInput('existingOwner', inputs.existingOwner ?? null);
        registered = [];
        cancelled = 0;
        cmp.registered.subscribe((p) => registered.push(p));
        cmp.cancelled.subscribe(() => cancelled++);
        fixture.detectChanges();
    };

    const fillValid = () => {
        cmp.clientForm.patchValue({ fullName: 'Ayşe Yılmaz', phone: '0532 123 45 67' });
        cmp.petForm.patchValue({ name: 'Pamuk', speciesId: 's1' });
    };

    beforeEach(() => {
        clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['quickRegister']);
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['createPet']);
        clients.quickRegister.and.returnValue(of({ clientId: 'c-new', petId: 'p-new' }));
        pets.createPet.and.returnValue(of({ id: 'p-new' }));
        TestBed.configureTestingModule({
            imports: [VisitQuickRegistrationComponent],
            providers: [
                { provide: ClientsService, useValue: clients },
                { provide: PetsService, useValue: pets },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([{ id: 's1', name: 'Kedi' }]) } }
            ]
        });
    });

    it('aranan metin telefon biçimindeyse telefona yazılır', () => {
        create({ searchTerm: '0532 123 45 67' });
        expect(cmp.clientForm.controls.phone.value).toBe('0532 123 45 67');
        expect(cmp.clientForm.controls.fullName.value).toBe('');
    });

    it('aranan ad metni sahip adına yazılır', () => {
        create({ searchTerm: 'Ayşe Yılmaz' });
        expect(cmp.clientForm.controls.fullName.value).toBe('Ayşe Yılmaz');
        expect(cmp.clientForm.controls.phone.value).toBe('');
    });

    it('telefon zorunludur; mevcut müşteri doğrulama kuralları (ad en az 2 karakter, telefon biçimi) geçerlidir', () => {
        create();
        cmp.petForm.patchValue({ name: 'Pamuk', speciesId: 's1' });
        cmp.clientForm.patchValue({ fullName: 'Ayşe Yılmaz', phone: '' });
        expect(cmp.canSubmit()).toBeFalse();
        cmp.clientForm.patchValue({ phone: '123' });
        expect(cmp.canSubmit()).toBeFalse();
        cmp.clientForm.patchValue({ fullName: 'A', phone: '0532 123 45 67' });
        expect(cmp.canSubmit()).toBeFalse();
        cmp.clientForm.patchValue({ fullName: 'Ayşe Yılmaz' });
        expect(cmp.canSubmit()).toBeTrue();
    });

    it('hayvan adı ve tür zorunludur', () => {
        create();
        cmp.clientForm.patchValue({ fullName: 'Ayşe Yılmaz', phone: '0532 123 45 67' });
        expect(cmp.canSubmit()).toBeFalse();
        cmp.petForm.patchValue({ name: 'Pamuk' });
        expect(cmp.canSubmit()).toBeFalse();
        cmp.petForm.patchValue({ speciesId: 's1' });
        expect(cmp.canSubmit()).toBeTrue();
    });

    it('yeni müşteri: tek quick-register çağrısı; müşteri ve hayvan ayrı ayrı oluşturulmaz; sahip adlı etiket yayılır', () => {
        create();
        fillValid();
        cmp.petForm.patchValue({ microchipNumber: '985121001234567' });
        cmp.submit();

        expect(clients.quickRegister).toHaveBeenCalledOnceWith({
            fullName: 'Ayşe Yılmaz',
            phone: '0532 123 45 67',
            petName: 'Pamuk',
            speciesId: 's1',
            microchipNumber: '985121001234567'
        });
        expect(pets.createPet).not.toHaveBeenCalled();
        expect(registered).toEqual([{ id: 'p-new', label: 'Pamuk — Kedi · Sahip: Ayşe Yılmaz', clientId: 'c-new', clientName: 'Ayşe Yılmaz' }]);
    });

    it('çift tıklama: yanıt gelmeden ikinci gönderim ikinci istek üretmez', () => {
        clients.quickRegister.and.returnValue(new Subject());
        create();
        fillValid();
        cmp.submit();
        cmp.submit();
        expect(clients.quickRegister).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBeTrue();
    });

    it('409 Clients.DuplicateClient: mesaj aramadan seçmeye yönlendirir, düğme "Aramaya dön" olur', () => {
        clients.quickRegister.and.returnValue(
            throwError(() => httpError(409, { status: 409, extensions: { code: 'Clients.DuplicateClient' } }))
        );
        create();
        fillValid();
        cmp.submit();

        expect(cmp.duplicateClient()).toBeTrue();
        expect(cmp.stepError()).toBe('Bu ad ve telefonla kayıtlı müşteri var. Aramada müşteriyi bulup seçin.');
        expect(cmp.submitting()).toBeFalse();
        expect(registered.length).toBe(0);
    });

    it('400 alan hatası: sunucu mesajı gösterilir, form değerleri korunur, tekrar denenebilir', () => {
        clients.quickRegister.and.returnValue(throwError(() => httpError(400, { status: 400, errors: { phone: ['Telefon geçersiz.'] } })));
        create();
        fillValid();
        cmp.submit();

        expect(cmp.stepError()).toBeTruthy();
        expect(cmp.duplicateClient()).toBeFalse();
        expect(cmp.clientForm.controls.fullName.value).toBe('Ayşe Yılmaz');
        expect(cmp.submitting()).toBeFalse();
    });

    it('403 ve 404 hatası mesaj gösterir, kayıt yayılmaz', () => {
        clients.quickRegister.and.returnValue(throwError(() => httpError(403, null)));
        create();
        fillValid();
        cmp.submit();
        expect(cmp.stepError()).toBe('Bu işlem için yetkiniz yok.');

        clients.quickRegister.and.returnValue(throwError(() => httpError(404, { status: 404, extensions: { code: 'Pets.SpeciesNotFound' }, detail: 'Tür bulunamadı.' })));
        cmp.submit();
        expect(cmp.stepError()).toContain('Tür bulunamadı');
        expect(registered.length).toBe(0);
    });

    it('"Aramaya dön" iptal olayını yayar', () => {
        create();
        cmp.cancelled.emit();
        expect(cancelled).toBe(1);
    });

    it('kayıtlı sahibe hayvan ekleme: quick-register çağrılmaz, POST /pets sahip kimliğiyle gider', () => {
        create({ existingOwner: { id: 'c-old', name: 'Veli Kaya' } });
        cmp.petForm.patchValue({ name: 'Pamuk', speciesId: 's1' });
        expect(cmp.canSubmit()).toBeTrue();
        cmp.submit();

        expect(clients.quickRegister).not.toHaveBeenCalled();
        expect(pets.createPet.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ clientId: 'c-old', name: 'Pamuk', speciesId: 's1' }));
        expect(registered[0]).toEqual({ id: 'p-new', label: 'Pamuk — Kedi · Sahip: Veli Kaya', clientId: 'c-old', clientName: 'Veli Kaya' });
    });

    it('kayıtlı sahibe hayvan eklerken hata mesajı gösterilir', () => {
        pets.createPet.and.returnValue(throwError(() => httpError(400, { status: 400, errors: { name: ['Hayvan adı geçersiz.'] } })));
        create({ existingOwner: { id: 'c-old', name: 'Veli Kaya' } });
        cmp.petForm.patchValue({ name: 'Pamuk', speciesId: 's1' });
        cmp.submit();

        expect(cmp.stepError()).toBeTruthy();
        expect(registered.length).toBe(0);
    });
});
