import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { RecordChangeVm } from '@/app/entities/record-history/models/record-history.model';
import { RecordHistoryService } from '@/app/entities/record-history/services/record-history.service';
import { RecordHistoryButtonComponent } from './record-history-button.component';

const row: RecordChangeVm = {
    id: 'c1',
    kindLabel: 'Değiştirildi',
    occurredAtUtc: '2026-10-30T09:15:00Z',
    actorName: 'Dr. Ayşe',
    changes: [{ label: 'Başlık', oldText: 'Pansuman', newText: 'Pansuman ve temizlik' }]
};

describe('RecordHistoryButtonComponent', () => {
    let fixture: ComponentFixture<RecordHistoryButtonComponent>;
    let service: MockedObject<RecordHistoryService>;

    const text = () => document.body.textContent ?? '';

    beforeEach(async () => {
        service = { getHistory: vi.fn().mockName('RecordHistoryService.getHistory') } as unknown as MockedObject<RecordHistoryService>;
        service.getHistory.mockReturnValue(of([row]));
        await TestBed.configureTestingModule({
            imports: [RecordHistoryButtonComponent],
            providers: [{ provide: RecordHistoryService, useValue: service }]
        }).compileComponents();
        fixture = TestBed.createComponent(RecordHistoryButtonComponent);
        fixture.componentRef.setInput('resource', 'treatments');
        fixture.componentRef.setInput('recordId', 't1');
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('açılmadan geçmişi yüklemez; açılınca kaydın geçmişini gösterir', () => {
        expect(service.getHistory).not.toHaveBeenCalled();

        fixture.componentInstance.open();
        fixture.detectChanges();

        expect(service.getHistory).toHaveBeenCalledWith('treatments', 't1');
        expect(text()).toContain('Dr. Ayşe');
        expect(text()).toContain('Pansuman ve temizlik');
    });

    it('boş geçmişte açıklayıcı boş durum gösterir', () => {
        service.getHistory.mockReturnValue(of([]));

        fixture.componentInstance.open();
        fixture.detectChanges();

        expect(text()).toContain('Değişiklik kaydı yok.');
    });

    it('hatada hata durumunu gösterir', () => {
        service.getHistory.mockReturnValue(throwError(() => new Error('Değişiklik geçmişi yüklenemedi.')));

        fixture.componentInstance.open();
        fixture.detectChanges();

        expect(fixture.componentInstance.error()).toBeTruthy();
    });
});
