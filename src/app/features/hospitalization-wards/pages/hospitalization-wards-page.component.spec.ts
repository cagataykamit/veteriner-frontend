import type { Mock, MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import type { HospitalizationWardVm } from '@/app/features/hospitalization-wards/models/hospitalization-ward-vm.model';
import { HospitalizationWardsService } from '@/app/features/hospitalization-wards/services/hospitalization-wards.service';
import { HospitalizationWardError } from '@/app/features/hospitalization-wards/utils/hospitalization-ward-error.utils';
import { HospitalizationWardsPageComponent } from './hospitalization-wards-page.component';

const ward = (id: string, name: string, over: Partial<HospitalizationWardVm> = {}): HospitalizationWardVm => ({
    id,
    clinicId: 'k1',
    name,
    sortOrder: 1,
    isActive: true,
    rooms: [],
    ...over
});

describe('HospitalizationWardsPageComponent', () => {
    let fixture: ComponentFixture<HospitalizationWardsPageComponent>;
    let cmp: HospitalizationWardsPageComponent;
    let service: MockedObject<HospitalizationWardsService>;
    let clinics: {
        listClinics: Mock;
    };
    let claims: Set<string>;
    let blocked: boolean;

    const root = () => fixture.nativeElement as HTMLElement;
    const texts = (testId: string) => Array.from(root().querySelectorAll(`[data-testid="${testId}"]`)).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim());

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [HospitalizationWardsPageComponent],
            providers: [
                provideRouter([]),
                { provide: HospitalizationWardsService, useValue: service },
                { provide: ClinicsService, useValue: clinics },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati Kliniği' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(HospitalizationWardsPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['Clinics.Update', 'Clinics.Read']);
        blocked = false;
        service = {
            listWards: vi.fn().mockName('HospitalizationWardsService.listWards'),
            createWard: vi.fn().mockName('HospitalizationWardsService.createWard'),
            updateWard: vi.fn().mockName('HospitalizationWardsService.updateWard'),
            setWardActive: vi.fn().mockName('HospitalizationWardsService.setWardActive'),
            createRoom: vi.fn().mockName('HospitalizationWardsService.createRoom'),
            updateRoom: vi.fn().mockName('HospitalizationWardsService.updateRoom'),
            setRoomActive: vi.fn().mockName('HospitalizationWardsService.setRoomActive')
        } as unknown as MockedObject<HospitalizationWardsService>;
        service.listWards.mockReturnValue(
            of([
                ward('w1', 'Yoğun bakım', {
                    rooms: [
                        { id: 'r1', wardId: 'w1', name: 'Kafes 1', sortOrder: 1, isActive: true },
                        { id: 'r2', wardId: 'w1', name: 'Kafes 2', sortOrder: 2, isActive: false }
                    ]
                }),
                ward('w2', 'Eski servis', { sortOrder: 2, isActive: false })
            ])
        );
        clinics = {
            listClinics: vi
                .fn()
                .mockName('listClinics')
                .mockReturnValue(of([{ id: 'k1', name: 'Pati Kliniği', city: '', isActive: true, phone: '', email: '' }]))
        };
    });

    it('aktif kliniğin bölümlerini odalarıyla, pasifler dahil listeler; tek klinikte seçici çıkmaz', async () => {
        await create();
        expect(service.listWards).toHaveBeenCalledWith('k1');
        const wards = texts('ward-row');

        expect(wards.length).toBe(2);
        expect(wards[0]).toContain('Yoğun bakım');
        expect(wards[0]).toContain('Kafes 1');
        expect(wards[0]).toContain('Kafes 2');
        expect(wards[1]).toContain('Eski servis');
        expect(wards[1]).toContain('Pasif');
        expect(wards[1]).toContain('Etkinleştir');
        expect(texts('room-row')[1]).toContain('Pasif');
        expect(root().querySelector('[data-testid="wards-clinic"]')).toBeNull();
        expect(root().textContent).toContain('Klinik: Pati Kliniği');
    });

    it('birden çok klinikte seçici görünür ve klinik değişince liste o klinik için yeniden istenir', async () => {
        clinics.listClinics.mockReturnValue(
            of([
                { id: 'k1', name: 'Pati Kliniği', city: '', isActive: true, phone: '', email: '' },
                { id: 'k2', name: 'Şube', city: '', isActive: true, phone: '', email: '' },
                { id: 'k3', name: 'Kapalı', city: '', isActive: false, phone: '', email: '' }
            ])
        );
        await create();
        expect(root().querySelector('[data-testid="wards-clinic"]')).not.toBeNull();
        expect(cmp.clinicOptions().map((o) => o.value)).toEqual(['k1', 'k2']);
        cmp.onClinicChange('k2');
        expect(service.listWards).toHaveBeenCalledWith('k2');
    });

    it('Clinics.Update yoksa sayfa salt okunur: ekle ve satır işlemleri görünmez, açıklama çıkar', async () => {
        claims = new Set(['Hospitalizations.Read']);
        clinics.listClinics.mockReturnValue(throwError(() => new Error('yetki yok')));
        await create();
        expect(root().querySelector('[data-testid="ward-new"]')).toBeNull();
        expect(root().querySelector('[data-testid="wards-read-only"]')).not.toBeNull();
        expect(texts('ward-row').join(' ')).not.toMatch(/Düzenle|Pasife al|Etkinleştir|Oda ekle/);
        expect(texts('ward-row').length).toBe(2);
    });

    it('salt okunur kiracıda yazma kapalıdır', async () => {
        blocked = true;
        await create();
        expect(root().querySelector('[data-testid="ward-new"]')).toBeNull();
        expect(texts('ward-row').join(' ')).not.toMatch(/Düzenle|Pasife al|Etkinleştir|Oda ekle/);
    });

    it('yeni bölüm: sıra son bölümün bir fazlası önerilir, kayıt klinikle gider, liste yenilenir', async () => {
        service.createWard.mockReturnValue(of('w3'));
        await create();
        const before = vi.mocked(service.listWards).mock.calls.length;

        cmp.openWardCreate();
        expect(cmp.dialogForm.getRawValue().sortOrder).toBe(3);
        cmp.dialogForm.patchValue({ name: ' Kedi servisi ' });
        cmp.submitDialog();
        expect(service.createWard).toHaveBeenCalledWith('k1', { name: ' Kedi servisi ', sortOrder: 3 });
        expect(cmp.dialogVisible()).toBe(false);
        expect(vi.mocked(service.listWards).mock.calls.length).toBe(before + 1);
    });

    it('bölüme oda ekler ve odayı düzenler', async () => {
        service.createRoom.mockReturnValue(of('r9'));
        service.updateRoom.mockReturnValue(of({ id: 'r1', wardId: 'w1', name: 'Kafes 1A', sortOrder: 1, isActive: true }));
        await create();
        const [w1] = cmp.wards();

        cmp.openRoomCreate(w1);
        expect(cmp.dialogTitle()).toContain('yeni oda');
        cmp.dialogForm.patchValue({ name: 'Kafes 3' });
        cmp.submitDialog();
        expect(service.createRoom).toHaveBeenCalledWith('k1', 'w1', { name: 'Kafes 3', sortOrder: 3 });

        cmp.openRoomEdit(w1, w1.rooms[0]);
        expect(cmp.dialogForm.getRawValue()).toEqual({ name: 'Kafes 1', sortOrder: 1 });
        cmp.dialogForm.patchValue({ name: 'Kafes 1A' });
        cmp.submitDialog();
        expect(service.updateRoom).toHaveBeenCalledWith('k1', 'w1', 'r1', { name: 'Kafes 1A', sortOrder: 1 });
    });

    it('mükerrer ad hatası pencerede kalır; bulunamadı hatasında pencere kapanır ve liste yenilenir', async () => {
        service.createWard.mockReturnValue(throwError(() => new HospitalizationWardError('Bu adda aktif bir bölüm zaten var.', 'HospitalizationWards.DuplicateName', true, false)));
        await create();
        cmp.openWardCreate();
        cmp.dialogForm.patchValue({ name: 'Yoğun bakım' });
        cmp.submitDialog();
        expect(cmp.dialogVisible()).toBe(true);
        expect(cmp.dialogError()).toBe('Bu adda aktif bir bölüm zaten var.');

        service.updateWard.mockReturnValue(throwError(() => new HospitalizationWardError('Bölüm bulunamadı.', 'HospitalizationWards.NotFound', false, true)));
        const before = vi.mocked(service.listWards).mock.calls.length;

        cmp.openWardEdit(cmp.wards()[0]);
        cmp.submitDialog();
        expect(cmp.dialogVisible()).toBe(false);
        expect(cmp.listActionError()).toBe('Bölüm bulunamadı.');
        expect(vi.mocked(service.listWards).mock.calls.length).toBe(before + 1);
    });

    it('oda pasife alınır ve bölüm etkinleştirilir; sonuçta liste yenilenir', async () => {
        service.setRoomActive.mockReturnValue(of({ id: 'r1', wardId: 'w1', name: 'Kafes 1', sortOrder: 1, isActive: false }));
        service.setWardActive.mockReturnValue(of(ward('w2', 'Eski servis')));
        await create();
        const [w1, w2] = cmp.wards();
        const before = vi.mocked(service.listWards).mock.calls.length;

        cmp.setRoomActive(w1, w1.rooms[0], false);
        expect(service.setRoomActive).toHaveBeenCalledWith('k1', 'w1', 'r1', false);
        cmp.setWardActive(w2, true);
        expect(service.setWardActive).toHaveBeenCalledWith('k1', 'w2', true);
        expect(cmp.mutating()).toBe(false);
        expect(vi.mocked(service.listWards).mock.calls.length).toBe(before + 2);
    });

    it('yetkisiz kullanıcı pencere açamaz ve durum değiştiremez', async () => {
        claims = new Set(['Hospitalizations.Read']);
        await create();
        cmp.openWardCreate();
        expect(cmp.dialogVisible()).toBe(false);
        cmp.setWardActive(cmp.wards()[0], false);
        expect(service.setWardActive).not.toHaveBeenCalled();
    });
});
