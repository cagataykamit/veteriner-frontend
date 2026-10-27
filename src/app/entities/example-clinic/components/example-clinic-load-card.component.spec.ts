import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { ExampleClinicDataCountsDto, ExampleClinicLoadSummaryDto, ExampleClinicStatusDto } from '@/app/entities/example-clinic/models/example-clinic-api.model';
import { EXAMPLE_CLINIC_ALREADY_LOADED_CODE, EXAMPLE_CLINIC_NOT_LOADED_CODE, ExampleClinicError, ExampleClinicService } from '@/app/entities/example-clinic/services/example-clinic.service';
import { ExampleClinicLoadCardComponent } from './example-clinic-load-card.component';

const SUMMARY: ExampleClinicLoadSummaryDto = {
    tenantId: 't1',
    clinicId: 'c1',
    clients: 12,
    pets: 20,
    appointments: 38,
    examinations: 26,
    vaccinations: 14,
    treatments: 9,
    labResults: 5,
    charges: 48,
    payments: 19,
    products: 10,
    stockMovements: 29
};

const COUNTS: ExampleClinicDataCountsDto = {
    clients: 12,
    pets: 20,
    appointments: 38,
    examinations: 27,
    vaccinations: 14,
    treatments: 9,
    labResults: 5,
    charges: 48,
    payments: 19,
    products: 9,
    productsDeactivated: 1,
    stockMovements: 27,
    otherRecords: 2
};

const EMPTY_COUNTS: ExampleClinicDataCountsDto = {
    clients: 0,
    pets: 0,
    appointments: 0,
    examinations: 0,
    vaccinations: 0,
    treatments: 0,
    labResults: 0,
    charges: 0,
    payments: 0,
    products: 0,
    productsDeactivated: 0,
    stockMovements: 0,
    otherRecords: 0
};

const NO_DATA: ExampleClinicStatusDto = { hasExampleData: false, counts: EMPTY_COUNTS };
const HAS_DATA: ExampleClinicStatusDto = { hasExampleData: true, counts: COUNTS };

describe('ExampleClinicLoadCardComponent (TRIAL-002, örnek veri temizliği)', () => {
    let service: MockedObject<ExampleClinicService>;
    let messages: MockedObject<MessageService>;

    const create = async (canManage: boolean, trialing: boolean, status: ExampleClinicStatusDto | Error = NO_DATA, writable = true): Promise<ComponentFixture<ExampleClinicLoadCardComponent>> => {
        service = {
            load: vi.fn().mockName('ExampleClinicService.load'),
            getStatus: vi.fn().mockName('ExampleClinicService.getStatus'),
            clear: vi.fn().mockName('ExampleClinicService.clear')
        } as unknown as MockedObject<ExampleClinicService>;
        service.getStatus.mockReturnValue(status instanceof Error ? throwError(() => status) : of(status));
        messages = {
            add: vi.fn().mockName('MessageService.add')
        } as unknown as MockedObject<MessageService>;
        await TestBed.configureTestingModule({
            imports: [ExampleClinicLoadCardComponent],
            providers: [provideRouter([]), { provide: ExampleClinicService, useValue: service }, { provide: MessageService, useValue: messages }]
        }).compileComponents();
        const fixture = TestBed.createComponent(ExampleClinicLoadCardComponent);

        fixture.componentRef.setInput('canManage', canManage);
        fixture.componentRef.setInput('trialing', trialing);
        fixture.componentRef.setInput('writable', writable);
        fixture.detectChanges();
        // Durum effect içinde okunur; sonucu şablona yansıt.
        fixture.detectChanges();

        return fixture;
    };

    const host = (f: ComponentFixture<ExampleClinicLoadCardComponent>) => f.nativeElement as HTMLElement;
    const loadButton = (f: ComponentFixture<ExampleClinicLoadCardComponent>) => host(f).querySelector<HTMLButtonElement>('button[data-testid="example-clinic-load-button"]');
    const clearButton = (f: ComponentFixture<ExampleClinicLoadCardComponent>) => host(f).querySelector('[data-testid="example-clinic-clear-button"]');

    it('deneme + yönetme yetkisinde yükle düğmesini gösterir', async () => {
        const f = await create(true, true);

        expect(host(f).querySelector('[data-testid="example-clinic-load-card"]')).not.toBeNull();
        expect(host(f).textContent).toContain('Örnek Veteriner Kliniğini yükle');
        expect(host(f).textContent).toContain('sentetik');
        expect(host(f).classList).not.toContain('hidden');
        expect(clearButton(f)).toBeNull();
    });

    it('deneme dışında örnek veri yoksa ya da yetki yoksa hiçbir şey göstermez ve gizlenir', async () => {
        const f = await create(true, false);

        expect(host(f).textContent?.trim()).toBe('');
        expect(host(f).classList).toContain('hidden');

        TestBed.resetTestingModule();
        const noManage = await create(false, true, HAS_DATA);

        expect(host(noManage).textContent?.trim()).toBe('');
        expect(service.getStatus).not.toHaveBeenCalled();
    });

    it('başarıda özet sayaçlarını, Bugün bağlantısını ve toast gösterir', async () => {
        const f = await create(true, true);

        service.load.mockReturnValue(of(SUMMARY));
        f.componentInstance.load();
        f.detectChanges();

        expect(service.load).toHaveBeenCalledTimes(1);
        expect(host(f).querySelector('[data-testid="example-clinic-loaded"]')).not.toBeNull();
        expect(host(f).querySelector('[data-testid="example-clinic-count-clients"]')?.textContent).toContain('12');
        expect(host(f).querySelector('[data-testid="example-clinic-count-pets"]')?.textContent).toContain('20');
        expect(host(f).querySelector('a[href="/panel/today"]')).not.toBeNull();
        expect(loadButton(f)).toBeNull();
        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: '12 müşteri, 20 hasta, 38 randevu' }));
        // Yüklemeden sonra durum yenilenir (temizlik eylemi sonraki açılışta hazır olsun).
        expect(service.getStatus).toHaveBeenCalledTimes(2);
    });

    it('409 AlreadyLoaded: mesajı gösterir ve düğmeyi gizler', async () => {
        const f = await create(true, true);

        service.load.mockReturnValue(throwError(() => new ExampleClinicError('Kurumunuzda zaten müşteri ya da hasta kaydı var; örnek klinik yalnız boş kuruma yüklenebilir.', EXAMPLE_CLINIC_ALREADY_LOADED_CODE)));
        f.componentInstance.load();
        f.detectChanges();

        expect(host(f).querySelector('[data-testid="example-clinic-error"]')?.textContent).toContain('zaten müşteri ya da hasta kaydı var');
        expect(f.componentInstance.blocked()).toBe(true);
        expect(loadButton(f)).toBeNull();
        expect(messages.add).not.toHaveBeenCalled();
    });

    it('diğer hatalarda mesajı gösterir, düğme kalır', async () => {
        const f = await create(true, true);

        service.load.mockReturnValue(throwError(() => new ExampleClinicError('Bu kuruma erişim yetkiniz bulunmuyor.', 'Tenants.AccessDenied')));
        f.componentInstance.load();
        f.detectChanges();

        expect(host(f).querySelector('[data-testid="example-clinic-error"]')?.textContent).toContain('erişim yetkiniz');
        expect(f.componentInstance.blocked()).toBe(false);
        expect(loadButton(f)).not.toBeNull();
    });

    it('örnek veri varsa (ücretli abonelikte de) sayıları ve temizle düğmesini gösterir, yükle düğmesi yok', async () => {
        const f = await create(true, false, HAS_DATA);

        expect(host(f).classList).not.toContain('hidden');
        expect(host(f).querySelector('[data-testid="example-clinic-present"]')).not.toBeNull();
        expect(host(f).querySelector('[data-testid="example-clinic-count-examinations"]')?.textContent).toContain('27');
        expect(clearButton(f)).not.toBeNull();
        expect(loadButton(f)).toBeNull();
    });

    it('onay diyaloğu uyarıları ve pasife alınacak ürünü gösterir; onayda temizler ve sonucu gösterir', async () => {
        const f = await create(true, true, HAS_DATA);

        f.componentInstance.openClearConfirm();
        f.detectChanges();

        const notes = document.querySelector('[data-testid="example-clinic-clear-notes"]');

        expect(notes?.textContent).toContain('sonradan eklediğiniz muayene, ödeme');
        expect(notes?.textContent).toContain('2 kayıt daha');
        expect(document.querySelector('[data-testid="example-clinic-clear-deactivated"]')?.textContent).toContain('1 örnek ürün');

        service.clear.mockReturnValue(of(COUNTS));
        f.componentInstance.clear();
        f.detectChanges();

        expect(service.clear).toHaveBeenCalledTimes(1);
        expect(f.componentInstance.clearConfirmVisible()).toBe(false);
        expect(host(f).querySelector('[data-testid="example-clinic-cleared"]')).not.toBeNull();
        expect(host(f).textContent).toContain('pasife alındı');
        expect(clearButton(f)).toBeNull();
        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Örnek veriler silindi' }));
    });

    it('409 NotLoaded: diyalog kapanır, durum yenilenir ve bilgi verilir', async () => {
        const f = await create(true, false, HAS_DATA);

        f.componentInstance.openClearConfirm();
        service.clear.mockReturnValue(throwError(() => new ExampleClinicError('Kurumunuzda temizlenecek örnek veri kalmamış.', EXAMPLE_CLINIC_NOT_LOADED_CODE)));
        service.getStatus.mockReturnValue(of(NO_DATA));
        f.componentInstance.clear();
        f.detectChanges();

        expect(f.componentInstance.clearConfirmVisible()).toBe(false);
        expect(service.getStatus).toHaveBeenCalledTimes(2);
        expect(host(f).classList).toContain('hidden');
        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'info' }));
    });

    it('diğer temizlik hatalarında diyalog açık kalır ve hata gösterilir', async () => {
        const f = await create(true, false, HAS_DATA);

        f.componentInstance.openClearConfirm();
        service.clear.mockReturnValue(throwError(() => new ExampleClinicError('Aboneliğiniz salt okunur modda; örnek veri temizlenemez.', 'Subscriptions.TenantReadOnly')));
        f.componentInstance.clear();
        f.detectChanges();

        expect(f.componentInstance.clearConfirmVisible()).toBe(true);
        expect(f.componentInstance.clearError()).toContain('salt okunur');
        expect(document.querySelector('[data-testid="example-clinic-clear-error"]')?.textContent).toContain('salt okunur');
        expect(clearButton(f)).not.toBeNull();
    });

    it('salt okunur kiracıda durumu okumaz ve temizlik sunmaz', async () => {
        const f = await create(true, false, HAS_DATA, false);

        expect(service.getStatus).not.toHaveBeenCalled();
        expect(host(f).classList).toContain('hidden');
    });

    it('durum okunamazsa denemede yalnız yükleme eylemi kalır, hata gösterilmez', async () => {
        const f = await create(true, true, new ExampleClinicError('Örnek klinik durumu okunamadı.', null));

        expect(f.componentInstance.status()).toBeNull();
        expect(loadButton(f)).not.toBeNull();
        expect(host(f).querySelector('[data-testid="example-clinic-error"]')).toBeNull();
    });
});
