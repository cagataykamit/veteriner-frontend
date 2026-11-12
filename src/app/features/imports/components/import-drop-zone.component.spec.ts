import { TestBed } from '@angular/core/testing';
import { ImportDropZoneComponent } from './import-drop-zone.component';

describe('ImportDropZoneComponent', () => {
    function create(file: File | null, description: string | null = null): HTMLElement {
        const fixture = TestBed.createComponent(ImportDropZoneComponent);

        fixture.componentRef.setInput('label', 'E-vet yedeği (.xlsx)');
        fixture.componentRef.setInput('extension', '.xlsx');
        fixture.componentRef.setInput('description', description);
        fixture.componentRef.setInput('file', file);
        fixture.detectChanges();

        return (fixture.nativeElement as HTMLElement).firstElementChild as HTMLElement;
    }

    it('dosya seçilmeden kesik çizgili ve seçilmemiş görünür', () => {
        const zone = create(null);

        expect(zone.getAttribute('data-selected')).toBeNull();
        expect(zone.classList).toContain('border-dashed');
        expect(zone.classList).not.toContain('bg-green-50');
        expect(zone.textContent).toContain('Dosya seç');
    });

    it('dosya seçilince yeşil, düz çizgili ve onay simgeli görünür', () => {
        const zone = create(new File(['x'], 'yedek.xlsx'));

        expect(zone.getAttribute('data-selected')).toBe('true');
        expect(zone.classList).not.toContain('border-dashed');
        expect(zone.classList).toContain('border-green-600');
        expect(zone.classList).toContain('bg-green-50');
        expect(zone.querySelector('.pi-check-circle')).not.toBeNull();
        expect(zone.textContent).toContain('yedek.xlsx');
    });

    it('açıklama dosya seçildikten sonra da görünür', () => {
        expect(create(null, 'Müşteri ve hasta kayıtları').textContent).toContain('Müşteri ve hasta kayıtları');
        expect(create(new File(['x'], 'yedek.xlsx'), 'Müşteri ve hasta kayıtları').textContent).toContain('Müşteri ve hasta kayıtları');
    });
});
