import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportUploadNotesComponent } from '@/app/features/imports/components/import-upload-notes.component';
import type { ImportWarningDto, ImportWarningTargetDto } from '@/app/features/imports/models/import-api.model';

const NOTES: ImportWarningDto[] = [
    {
        code: 'Imports.EVet.TasksSkipped',
        table: 'appointments',
        message: '2134 görev aktarılmayacak.',
        severity: 'skipped',
        count: 2134,
        unit: 'görev',
        title: 'aktarılmayacak',
        source: 'Randevu Listesi',
        parts: [{ label: 'Hastası olmayan', count: 475 }]
    },
    {
        code: 'Imports.EVet.OwnerLink',
        table: 'pets',
        message: '6443 hasta sahibine bağlanacak.',
        severity: 'info',
        count: 6443,
        unit: 'hasta',
        title: 'sahibine bağlanacak',
        source: 'Hasta Listesi raporu',
        parts: [
            { label: 'Protokolle', count: 6405 },
            { label: 'Sahip adıyla', count: 38 }
        ]
    },
    { code: 'Imports.EVet.ChipToNote', table: 'pets', message: '23 hastanın mikroçipi nota yazılacak.', severity: 'attention', count: 23, unit: 'hasta', title: 'mikroçip numarası nota taşınacak', outcome: 'Mikroçip alanı boş kalır.' },
    {
        code: 'Imports.EVet.SameOwnerSameName',
        table: 'pets',
        message: '26 satırın hastası sorulacak.',
        severity: 'decision',
        count: 26,
        unit: 'satır',
        title: 'hangi hastaya ait, sizden sorulacak',
        outcome: 'Aynı sahipte aynı adlı birden çok hasta var.',
        target: { anchor: 'required' }
    },
    { code: 'Imports.TableEmpty', table: 'products', message: 'Ürünler dosyasında veri satırı yok; atlandı.', severity: 'skipped' }
];

describe('ImportUploadNotesComponent', () => {
    let fixture: ComponentFixture<ImportUploadNotesComponent>;

    function render(inputs: { notes?: ImportWarningDto[]; startOpen?: boolean; canGo?: boolean } = {}): HTMLElement {
        TestBed.configureTestingModule({ imports: [ImportUploadNotesComponent] });
        fixture = TestBed.createComponent(ImportUploadNotesComponent);
        fixture.componentRef.setInput('notes', inputs.notes ?? NOTES);
        fixture.componentRef.setInput('startOpen', inputs.startOpen ?? true);
        fixture.componentRef.setInput('canGo', inputs.canGo ?? true);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    const rows = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-testid="import-note"]')];
    const filters = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('[data-testid="import-notes-filter"] button')];
    const details = (el: HTMLElement) => el.querySelectorAll('[data-testid="import-note-detail"]').length;

    it('her not tek satır; karar önce, sayı tr-TR biçiminde; başlıkta tür sayıları', () => {
        const el = render();

        expect(rows(el).map((r) => r.dataset['kind'])).toEqual(['decision', 'attention', 'info', 'skipped', 'skipped']);
        expect(rows(el)[2].textContent).toContain('6.443');
        expect(rows(el)[2].textContent?.replace(/\s+/g, ' ')).toContain('Hastalar · Hasta Listesi raporu');
        expect(rows(el)[4].querySelector('[data-testid="import-note-plain"]')?.textContent).toContain('Ürünler dosyasında veri satırı yok');
        expect(filters(el).map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['1 karar', '1 dikkat', '1 bilgi', '2 aktarılmayacak']);
    });

    it('karar satırı baştan açık; diğerleri tıklayınca açılır', () => {
        const el = render();

        expect(details(el)).toBe(1);
        rows(el)[2].querySelector<HTMLElement>('.grid')!.click();
        fixture.detectChanges();

        expect(details(el)).toBe(2);
        expect(rows(el)[2].textContent).toContain('Sahip adıyla');
    });

    it('karar düğmesi hedefi bildirir; metni ekranda üretilir', () => {
        const el = render();
        const emitted: ImportWarningTargetDto[] = [];

        fixture.componentInstance.go.subscribe((t) => emitted.push(t));

        const go = el.querySelector<HTMLButtonElement>('[data-testid="import-note-go"]')!;

        expect(go.textContent).toContain('26 satır için seçim yap');
        go.click();

        expect(emitted).toEqual([{ anchor: 'required' }]);
    });

    it('gidilecek doğrulama sonucu yoksa düğme yerine bilgi yazar', () => {
        const el = render({ canGo: false });

        expect(el.querySelector('[data-testid="import-note-go"]')).toBeNull();
        expect(el.textContent).toContain('Doğrulamada sorulacak');
    });

    it('tür sayısı filtredir; ikinci tıklama ya da "tümünü göster" kaldırır', () => {
        const el = render();

        filters(el)[3].click();
        fixture.detectChanges();
        expect(rows(el).map((r) => r.dataset['kind'])).toEqual(['skipped', 'skipped']);
        expect(filters(el)[3].getAttribute('aria-pressed')).toBe('true');

        filters(el)[3].click();
        fixture.detectChanges();
        expect(rows(el).length).toBe(5);
    });

    it('kapalı gelen panelde yalnız başlık ve tür sayıları görünür; filtre paneli açar', () => {
        const el = render({ startOpen: false });

        expect(rows(el).length).toBe(0);
        expect(el.textContent).toContain('Dosya okunurken 5 not çıktı');

        filters(el)[1].click();
        fixture.detectChanges();
        expect(rows(el).map((r) => r.dataset['kind'])).toEqual(['attention']);
    });

    it('açılış kuralı değişince (adım değişti) panel ona uyar', () => {
        const el = render();

        fixture.componentRef.setInput('startOpen', false);
        fixture.detectChanges();

        expect(rows(el).length).toBe(0);
    });
});
