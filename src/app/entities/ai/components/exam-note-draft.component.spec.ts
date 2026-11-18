import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExamNoteDraftComponent } from '@/app/entities/ai/components/exam-note-draft.component';
import { type ExamNoteFormValues, parseExamNoteDraftContent } from '@/app/entities/ai/utils/exam-note-draft.utils';

const form: ExamNoteFormValues = { visitReason: 'Kulak kaşıntısı', anamnesis: '', findings: '', assessment: '', plan: '', notes: '', weightKg: null, temperatureC: null, heartRateBpm: null, respiratoryRatePerMin: null };

const content = parseExamNoteDraftContent({
    fields: {
        visitReason: '2 gündür sağ kulakta kaşıntı.',
        anamnesis: 'İştah normal.',
        findings: 'Sağ kulak eritemli.',
        weightKg: 31.4,
        temperatureC: 38.6,
        heartRateBpm: 96,
        respiratoryRatePerMin: 24,
        assessment: 'Otitis externa.',
        plan: 'Damla, 10 gün.',
        notes: null
    }
});

describe('ExamNoteDraftComponent', () => {
    let fixture: ComponentFixture<ExamNoteDraftComponent>;
    const root = () => fixture.nativeElement as HTMLElement;
    const q = (testId: string) => root().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;

    const render = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ExamNoteDraftComponent] }).compileComponents();
        fixture = TestBed.createComponent(ExamNoteDraftComponent);
        fixture.componentRef.setInput('content', content);
        fixture.componentRef.setInput('formValues', form);
        fixture.componentRef.setInput('sourceNote', 'Sahip 2 gündür kaşıntı diyor…');
        await render();
    });

    it('serbest not açılır bölümde; notta karşılığı olmayan alan "boş kalır"; vitaller dört alan', () => {
        expect(q('exam-note-source')?.textContent).toContain('Serbest not');
        expect(q('exam-note-empty-notes')?.textContent).toContain('Notta karşılığı yok · boş kalır');
        expect(q('exam-note-field-vitals')?.querySelectorAll('input[type="number"]').length).toBe(4);
        expect((root().querySelector('#ai-note-plan') as HTMLTextAreaElement).value).toBe('Damla, 10 gün.');
    });

    it('dolu form alanında seçim sunulur, varsayılan "Sona ekle"; boş alanda sunulmaz', () => {
        expect(q('exam-note-existing-visitReason')?.textContent).toContain('Formda yazılı: “Kulak kaşıntısı”');
        expect(q('exam-note-existing-anamnesis')).toBeNull();
        expect(fixture.componentInstance.transfer().patch.visitReason).toBe('Kulak kaşıntısı\n2 gündür sağ kulakta kaşıntı.');
    });

    it('alan düzenlenince "düzenlendi" yazar ve aktarımda iz olarak taşınır', async () => {
        const plan = root().querySelector('#ai-note-plan') as HTMLTextAreaElement;

        plan.value = 'Damla, 7 gün.';
        plan.dispatchEvent(new Event('input'));
        await render();

        expect(q('exam-note-field-plan')?.textContent).toContain('· düzenlendi');

        const t = fixture.componentInstance.transfer();

        expect(t.patch.plan).toBe('Damla, 7 gün.');
        expect(t.fields.find((f) => f.key === 'plan')).toEqual({ key: 'plan', edited: true });
        expect(t.fields.find((f) => f.key === 'anamnesis')).toEqual({ key: 'anamnesis', edited: false });
        expect(t.fields.length).toBe(6);
    });

    it('"Yerine yaz" seçilince formdaki metin değiştirilir', async () => {
        const replace = Array.from(q('exam-note-existing-visitReason')!.querySelectorAll('[role="radio"], button, .p-togglebutton')).find((el) => el.textContent?.includes('Yerine yaz')) as HTMLElement;

        replace.click();
        await render();
        expect(fixture.componentInstance.transfer().patch.visitReason).toBe('2 gündür sağ kulakta kaşıntı.');
    });
});
