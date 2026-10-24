import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { ExampleClinicLoadSummaryDto } from '@/app/features/example-clinic/models/example-clinic-api.model';
import { EXAMPLE_CLINIC_ALREADY_LOADED_CODE, ExampleClinicLoadError, ExampleClinicService } from '@/app/features/example-clinic/services/example-clinic.service';
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

describe('ExampleClinicLoadCardComponent (TRIAL-002)', () => {
    let service: jasmine.SpyObj<ExampleClinicService>;
    let messages: jasmine.SpyObj<MessageService>;

    const create = async (canManage: boolean, trialing: boolean): Promise<ComponentFixture<ExampleClinicLoadCardComponent>> => {
        service = jasmine.createSpyObj<ExampleClinicService>('ExampleClinicService', ['load']);
        messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
        await TestBed.configureTestingModule({
            imports: [ExampleClinicLoadCardComponent],
            providers: [provideRouter([]), { provide: ExampleClinicService, useValue: service }, { provide: MessageService, useValue: messages }]
        }).compileComponents();
        const fixture = TestBed.createComponent(ExampleClinicLoadCardComponent);

        fixture.componentRef.setInput('canManage', canManage);
        fixture.componentRef.setInput('trialing', trialing);
        fixture.detectChanges();

        return fixture;
    };

    const host = (f: ComponentFixture<ExampleClinicLoadCardComponent>) => f.nativeElement as HTMLElement;
    const loadButton = (f: ComponentFixture<ExampleClinicLoadCardComponent>) => host(f).querySelector<HTMLButtonElement>('[data-testid="example-clinic-load-button"] button, button[data-testid="example-clinic-load-button"]');

    it('deneme + yönetme yetkisinde yükle düğmesini gösterir', async () => {
        const f = await create(true, true);

        expect(host(f).querySelector('[data-testid="example-clinic-load-card"]')).not.toBeNull();
        expect(host(f).textContent).toContain('Örnek Veteriner Kliniğini yükle');
        expect(host(f).textContent).toContain('sentetik');
        expect(host(f).classList).not.toContain('hidden');
    });

    it('deneme dışında ya da yetki yoksa hiçbir şey göstermez ve gizlenir', async () => {
        const f = await create(true, false);

        expect(host(f).textContent?.trim()).toBe('');
        expect(host(f).classList).toContain('hidden');

        TestBed.resetTestingModule();
        const noManage = await create(false, true);

        expect(host(noManage).textContent?.trim()).toBe('');
    });

    it('başarıda özet sayaçlarını, Bugün bağlantısını ve toast gösterir', async () => {
        const f = await create(true, true);

        service.load.and.returnValue(of(SUMMARY));
        f.componentInstance.load();
        f.detectChanges();

        expect(service.load).toHaveBeenCalledTimes(1);
        expect(host(f).querySelector('[data-testid="example-clinic-loaded"]')).not.toBeNull();
        expect(host(f).querySelector('[data-testid="example-clinic-count-clients"]')?.textContent).toContain('12');
        expect(host(f).querySelector('[data-testid="example-clinic-count-pets"]')?.textContent).toContain('20');
        expect(host(f).querySelector('a[href="/panel/today"]')).not.toBeNull();
        expect(loadButton(f)).toBeNull();
        expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: '12 müşteri, 20 hasta, 38 randevu' }));
    });

    it('409 AlreadyLoaded: mesajı gösterir ve düğmeyi gizler', async () => {
        const f = await create(true, true);

        service.load.and.returnValue(throwError(() => new ExampleClinicLoadError('Kurumunuzda zaten müşteri ya da hasta kaydı var; örnek klinik yalnız boş kuruma yüklenebilir.', EXAMPLE_CLINIC_ALREADY_LOADED_CODE)));
        f.componentInstance.load();
        f.detectChanges();

        expect(host(f).querySelector('[data-testid="example-clinic-error"]')?.textContent).toContain('zaten müşteri ya da hasta kaydı var');
        expect(f.componentInstance.blocked()).toBeTrue();
        expect(loadButton(f)).toBeNull();
        expect(messages.add).not.toHaveBeenCalled();
    });

    it('diğer hatalarda mesajı gösterir, düğme kalır', async () => {
        const f = await create(true, true);

        service.load.and.returnValue(throwError(() => new ExampleClinicLoadError('Bu kuruma erişim yetkiniz bulunmuyor.', 'Tenants.AccessDenied')));
        f.componentInstance.load();
        f.detectChanges();

        expect(host(f).querySelector('[data-testid="example-clinic-error"]')?.textContent).toContain('erişim yetkiniz');
        expect(f.componentInstance.blocked()).toBeFalse();
        expect(loadButton(f)).not.toBeNull();
    });
});
