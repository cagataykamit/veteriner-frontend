import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AiPanelComponent } from '@/app/entities/ai/components/ai-panel.component';
import type { PetHistorySummaryVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';

const summary: PetHistorySummaryVm = {
    petId: 'p1',
    hasRecords: true,
    generatedAtUtc: '2026-11-19T11:32:00Z',
    coverage: { fromUtc: '2026-03-02T08:00:00Z', toUtc: '2026-11-10T10:30:00Z', recordCount: 14, countsLabel: '5 muayene · 3 reçete', omittedTypesLabel: 'laboratuvar', truncated: true },
    sections: [
        { kind: 'Alerts', title: 'Uyarılar', isAlert: true, items: [{ text: 'Penisilin alerjisi kayıtlı.', sources: [{ type: 'Pet', id: 'p1', label: 'Hasta kartı', icon: 'pi-id-card', link: ['/panel/pets', 'p1'] }] }] },
        { kind: 'RecentVisits', title: 'Son muayeneler', isAlert: false, items: [{ text: 'Kulak kaşıntısı.', sources: [{ type: 'Administration', id: 'a1', label: 'Uygulama', icon: 'pi-box', link: null }] }] }
    ],
    droppedItemCount: 1
};

@Component({
    standalone: true,
    imports: [AiPanelComponent],
    template: `<app-ai-panel /><ng-template #custom><p data-testid="custom-body">Sayfanın taslağı</p></ng-template>`
})
class HostComponent {
    readonly custom = viewChild.required<TemplateRef<unknown>>('custom');
}

describe('AiPanelComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let ai: MockedObject<AiService>;
    let response: Subject<PetHistorySummaryVm>;
    let usageWarning: ReturnType<typeof signal<string | null>>;
    let panel: AiPanelService;

    const q = (testId: string) => document.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;

    const render = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(async () => {
        response = new Subject<PetHistorySummaryVm>();
        ai = { summarizePetHistory: vi.fn().mockReturnValue(response) } as unknown as MockedObject<AiService>;
        usageWarning = signal<string | null>(null);
        await TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [provideRouter([]), { provide: AiService, useValue: ai }, { provide: AiStatusService, useValue: { usageWarning, refresh: vi.fn() } }]
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        panel = TestBed.inject(AiPanelService);
        await render();
    });

    afterEach(() => fixture.destroy());

    it('kapalıyken hiçbir şey çizmez', () => {
        expect(q('ai-panel-title')).toBeNull();
    });

    it('yükleniyor: duyurulan bekleme metni ve Vazgeç; Vazgeç paneli kapatır', async () => {
        panel.openHistory('p1', 'Karamel');
        await render();

        expect(q('ai-panel-title')?.textContent).toContain('Geçmiş özeti · Karamel');
        expect(q('ai-state-loading')?.getAttribute('aria-live')).toBe('polite');
        expect(q('ai-history-copy')).toBeNull();

        q('ai-history-cancel')!.click();
        await render();
        expect(panel.content()).toBeNull();
    });

    it('sonuç: şerit, kapsam, kapsam notları, uyarı bölümü, kaynak bağlantıları ve %80 notu; Kopyala ve Yeniden özetle', async () => {
        usageWarning.set('Kliniğin bu ayki AI kullanımı %84.');
        panel.openHistory('p1', 'Karamel');
        response.next(summary);
        await render();

        expect(q('ai-draft-notice')?.textContent).toContain('Taslak — kontrol edin');
        expect(q('ai-summary-coverage')?.textContent).toContain('2 Mar 2026 – 10 Kas 2026');
        expect(q('ai-summary-coverage')?.textContent).toContain('14 kayıt:');
        expect(q('ai-summary-omitted')?.textContent).toContain('laboratuvar kayıtları özete girmedi');
        expect(q('ai-summary-truncated')?.textContent).toContain('2 Mar 2026 tarihinden başlıyor');
        expect(q('ai-summary-dropped')?.textContent).toContain('1 madde özetten çıkarıldı');
        expect(q('ai-summary-section-Alerts')?.textContent).toContain('Uyarılar');
        expect((q('ai-source-link') as HTMLAnchorElement).getAttribute('href')).toBe('/panel/pets/p1');
        expect(q('ai-source-label')?.textContent).toContain('Uygulama');
        expect(q('ai-usage-warning')?.textContent).toContain('%84');
        expect(q('ai-history-copy')).not.toBeNull();

        ai.summarizePetHistory.mockReturnValue(new Subject());
        q('ai-history-resummarize')!.click();
        expect(ai.summarizePetHistory).toHaveBeenCalledTimes(2);
    });

    it('kayıt yok: kotanın harcanmadığını söyler, Kopyala yok', async () => {
        panel.openHistory('p1', 'Karamel');
        response.next({ ...summary, hasRecords: false, sections: [] });
        await render();

        expect(q('ai-state-message')?.textContent).toContain('Özetlenecek klinik kayıt yok');
        expect(q('ai-state-message')?.textContent).toContain('kota da harcanmadı');
        expect(q('ai-history-copy')).toBeNull();
    });

    it('sağlayıcıya ulaşılamadı: amber ileti ve Tekrar dene; yalnız panelde', async () => {
        ai.summarizePetHistory.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { extensions: { code: 'Ai.ProviderUnavailable' } } })));
        panel.openHistory('p1', 'Karamel');
        await render();

        expect(q('ai-state-message')?.getAttribute('role')).toBe('alert');
        expect(q('ai-state-message')?.textContent).toContain('Özet şu an hazırlanamadı');
        expect(q('ai-state-retry')?.textContent).toContain('Tekrar dene');
        expect((q('ai-state-retry') as HTMLButtonElement).disabled).toBe(false);
    });

    it('çok sık istek: Yeniden dene geri sayımla pasif', async () => {
        ai.summarizePetHistory.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429, error: { extensions: { code: 'Ai.RateLimited' } } })));
        panel.openHistory('p1', 'Karamel');
        await render();

        const retry = q('ai-state-retry') as HTMLButtonElement;

        expect(retry.disabled).toBe(true);
        expect(retry.textContent).toMatch(/Yeniden dene · [01]:\d\d/);
    });

    it('güvenlik reddi: tekrar dene yok', async () => {
        ai.summarizePetHistory.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { extensions: { code: 'Ai.Refused' } } })));
        panel.openHistory('p1', 'Karamel');
        await render();

        expect(q('ai-state-message')?.textContent).toContain('Bu kayıtlar için özet üretilemedi');
        expect(q('ai-state-retry')).toBeNull();
    });

    it('sayfa şablonu panelde çizilir; × paneli kapatır', async () => {
        panel.openCustom({ title: 'Notu alanlara ayır', template: fixture.componentInstance.custom(), owner: {} });
        await render();

        expect(q('ai-panel-title')?.textContent).toContain('Notu alanlara ayır');
        expect(q('custom-body')).not.toBeNull();

        q('ai-panel-close')!.click();
        await render();
        expect(panel.content()).toBeNull();
    });
});
