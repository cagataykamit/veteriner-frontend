import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PetTodoView } from '@/app/entities/patient/utils/pet-card.utils';
import { PetTodoPanelComponent } from './pet-todo-panel.component';

describe('PetTodoPanelComponent', () => {
    const render = (view: PetTodoView, retryable = false) => {
        TestBed.configureTestingModule({ imports: [PetTodoPanelComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(PetTodoPanelComponent);

        fixture.componentRef.setInput('view', view);
        fixture.componentRef.setInput('retryable', retryable);
        fixture.detectChanges();

        return fixture;
    };

    const el = (view: PetTodoView, retryable = false) => render(view, retryable).nativeElement as HTMLElement;

    it('her satır başlık, ayrıntı ve tek tık eylem bağlantısıyla çizilir', () => {
        const root = el({
            loading: false,
            failed: [],
            forbidden: false,
            items: [
                {
                    key: 'pending-charges',
                    kind: 'pendingCharge',
                    tone: 'warn',
                    icon: 'pi pi-receipt',
                    title: '2 işlem ücret bekliyor',
                    detail: 'Serum, Enjeksiyon',
                    action: { label: 'Ücretlendir', route: ['/panel/charges/pending'], queryParams: { petId: 'p1' } }
                }
            ]
        });

        const row = root.querySelector('[data-testid="todo-pendingCharge"]') as HTMLElement;

        expect(row.textContent).toContain('2 işlem ücret bekliyor');
        expect(row.textContent).toContain('Serum, Enjeksiyon');
        const action = row.querySelector('[data-testid="todo-action"]') as HTMLAnchorElement;

        expect(action.textContent).toContain('Ücretlendir');
        expect(action.getAttribute('href')).toBe('/panel/charges/pending?petId=p1');
        expect(action.classList, 'eylem çubuğuyla aynı boyut').not.toContain('p-button-sm');
        expect(row.classList, 'dar ekranda eylem alta iner').toContain('flex-wrap');
        expect(root.querySelector('[data-testid="todo-count"]')?.textContent).toContain('1');
    });

    it('iş yoksa "Bekleyen iş yok"; kaynak alınamadıysa boş durum yerine eksik uyarısı', () => {
        expect(el({ loading: false, failed: [], forbidden: false, items: [] }).querySelector('[data-testid="todo-empty"]')).not.toBeNull();
        TestBed.resetTestingModule();

        const root = el({ loading: false, failed: ['Lab'], forbidden: false, items: [] });

        expect(root.querySelector('[data-testid="todo-empty"]')).toBeNull();
        expect(root.querySelector('[data-testid="todo-failed"]')?.textContent).toContain('Lab');
        expect(root.querySelector('[data-testid="todo-retry"]'), 'sayfa yeniden okuma sunmuyorsa düğme yok').toBeNull();
    });

    it('hiçbir kaynağı okuma izni yoksa "yok" değil "yetkiniz yok" der', () => {
        const root = el({ loading: false, failed: [], forbidden: true, items: [] });

        expect(root.querySelector('[data-testid="todo-empty"]')).toBeNull();
        expect(root.querySelector('[data-testid="todo-forbidden"]')?.textContent).toContain('Yapılacakları görüntülemek için yetkiniz yok.');
    });

    it('alınamayan kaynakta "Yeniden dene" retry yayar; alınamayan yoksa düğme yok', () => {
        const fixture = render({ loading: false, failed: ['Aşı'], forbidden: false, items: [] }, true);
        let retried = 0;

        fixture.componentInstance.retry.subscribe(() => retried++);

        (fixture.nativeElement.querySelector('[data-testid="todo-retry"]') as HTMLButtonElement).click();
        expect(retried).toBe(1);

        fixture.componentRef.setInput('view', { loading: false, failed: [], forbidden: false, items: [] });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-testid="todo-retry"]')).toBeNull();
    });
});
