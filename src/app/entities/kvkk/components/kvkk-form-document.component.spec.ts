import { TestBed } from '@angular/core/testing';
import type { KvkkTemplateKind } from '@/app/entities/kvkk/utils/kvkk-form.utils';
import { KvkkFormDocumentComponent } from './kvkk-form-document.component';

describe('KvkkFormDocumentComponent', () => {
    const render = (inputs: { template: string; kind?: KvkkTemplateKind; clinicName?: string; clientName?: string; date?: string }) => {
        const fixture = TestBed.createComponent(KvkkFormDocumentComponent);

        fixture.componentRef.setInput('template', inputs.template);

        if (inputs.kind) {
            fixture.componentRef.setInput('kind', inputs.kind);
        }

        fixture.componentRef.setInput('clinicName', inputs.clinicName ?? '');
        fixture.componentRef.setInput('clientName', inputs.clientName ?? '');
        fixture.componentRef.setInput('date', inputs.date ?? '');
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('açık rıza (varsayılan): başlıkta klinik adı, doldurulmuş metin, Kabul/Kabul etmiyorum kutuları ve Veri Sahibi bloğu', () => {
        const el = render({ template: '{{clientName}} — {{clinicName}}\n{{date}}', clinicName: 'Pati Kliniği', clientName: 'Ali Veli', date: '15.10.2026' });

        expect(el.querySelector('article')?.getAttribute('aria-label')).toBe('KVKK açık rıza formu');
        expect(el.querySelector('[data-testid="kvkk-form-clinic"]')?.textContent).toContain('Pati Kliniği');
        expect(el.querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('Ali Veli — Pati Kliniği\n15.10.2026');
        const choices = el.querySelector('[data-testid="kvkk-form-choices"]')?.textContent ?? '';

        expect(choices).toContain('Kabul ediyorum');
        expect(choices).toContain('Kabul etmiyorum');
        const signature = el.querySelector('[data-testid="kvkk-form-signature"]')?.textContent ?? '';

        for (const part of ['Veri Sahibi', 'Adı Soyadı', 'Ali Veli', 'Tarih', '15.10.2026', 'İmza']) {
            expect(signature).toContain(part);
        }
    });

    it('açık rıza açıkça seçilince de kutu ve imza bloğu basılır (metinde olmasa da, K15)', () => {
        const el = render({ template: 'Rıza metni', kind: 'consent' });

        expect(el.querySelector('[data-testid="kvkk-form-choices"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="kvkk-form-signature"]')).not.toBeNull();
    });

    it('aydınlatma: yalnız başlık ve doldurulmuş metin; Kabul/Kabul etmiyorum kutuları ve imza bloğu yok (§2b)', () => {
        const el = render({
            template: '{{clinicName}} — AYDINLATMA\nDüzenleme tarihi: {{date}}\nBilgilendirilen: {{clientName}}',
            kind: 'disclosure',
            clinicName: 'Pati Kliniği',
            clientName: 'Ali Veli',
            date: '15.10.2026'
        });

        expect(el.querySelector('article')?.getAttribute('aria-label')).toBe('KVKK aydınlatma metni');
        expect(el.querySelector('[data-testid="kvkk-form-clinic"]')?.textContent).toContain('Pati Kliniği');
        expect(el.querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('Pati Kliniği — AYDINLATMA\nDüzenleme tarihi: 15.10.2026\nBilgilendirilen: Ali Veli');
        expect(el.querySelector('[data-testid="kvkk-form-choices"]')).toBeNull();
        expect(el.querySelector('[data-testid="kvkk-form-signature"]')).toBeNull();
        expect(el.textContent).not.toContain('Kabul ediyorum');
        expect(el.textContent).not.toContain('İmza');
    });

    it('metin HTML olarak yorumlanmaz; klinik adı yoksa başlık çıkmaz', () => {
        const el = render({ template: '<b>kalın</b>' });

        expect(el.querySelector('b')).toBeNull();
        expect(el.querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('<b>kalın</b>');
        expect(el.querySelector('[data-testid="kvkk-form-clinic"]')).toBeNull();
    });
});
