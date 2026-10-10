import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { VisitQuickRegistrationComponent } from './visit-quick-registration.component';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const validationError = (field: string, message: string) =>
    new HttpErrorResponse({ status: 400, error: { status: 400, errors: { [field]: [message] } } });

describe('VisitQuickRegistrationComponent', () => {
    let fixture: ComponentFixture<VisitQuickRegistrationComponent>;
    let cmp: VisitQuickRegistrationComponent;
    let clients: jasmine.SpyObj<ClientsService>;
    let pets: jasmine.SpyObj<PetsService>;
    let registered: PetSuggestion[];

    const create = (inputs: { searchTerm?: string; existingOwner?: { id: string; name: string } | null } = {}) => {
        fixture = TestBed.createComponent(VisitQuickRegistrationComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('searchTerm', inputs.searchTerm ?? '');
        fixture.componentRef.setInput('existingOwner', inputs.existingOwner ?? null);
        registered = [];
        cmp.registered.subscribe((p) => registered.push(p));
        fixture.detectChanges();
    };

    const fillValid = () => {
        cmp.clientForm.patchValue({ fullName: 'Ayşe Yılmaz', phone: '0532 123 45 67' });
        cmp.petForm.patchValue({ name: 'Pamuk', speciesId: 's1' });
    };

    beforeEach(() => {
        clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['createClient', 'getClients']);
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['createPet']);
        clients.getClients.and.returnValue(of({ items: [], page: 1, pageSize: 5, totalItems: 0, totalPages: 0 }));
        clients.createClient.and.returnValue(of({ id: 'c-new' }));
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

    it('aranan metin telefon biçimindeyse telefona, aksi halde sahip adına yazılır', () => {
        create({ searchTerm: '0532 123 45 67' });
        expect(cmp.clientForm.controls.phone.value).toBe('0532 123 45 67');
        expect(cmp.clientForm.controls.fullName.value).toBe('');
        TestBed.resetTestingModule();
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

    it('müşteri sonra hayvan sırayla oluşturulur; hayvan yeni müşteri kimliğiyle gider ve sahip adlı etiket yayılır', () => {
        create();
        fillValid();
        cmp.petForm.patchValue({ microchipNumber: '985121001234567' });
        cmp.submit();

        expect(clients.createClient).toHaveBeenCalledOnceWith(jasmine.objectContaining({ fullName: 'Ayşe Yılmaz', phone: '0532 123 45 67' }));
        const petPayload = pets.createPet.calls.mostRecent().args[0];
        expect(petPayload).toEqual(jasmine.objectContaining({ clientId: 'c-new', name: 'Pamuk', speciesId: 's1', microchipNumber: '985121001234567' }));
        expect(registered).toEqual([{ id: 'p-new', label: 'Pamuk — Kedi · Sahip: Ayşe Yılmaz', clientId: 'c-new', clientName: 'Ayşe Yılmaz' }]);
    });

    it('çift tıklama: yanıt gelmeden ikinci gönderim ikinci müşteri oluşturmaz', () => {
        const pending = new Subject<{ id: string }>();
        clients.createClient.and.returnValue(pending);
        create();
        fillValid();
        cmp.submit();
        cmp.submit();
        expect(clients.createClient).toHaveBeenCalledTimes(1);
    });

    it('yarım kayıt: müşteri oluşup hayvan hata verirse mesaj adımı söyler; yeniden denemede ikinci müşteri oluşmaz', () => {
        pets.createPet.and.returnValue(throwError(() => validationError('name', 'Hayvan adı geçersiz.')));
        create();
        fillValid();
        cmp.submit();

        expect(clients.createClient).toHaveBeenCalledTimes(1);
        expect(cmp.createdClientId()).toBe('c-new');
        expect(cmp.stepError()).toContain('Müşteri kaydedildi');
        expect(cmp.stepError()).toContain('hayvan kaydedilemedi');
        expect(registered.length).toBe(0);
        expect(cmp.submitting()).toBeFalse();

        pets.createPet.and.returnValue(of({ id: 'p-new' }));
        cmp.submit();

        expect(clients.createClient).toHaveBeenCalledTimes(1);
        expect(pets.createPet).toHaveBeenCalledTimes(2);
        expect(pets.createPet.calls.mostRecent().args[0].clientId).toBe('c-new');
        expect(registered[0].clientId).toBe('c-new');
    });

    it('müşteri adımı hata verirse mesaj adımı söyler ve hayvan oluşturulmaz', () => {
        clients.createClient.and.returnValue(throwError(() => validationError('phone', 'Telefon geçersiz.')));
        create();
        fillValid();
        cmp.submit();

        expect(cmp.stepError()).toContain('Müşteri kaydedilemedi');
        expect(pets.createPet).not.toHaveBeenCalled();
        expect(cmp.createdClientId()).toBeNull();
    });

    it('kayıtlı sahibe hayvan ekleme: müşteri oluşturulmaz, sahip kimliği kullanılır', () => {
        create({ existingOwner: { id: 'c-old', name: 'Veli Kaya' } });
        cmp.petForm.patchValue({ name: 'Pamuk', speciesId: 's1' });
        expect(cmp.canSubmit()).toBeTrue();
        cmp.submit();

        expect(clients.createClient).not.toHaveBeenCalled();
        expect(pets.createPet.calls.mostRecent().args[0].clientId).toBe('c-old');
        expect(registered[0].clientName).toBe('Veli Kaya');
    });

    describe('çift kayıt uyarısı', () => {
        const existing = { id: 'c-old', fullName: 'Veli Kaya', phone: '+90 532 123 45 67', email: '', createdAtUtc: null };

        it('aynı telefonlu müşteri varsa uyarır; onay verilmeden gönderilemez, onayla gönderilir', async () => {
            clients.getClients.and.returnValue(of({ items: [existing], page: 1, pageSize: 5, totalItems: 1, totalPages: 1 }));
            create();
            fillValid();
            await wait(500);

            expect(clients.getClients).toHaveBeenCalledWith(jasmine.objectContaining({ search: '0532 123 45 67' }));
            expect(cmp.duplicates().map((d) => d.fullName)).toEqual(['Veli Kaya']);
            expect(cmp.canSubmit()).toBeFalse();

            cmp.confirmDuplicate.set(true);
            expect(cmp.canSubmit()).toBeTrue();
        });

        it('aynı olmayan numaralı (alt dizi eşleşmesi) sonuçlar uyarı üretmez', async () => {
            clients.getClients.and.returnValue(of({ items: [{ ...existing, phone: '0532 123 45 68' }], page: 1, pageSize: 5, totalItems: 1, totalPages: 1 }));
            create();
            fillValid();
            await wait(500);

            expect(cmp.duplicates()).toEqual([]);
            expect(cmp.canSubmit()).toBeTrue();
        });

        it('"Onu seç": mevcut müşteri sahip olur, yeni müşteri oluşturulmaz', async () => {
            clients.getClients.and.returnValue(of({ items: [existing], page: 1, pageSize: 5, totalItems: 1, totalPages: 1 }));
            create();
            fillValid();
            await wait(500);
            cmp.useExisting(cmp.duplicates()[0]);
            cmp.submit();

            expect(clients.createClient).not.toHaveBeenCalled();
            expect(pets.createPet.calls.mostRecent().args[0].clientId).toBe('c-old');
            expect(cmp.duplicates()).toEqual([]);
        });

        it('arama hatası kaydı engellemez', async () => {
            clients.getClients.and.returnValue(throwError(() => new Error('x')));
            create();
            fillValid();
            await wait(500);

            expect(cmp.duplicates()).toEqual([]);
            expect(cmp.canSubmit()).toBeTrue();
        });
    });
});
