import type { Mock } from 'vitest';
import { Component, Directive, forwardRef, input, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { ImagingRecordsService } from '@/app/features/imaging/services/imaging-records.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/features/clients/components/client-search.component';
import { PetSearchComponent } from '@/app/features/pets/components/pet-search.component';
import { StoredFileUploadComponent } from '@/app/shared/files/stored-file-upload.component';
import { StoredFilesService } from '@/app/shared/files/stored-files.service';
import { PetAlertBannerComponent } from '@/app/features/pets/components/pet-alert-banner.component';
import { ImagingRecordFormComponent } from './imaging-record-form.component';

/** Arama bileşenlerinin yerine basit değer erişimcisi (sunucu araması bu testin konusu değil). */
@Directive()
abstract class StubValueAccessor implements ControlValueAccessor {
    readonly inputId = input('');
    writeValue(): void {}
    registerOnChange(): void {}
    registerOnTouched(): void {}
}

@Component({
    selector: 'app-client-search',
    standalone: true,
    template: '',
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubClientSearchComponent), multi: true }]
})
class StubClientSearchComponent extends StubValueAccessor {}

@Component({
    selector: 'app-pet-search',
    standalone: true,
    template: '',
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubPetSearchComponent), multi: true }]
})
class StubPetSearchComponent extends StubValueAccessor {
    readonly clientId = input<string | null>(null);
}

@Component({ selector: 'app-pet-alert-banner', standalone: true, changeDetection: ChangeDetectionStrategy.Eager, template: '' })
class StubPetAlertBannerComponent {
    readonly petId = input<string | null>(null);
}

describe('ImagingRecordFormComponent — hata korumalı kayıt ve yükleme (L6)', () => {
    let create: Mock;
    let upload: Mock;

    const setup = () => {
        create = vi.fn().mockName('create').mockReturnValue(of('r1'));
        upload = vi.fn().mockName('upload');
        TestBed.configureTestingModule({
            imports: [ImagingRecordFormComponent],
            providers: [
                provideRouter([]),
                { provide: ImagingRecordsService, useValue: { create, filesOwner: (id: string) => `/api/v1/imaging-records/${id}` } },
                { provide: StoredFilesService, useValue: { upload } },
                { provide: ExaminationsService, useValue: { getExaminations: () => of({ items: [] }) } },
                { provide: AuthService, useValue: { getClinicId: () => 'clinic-1', hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideComponent(ImagingRecordFormComponent, {
            remove: { imports: [ClientSearchComponent, PetSearchComponent, PetAlertBannerComponent] },
            add: { imports: [StubClientSearchComponent, StubPetSearchComponent, StubPetAlertBannerComponent] }
        });
        const fixture = TestBed.createComponent(ImagingRecordFormComponent);

        fixture.detectChanges();
        const form = fixture.componentInstance.form;

        form.controls.clientId.setValue('client-1');
        form.controls.petId.setValue('pet-1');
        form.patchValue({ modality: 'XRay', description: 'Toraks LL', clinicalNote: 'Kardiyomegali yok' });

        const uploader = fixture.debugElement.query(By.directive(StoredFileUploadComponent)).componentInstance as StoredFileUploadComponent;

        return { fixture, c: fixture.componentInstance, uploader };
    };

    const jpg = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], 'a.jpg', { type: 'image/jpeg' });

    it('dosya seçilmeden kayıt açılmaz', async () => {
        const { c } = setup();

        await c.onSubmit();

        expect(c.filesMissing()).toBe(true);
        expect(create).not.toHaveBeenCalled();
    });

    it('dosya yüklemesi başarısızsa kayıt ve metin korunur; yeniden gönderim yeni kayıt açmaz, yalnız dosyayı dener', async () => {
        const { c, uploader, fixture } = setup();
        const saved: string[] = [];

        c.saved.subscribe((id) => saved.push(id));
        uploader.addFiles([jpg()]);
        upload.mockReturnValue(throwError(() => new Error('Dosya deposu şu anda kullanılamıyor.')));

        await c.onSubmit();
        fixture.detectChanges();

        expect(create).toHaveBeenCalledTimes(1);
        expect(vi.mocked(create).mock.lastCall![0]).toEqual(expect.objectContaining({ clinicId: 'clinic-1', petId: 'pet-1', modality: 'XRay', description: 'Toraks LL', clinicalNote: 'Kardiyomegali yok' }));
        expect(c.recordId()).toBe('r1');
        expect(c.submitError()).toContain('1 dosya yüklenemedi');
        expect(c.form.getRawValue().description).toBe('Toraks LL');
        expect(saved).toEqual([]);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dosyaları yükle');

        upload.mockReturnValue(of({ type: 'done', file: { id: 'f1', fileName: 'a.jpg', contentType: 'image/jpeg', kind: 'Image', sizeBytes: 3, uploadedAtUtc: '' } }));
        await c.onSubmit();

        expect(create).toHaveBeenCalledTimes(1);
        expect(upload).toHaveBeenCalledTimes(2);
        expect(vi.mocked(upload).mock.lastCall![0]).toBe('/api/v1/imaging-records/r1');
        expect(saved).toEqual(['r1']);
    });

    it('kuyruktaki "Yeniden dene" başarılı olunca hata kalkar ve kayıt tamamlanır', async () => {
        const { c, uploader, fixture } = setup();
        const saved: string[] = [];

        c.saved.subscribe((id) => saved.push(id));
        uploader.addFiles([jpg()]);
        upload.mockReturnValue(throwError(() => new Error('Dosya deposu şu anda kullanılamıyor.')));
        await c.onSubmit();
        fixture.detectChanges();

        expect(c.submitError()).toContain('1 dosya yüklenemedi');

        upload.mockReturnValue(of({ type: 'done', file: { id: 'f1', fileName: 'a.jpg', contentType: 'image/jpeg', kind: 'Image', sizeBytes: 3, uploadedAtUtc: '' } }));
        uploader.retry(uploader.items()[0]);
        await Promise.resolve();

        expect(c.submitError()).toBeNull();
        expect(saved).toEqual(['r1']);
    });

    it('kayıt oluşturma hatasında metin formda kalır ve dosya gönderilmez', async () => {
        const { c, uploader } = setup();

        create.mockReturnValue(throwError(() => new Error('x')));
        uploader.addFiles([jpg()]);
        await c.onSubmit();

        expect(c.recordId()).toBeNull();
        expect(c.submitError()).toBe('Kayıt oluşturulamadı.');
        expect(c.form.controls.description.value).toBe('Toraks LL');
        expect(upload).not.toHaveBeenCalled();
    });
});
