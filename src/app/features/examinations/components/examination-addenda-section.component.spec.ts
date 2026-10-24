import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import type { ExaminationAddendumVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { ExaminationAddendaSectionComponent } from './examination-addenda-section.component';

const addendum: ExaminationAddendumVm = { id: 'a1', reason: 'Hatalı kilo', text: 'Doğru kilo 12,4', createdAtUtc: null, createdByName: null };

describe('ExaminationAddendaSectionComponent', () => {
    let fixture: ComponentFixture<ExaminationAddendaSectionComponent>;
    let service: jasmine.SpyObj<ExaminationsService>;

    const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

    beforeEach(async () => {
        service = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', ['getAddenda', 'addAddendum']);
        service.getAddenda.and.returnValue(of([addendum]));
        await TestBed.configureTestingModule({
            imports: [ExaminationAddendaSectionComponent],
            providers: [{ provide: ExaminationsService, useValue: service }]
        }).compileComponents();
        fixture = TestBed.createComponent(ExaminationAddendaSectionComponent);
        fixture.componentRef.setInput('examinationId', 'e1');
        fixture.detectChanges();
    });

    it('yeni ek not sonrası yenilemede liste yerinde kalır; "yükleniyor" yalnız ilk yüklemede görünür (alttaki bölümler zıplamaz)', () => {
        const pending = new Subject<ExaminationAddendumVm[]>();

        service.getAddenda.and.returnValue(pending);
        fixture.componentInstance.load();
        fixture.detectChanges();

        expect(text()).toContain('Doğru kilo 12,4');
        expect(text()).not.toContain('Ek notlar yükleniyor');
        pending.next([addendum]);
        pending.complete();
        fixture.detectChanges();
        expect(text()).toContain('Doğru kilo 12,4');
    });
});
