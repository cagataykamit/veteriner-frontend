import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { StoredFileVm } from './stored-file.model';
import { StoredFileGalleryComponent } from './stored-file-gallery.component';
import { StoredFilesService } from './stored-files.service';

const image = (id: string): StoredFileVm => ({ id, fileName: `${id}.jpg`, contentType: 'image/jpeg', kind: 'Image', sizeBytes: 2048, uploadedAtUtc: '2026-10-22T10:00:00Z' });
const pdf: StoredFileVm = { id: 'p1', fileName: 'rapor.pdf', contentType: 'application/pdf', kind: 'Pdf', sizeBytes: 4096, uploadedAtUtc: '2026-10-22T10:00:00Z' };

describe('StoredFileGalleryComponent — önizleme', () => {
    let service: {
        accessUrl: Mock;
        content: Mock;
    };

    const create = (files: StoredFileVm[]) => {
        service = {
            accessUrl: vi
                .fn()
                .mockName('accessUrl')
                .mockImplementation((_: string, id: string) => of(`https://api/signed/${id}?sig=1`)),
            content: vi
                .fn()
                .mockName('content')
                .mockReturnValue(of({ blob: new Blob(['%PDF']), fileName: 'rapor.pdf' }))
        };
        TestBed.configureTestingModule({ imports: [StoredFileGalleryComponent], providers: [{ provide: StoredFilesService, useValue: service }] });
        const fixture = TestBed.createComponent(StoredFileGalleryComponent);

        fixture.componentRef.setInput('ownerPath', '/api/v1/imaging-records/r1');
        fixture.componentRef.setInput('files', files);
        fixture.componentRef.setInput('altBase', 'Röntgen, 22.10.2026');
        fixture.detectChanges();

        return fixture;
    };

    it('görüntü imzalı URL ile tembel yüklenir; alt metin tür + tarih ve sıradır; PDF için URL istenmez', () => {
        const fixture = create([image('a'), image('b'), pdf]);
        const imgs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('img'));

        expect(service.accessUrl).toHaveBeenCalledTimes(2);
        expect(imgs.map((i) => i.getAttribute('src'))).toEqual(['https://api/signed/a?sig=1', 'https://api/signed/b?sig=1']);
        expect(imgs.every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
        expect(imgs[0].alt).toBe('Röntgen, 22.10.2026 — görüntü 1/2');
    });

    it('küçük resme tıklayınca büyütme penceresi açılır', () => {
        const fixture = create([image('a')]);

        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="file-thumb"]')!.click();
        fixture.detectChanges();

        expect(fixture.componentInstance.lightboxFile()?.id).toBe('a');
        expect(fixture.componentInstance.lightboxOpen).toBe(true);
    });

    it('süresi dolmuş URL bir kez yenilenir', () => {
        const fixture = create([image('a')]);

        fixture.componentInstance.onImageError(image('a'));
        fixture.componentInstance.onImageError(image('a'));

        expect(service.accessUrl).toHaveBeenCalledTimes(2);
    });

    it('PDF Bearer ile alınıp yeni sekmede açılır', () => {
        const tab = { location: { href: '' }, close: vi.fn().mockName('close') } as unknown as Window;

        vi.spyOn(window, 'open').mockReturnValue(tab);
        const fixture = create([pdf]);

        fixture.componentInstance.openPdf(pdf);

        expect(service.content).toHaveBeenCalledWith('/api/v1/imaging-records/r1', 'p1', false);
        expect(tab.location.href).toMatch(/^blob:/);
    });
});
