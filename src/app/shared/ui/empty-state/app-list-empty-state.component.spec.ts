import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppListEmptyStateComponent } from './app-list-empty-state.component';

describe('AppListEmptyStateComponent (H5)', () => {
    const create = (inputs: { filtered: boolean; createLabel?: string | null; createLink?: string | null }) => {
        TestBed.configureTestingModule({ imports: [AppListEmptyStateComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(AppListEmptyStateComponent);

        fixture.componentRef.setInput('filtered', inputs.filtered);
        fixture.componentRef.setInput('emptyMessage', 'Henüz randevu yok.');
        fixture.componentRef.setInput('createLabel', inputs.createLabel ?? null);
        fixture.componentRef.setInput('createLink', inputs.createLink ?? null);
        fixture.detectChanges();

        return fixture;
    };

    it('filtre yokken listenin kendi metnini ve ilk kaydı başlatan bağlantıyı gösterir', () => {
        const el: HTMLElement = create({ filtered: false, createLabel: 'İlk randevuyu oluştur', createLink: '/panel/appointments/new' }).nativeElement;

        expect(el.textContent).toContain('Henüz randevu yok.');
        expect(el.textContent).not.toContain('Bu aramaya uyan kayıt yok.');
        const link = el.querySelector('a[data-testid="list-empty-create"]') as HTMLAnchorElement;

        expect(link.textContent).toContain('İlk randevuyu oluştur');
        expect(link.getAttribute('href')).toBe('/panel/appointments/new');
    });

    it('izin yoksa (etiket null) oluşturma düğmesi yoktur', () => {
        const el: HTMLElement = create({ filtered: false }).nativeElement;

        expect(el.querySelector('[data-testid="list-empty-create"]')).toBeNull();
    });

    it('bağlantı verilmezse düğme create olayını yayar', () => {
        const fixture = create({ filtered: false, createLabel: 'Yeni stok hareketi' });
        let created = 0;

        fixture.componentInstance.create.subscribe(() => created++);
        (fixture.nativeElement.querySelector('button[data-testid="list-empty-create"]') as HTMLButtonElement).click();

        expect(created).toBe(1);
    });

    it('filtre varken "uyan kayıt yok" der; Filtreleri temizle clear yayar, oluşturma düğmesi çıkmaz', () => {
        const fixture = create({ filtered: true, createLabel: 'İlk randevuyu oluştur', createLink: '/panel/appointments/new' });
        const el: HTMLElement = fixture.nativeElement;
        let cleared = 0;

        fixture.componentInstance.clear.subscribe(() => cleared++);

        expect(el.textContent).toContain('Bu aramaya uyan kayıt yok.');
        expect(el.querySelector('[data-testid="list-empty-create"]')).toBeNull();
        (el.querySelector('[data-testid="list-empty-clear"]') as HTMLButtonElement).click();
        expect(cleared).toBe(1);
    });
});
