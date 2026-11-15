import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { ClientNewPageComponent } from './client-new-page.component';

describe('ClientNewPageComponent kaydedilmemiş değişiklik (O2)', () => {
    let fixture: ComponentFixture<ClientNewPageComponent>;
    let cmp: ClientNewPageComponent;
    let clients: { createClient: ReturnType<typeof vi.fn> };
    let router: Router;

    const el = () => fixture.nativeElement as HTMLElement;

    const type = (id: string, value: string) => {
        const input = el().querySelector(`#${id}`) as HTMLInputElement;

        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    const render = () => {
        clients = { createClient: vi.fn() };
        TestBed.configureTestingModule({
            imports: [ClientNewPageComponent],
            providers: [provideRouter([]), { provide: ClientsService, useValue: clients }]
        });
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(ClientNewPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    };

    afterEach(() => fixture?.destroy());

    it('boş açılan form temizdir', () => {
        render();

        expect(cmp.hasUnsavedChanges()).toBe(false);
    });

    it('alana yazılınca kaydedilmemiş değişiklik var sayılır', () => {
        render();
        type('fullName', 'Ayşe Yılmaz');

        expect(cmp.hasUnsavedChanges()).toBe(true);
    });

    it('fatura bölümündeki değişiklik de sayılır', () => {
        render();
        cmp.invoicingForm.markAsDirty();

        expect(cmp.hasUnsavedChanges()).toBe(true);
    });

    it('kayıt başarılıysa yönlenmeden önce temiz sayılır', () => {
        render();
        clients.createClient.mockReturnValue(of({ id: 'c9' }));
        let dirtyAtNavigate: boolean | undefined;

        vi.mocked(router.navigate).mockImplementation(() => {
            dirtyAtNavigate = cmp.hasUnsavedChanges();

            return Promise.resolve(true);
        });
        type('fullName', 'Ayşe Yılmaz');
        type('phone', '0532 111 22 33');
        cmp.onSubmit();

        expect(router.navigate).toHaveBeenCalledWith(['/panel/clients', 'c9'], { queryParams: { saved: '1' } });
        expect(dirtyAtNavigate).toBe(false);
    });

    it('kayıt hatasında değişiklik korunur', () => {
        render();
        clients.createClient.mockReturnValue(throwError(() => new Error('Sunucu hatası')));
        type('fullName', 'Ayşe Yılmaz');
        type('phone', '0532 111 22 33');
        cmp.onSubmit();

        expect(router.navigate).not.toHaveBeenCalled();
        expect(cmp.hasUnsavedChanges()).toBe(true);
    });
});
