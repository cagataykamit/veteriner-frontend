import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PetTimelineItemVm } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { PetTimelineItemComponent } from './pet-timeline-item.component';

const row = (over: Partial<PetTimelineItemVm> = {}): PetTimelineItemVm => ({
    key: 'Vaccination:va1',
    type: 'Vaccination',
    sourceId: 'va1',
    eventAtUtc: '2026-11-20T10:35:00Z',
    clinicId: 'c1',
    clinicName: 'Merkez',
    title: 'Kuduz',
    summary: null,
    status: 'Applied',
    isVoided: false,
    linkType: 'Vaccination',
    linkId: 'va1',
    relatedExaminationId: null,
    relatedAppointmentId: null,
    relatedTreatmentId: null,
    addedAfterFinalization: false,
    ...over
});

describe('PetTimelineItemComponent (A düzeni satırı)', () => {
    let fixture: ComponentFixture<PetTimelineItemComponent>;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (testId: string) => el().querySelector(`[data-testid="${testId}"]`);

    const render = (item: PetTimelineItemVm, clinicName: string | null = null) => {
        fixture = TestBed.createComponent(PetTimelineItemComponent);
        fixture.componentRef.setInput('item', item);
        fixture.componentRef.setInput('clinicName', clinicName);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [PetTimelineItemComponent], providers: [provideRouter([])] }).compileComponents();
    });

    it('saat, renkli tür simgesi ve tür etiketi, tek renkli başlık bağlantısı; olağan durum soluk ve rozetsiz', () => {
        render(row());

        expect(q('time')?.textContent?.trim()).toBe('13:35');
        expect(q('type-icon')?.className).toContain('text-indigo-700');
        expect(q('type-icon')?.getAttribute('aria-label')).toBe('Aşı');
        expect(q('type-label')?.textContent?.trim()).toBe('Aşı');
        expect(q('type-label')?.className).toContain('text-indigo-700');

        const link = q('event-link') as HTMLAnchorElement;

        expect(link.getAttribute('href')).toBe('/panel/vaccinations/va1');
        expect(link.classList).toContain('text-color');
        expect(link.classList).not.toContain('text-primary');
        expect(q('status')?.textContent?.trim()).toBe('Uygulandı');
        expect(q('status')?.className).toContain('text-muted-color');
        expect(el().querySelector('p-tag')).toBeNull();
        expect(q('clinic-name')).toBeNull();
    });

    it('bekleyen durum ve sonradan eklenen kayıt renkli rozetle', () => {
        render(row({ type: 'LabResult', key: 'LabResult:l1', linkType: 'LabResult', status: 'Requested', addedAfterFinalization: true }));

        expect(q('status')?.tagName).toBe('P-TAG');
        expect(q('status')?.textContent).toContain('İstendi');
        expect(q('late-entry')?.textContent).toContain('Kesinleştirmeden sonra eklendi');
    });

    it('iptal edilen kayıt: iptal rozeti durumun yerini alır, başlık üstü çizili', () => {
        render(row({ status: 'Cancelled', isVoided: true }));

        expect(q('voided')?.textContent).toContain('İptal / yanlış işaretli');
        expect(q('status')).toBeNull();
        expect(q('title')?.className).toContain('line-through');
        expect((q('event-link') as HTMLElement).className).not.toContain('text-color');
    });

    it('eski program kaydı: saat yok, "Eski programdan" etiketi, nötr gri simge, bağlantısız; özeti yazılır', () => {
        render(row({ type: 'ImportedClinicalRecord', key: 'ImportedClinicalRecord:r1', linkType: 'ImportedClinicalRecord', title: 'Kontrol Muayenesi', summary: 'Gastrit', status: null }));

        expect(q('time')?.textContent?.trim()).toBe('—');
        expect(q('type-label')?.textContent?.trim()).toBe('Eski programdan');
        expect(q('type-icon')?.className).toContain('text-surface-500');
        expect(q('event-link')).toBeNull();
        expect(q('title')?.textContent?.trim()).toBe('Kontrol Muayenesi');
        expect(q('summary')?.textContent).toContain('Gastrit');
        expect(el().textContent).not.toContain('· —');
    });

    it('klinik adı yalnız verildiğinde (başka klinik) yazılır; bağlı muayene bağlantısı korunur', () => {
        render(row({ relatedExaminationId: 'e1' }), 'Şube');

        expect(q('clinic-name')?.textContent).toContain('Şube');
        expect(q('examination-link')?.getAttribute('href')).toBe('/panel/examinations/e1');
    });
});
