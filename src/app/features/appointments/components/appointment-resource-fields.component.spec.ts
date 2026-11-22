import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import type { AppointmentResourceVm } from '@/app/entities/appointment-resource/models/appointment-resource.model';
import { AppointmentResourcesService } from '@/app/entities/appointment-resource/services/appointment-resources.service';
import { AppointmentResourceFieldsComponent } from './appointment-resource-fields.component';

const resource = (id: string, over: Partial<AppointmentResourceVm> = {}): AppointmentResourceVm => ({
    id,
    clinicId: 'c1',
    name: id,
    type: 'Room',
    capacity: 1,
    sortOrder: 0,
    isActive: true,
    ...over
});

@Component({
    standalone: true,
    imports: [AppointmentResourceFieldsComponent],
    template: `<app-appointment-resource-fields clinicId="c1" [roomControl]="room" [equipmentControl]="equipment" [keepIds]="keep()" />`
})
class HostComponent {
    readonly room = new FormControl<string | null>(null);
    readonly equipment = new FormControl<string | null>(null);
    readonly keep = signal<(string | null)[]>([]);
}

describe('AppointmentResourceFieldsComponent', () => {
    const create = (list: AppointmentResourceVm[], keep: string[] = []) => {
        TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [{ provide: AppointmentResourcesService, useValue: { list: vi.fn().mockReturnValue(of(list)) } }]
        });
        const fixture = TestBed.createComponent(HostComponent);

        fixture.componentInstance.keep.set(keep);
        fixture.detectChanges();

        return { el: fixture.nativeElement as HTMLElement, fields: fixture.debugElement.children[0].componentInstance as AppointmentResourceFieldsComponent };
    };

    it('klinikte aktif kaynak yoksa alanlar hiç görünmez', () => {
        const { el } = create([resource('Eski', { isActive: false })]);

        expect(el.querySelector('[data-testid="appointment-resource-fields"]')).toBeNull();
    });

    it('yalnız oda varsa yalnız oda alanı; cihaz alanı yok', () => {
        const { el, fields } = create([resource('Ameliyathane')]);

        expect(el.querySelector('#appointmentRoom')).not.toBeNull();
        expect(el.querySelector('#appointmentEquipment')).toBeNull();
        expect(fields.roomOptions()).toEqual([{ value: 'Ameliyathane', label: 'Ameliyathane' }]);
    });

    it('pasif kaynak yalnız mevcut randevunun kaynağıysa seçenekte kalır', () => {
        const list = [resource('Ultrason', { type: 'Equipment' }), resource('Eski röntgen', { type: 'Equipment', isActive: false }), resource('Kapalı', { type: 'Equipment', isActive: false })];
        const { fields } = create(list, ['Eski röntgen']);

        expect(fields.equipmentOptions().map((o) => o.label)).toEqual(['Ultrason', 'Eski röntgen — pasif']);
    });
});
