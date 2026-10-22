import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import type { StoredFileUploadEvent, StoredFileVm } from './stored-file.model';
import { StoredFileUploadComponent } from './stored-file-upload.component';
import { StoredFilesService } from './stored-files.service';

const stored = (id: string): StoredFileVm => ({ id, fileName: `${id}.jpg`, contentType: 'image/jpeg', kind: 'Image', sizeBytes: 3, uploadedAtUtc: '2026-10-22T10:00:00Z' });

describe('StoredFileUploadComponent — yükleme kuyruğu', () => {
    let upload: jasmine.Spy;

    const create = (ownerPath: string | null = null) => {
        TestBed.configureTestingModule({
            imports: [StoredFileUploadComponent],
            providers: [{ provide: StoredFilesService, useValue: { upload: (upload = jasmine.createSpy('upload')) } }]
        });
        const fixture = TestBed.createComponent(StoredFileUploadComponent);

        fixture.componentRef.setInput('ownerPath', ownerPath);
        fixture.detectChanges();

        return fixture;
    };

    const jpg = (name = 'a.jpg') => new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: 'image/jpeg' });

    it('ön kontrolden geçmeyen dosya yüklenmez, nedeni görünür', () => {
        const fixture = create();
        const c = fixture.componentInstance;

        c.addFiles([new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), jpg()]);
        fixture.detectChanges();

        expect(c.items().map((i) => i.status)).toEqual(['rejected', 'pending']);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Yalnız JPEG, PNG, WebP');
        expect(c.pendingCount()).toBe(1);
        expect(upload).not.toHaveBeenCalled();
    });

    it('ilerleme gösterir, başarılı yüklemeyi bildirir ve dosyayı bellekte tutmaz', async () => {
        const fixture = create();
        const c = fixture.componentInstance;
        const events = new Subject<StoredFileUploadEvent>();
        const uploaded: StoredFileVm[] = [];

        c.uploaded.subscribe((f) => uploaded.push(f));
        upload.and.returnValue(events);
        c.addFiles([jpg()]);
        const done = c.uploadPending('/api/v1/imaging-records/r1');

        events.next({ type: 'progress', percent: 40 });
        expect(c.items()[0].progress).toBe(40);
        expect(c.items()[0].status).toBe('uploading');
        events.next({ type: 'done', file: stored('f1') });
        events.complete();

        expect(await done).toBe(0);
        expect(upload).toHaveBeenCalledWith('/api/v1/imaging-records/r1', jasmine.any(File));
        expect(c.items()[0].status).toBe('done');
        expect(c.items()[0].file).toBeNull();
        expect(uploaded.map((f) => f.id)).toEqual(['f1']);
    });

    it('hata alan dosya kuyrukta kalır ve "Yeniden dene" ile tekrar gönderilir', async () => {
        const fixture = create('/api/v1/lab-results/l1');
        const c = fixture.componentInstance;

        upload.and.returnValue(throwError(() => new Error('Dosya deposu şu anda kullanılamıyor.')));
        c.addFiles([jpg()]);

        expect(await c.uploadPending('/api/v1/lab-results/l1')).toBe(1);
        fixture.detectChanges();
        expect(c.items()[0].status).toBe('failed');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Yeniden dene');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('kullanılamıyor');

        const ok = new Subject<StoredFileUploadEvent>();

        upload.and.returnValue(ok);
        c.retry(c.items()[0]);
        ok.next({ type: 'done', file: stored('f2') });
        ok.complete();
        await Promise.resolve();

        expect(upload).toHaveBeenCalledTimes(2);
        expect(c.items()[0].status).toBe('done');
    });

    it('autoUpload açıkken seçim anında yükler', () => {
        const fixture = create('/api/v1/imaging-records/r1');

        fixture.componentRef.setInput('autoUpload', true);
        upload.and.returnValue(new Subject<StoredFileUploadEvent>());
        fixture.componentInstance.addFiles([jpg()]);

        expect(upload).toHaveBeenCalledTimes(1);
    });
});
