import { TestBed } from '@angular/core/testing';
import { AppStatusTagComponent } from './app-status-tag.component';

describe('AppStatusTagComponent', () => {
    const render = (inputs: Record<string, string | undefined>) => {
        TestBed.configureTestingModule({ imports: [AppStatusTagComponent] });
        const fixture = TestBed.createComponent(AppStatusTagComponent);

        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('etiket ve renk; simge verilmezse simge yok', () => {
        const el = render({ label: 'Kapalı', severity: 'secondary' });

        expect(el.textContent).toContain('Kapalı');
        expect(el.querySelector('.p-tag-secondary')).not.toBeNull();
        expect(el.querySelector('.pi')).toBeNull();
    });

    it('simge verilirse aynı renkteki durumdan ayrılır (Personel elle)', () => {
        const el = render({ label: 'Personel elle', severity: 'secondary', icon: 'pi pi-user' });

        expect(el.querySelector('.pi-user')).not.toBeNull();
    });
});
