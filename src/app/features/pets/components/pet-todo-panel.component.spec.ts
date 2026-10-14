import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PetTodoView } from '@/app/features/pets/utils/pet-card.utils';
import { PetTodoPanelComponent } from './pet-todo-panel.component';

describe('PetTodoPanelComponent', () => {
    const render = (view: PetTodoView) => {
        TestBed.configureTestingModule({ imports: [PetTodoPanelComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(PetTodoPanelComponent);
        fixture.componentRef.setInput('view', view);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('her satır başlık, ayrıntı ve tek tık eylem bağlantısıyla çizilir', () => {
        const el = render({
            loading: false,
            failed: [],
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

        const row = el.querySelector('[data-testid="todo-pendingCharge"]') as HTMLElement;
        expect(row.textContent).toContain('2 işlem ücret bekliyor');
        expect(row.textContent).toContain('Serum, Enjeksiyon');
        const action = row.querySelector('[data-testid="todo-action"]') as HTMLAnchorElement;
        expect(action.textContent).toContain('Ücretlendir');
        expect(action.getAttribute('href')).toBe('/panel/charges/pending?petId=p1');
        expect(el.querySelector('[data-testid="todo-count"]')?.textContent).toContain('1');
    });

    it('iş yoksa "Bekleyen iş yok"; kaynak alınamadıysa boş durum yerine eksik uyarısı', () => {
        expect(render({ loading: false, failed: [], items: [] }).querySelector('[data-testid="todo-empty"]')).not.toBeNull();
        TestBed.resetTestingModule();

        const el = render({ loading: false, failed: ['Lab'], items: [] });
        expect(el.querySelector('[data-testid="todo-empty"]')).toBeNull();
        expect(el.querySelector('[data-testid="todo-failed"]')?.textContent).toContain('Lab');
    });
});
