import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { AppointmentRequestEmailKind, type OnlineBookingSettingsVm } from '@/app/entities/online-booking/models/online-booking.model';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { OnlineBookingSettingsPageComponent } from './online-booking-settings-page.component';

const settings = (over: Partial<OnlineBookingSettingsVm> = {}): OnlineBookingSettingsVm => ({
    clinicId: 'k1',
    isEnabled: false,
    minLeadMinutes: 120,
    maxAdvanceDays: 30,
    bookingCode: null,
    bookingUrl: null,
    bookingCodeGeneratedAtUtc: null,
    ...over
});

describe('OnlineBookingSettingsPageComponent', () => {
    let fixture: ComponentFixture<OnlineBookingSettingsPageComponent>;
    let service: Record<string, ReturnType<typeof vi.fn>>;
    let claims: Set<string>;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [OnlineBookingSettingsPageComponent],
            providers: [
                provideRouter([]),
                { provide: OnlineBookingService, useValue: service },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'k1', name: 'Pati', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(OnlineBookingSettingsPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['Clinics.Update', 'Clinics.Read']);
        service = {
            getSettings: vi.fn().mockReturnValue(of(settings())),
            saveSettings: vi.fn().mockReturnValue(of(settings({ isEnabled: true, bookingCode: 'abcdefghjkmn', bookingUrl: 'https://portal.test/randevu/abcdefghjkmn' }))),
            regenerateCode: vi.fn().mockReturnValue(of(settings({ isEnabled: true, bookingCode: 'mnpqrstuvwxy', bookingUrl: 'https://portal.test/randevu/mnpqrstuvwxy' }))),
            getEmailTemplates: vi.fn().mockReturnValue(
                of({
                    templates: [
                        { kind: AppointmentRequestEmailKind.Received, subject: 'Alındı', body: 'Merhaba {{ownerName}}', isDefault: true },
                        { kind: AppointmentRequestEmailKind.Approved, subject: 'Onay', body: 'Onaylandı', isDefault: false }
                    ],
                    placeholders: ['{{ownerName}}']
                })
            ),
            saveEmailTemplate: vi.fn().mockReturnValue(of({ kind: AppointmentRequestEmailKind.Received, subject: 'Yeni', body: 'Metin', isDefault: false })),
            resetEmailTemplate: vi.fn(),
            previewEmailTemplate: vi.fn().mockReturnValue(of({ subject: 'Önizleme', body: 'Merhaba Ayşe' }))
        };
    });

    it('kayıt yokken kapalı başlar ve bağlantı ilk kayıtta oluşur', async () => {
        await create();
        const cmp = fixture.componentInstance;
        const el = fixture.nativeElement as HTMLElement;

        expect(cmp.settingsForm.getRawValue().isEnabled).toBe(false);
        expect(el.textContent).toContain('ilk kez kaydedilince oluşur');

        cmp.settingsForm.patchValue({ isEnabled: true, minLeadMinutes: 60, maxAdvanceDays: 14 });
        cmp.saveSettings();
        fixture.detectChanges();

        expect(service['saveSettings']).toHaveBeenCalledWith('k1', { isEnabled: true, minLeadMinutes: 60, maxAdvanceDays: 14 });
        expect((el.querySelector('[data-testid="booking-url"]') as HTMLInputElement).value).toBe('https://portal.test/randevu/abcdefghjkmn');
    });

    it('bağlantı yenileme onay sorulmadan yapılmaz', async () => {
        await create();
        const confirm = vi.spyOn(fixture.debugElement.injector.get(ConfirmationService), 'confirm');

        fixture.componentInstance.confirmRegenerate();

        expect(confirm).toHaveBeenCalled();
        expect(service['regenerateCode']).not.toHaveBeenCalled();
    });

    it('şablon seçimi formu doldurur; önizleme ve kayıt seçili türle gider', async () => {
        await create();
        const cmp = fixture.componentInstance;

        expect(cmp.templateForm.getRawValue().subject).toBe('Alındı');
        cmp.selectKind(AppointmentRequestEmailKind.Approved);
        expect(cmp.templateForm.getRawValue().subject).toBe('Onay');

        cmp.selectKind(AppointmentRequestEmailKind.Received);
        cmp.previewTemplate();
        expect(service['previewEmailTemplate']).toHaveBeenCalledWith('k1', AppointmentRequestEmailKind.Received, { subject: 'Alındı', body: 'Merhaba {{ownerName}}' });
        expect(cmp.preview()?.body).toBe('Merhaba Ayşe');

        cmp.templateForm.patchValue({ subject: 'Yeni', body: 'Metin' });
        cmp.saveTemplate();
        expect(service['saveEmailTemplate']).toHaveBeenCalledWith('k1', AppointmentRequestEmailKind.Received, { subject: 'Yeni', body: 'Metin' });
        expect(cmp.currentTemplate()?.isDefault).toBe(false);
    });

    describe('kaydet düğmeleri', () => {
        const el = () => fixture.nativeElement as HTMLElement;
        const saveIn = (formSelector: string) => el().querySelector(`${formSelector} button[type="submit"]`) as HTMLButtonElement;
        const settingsSave = () => saveIn('section[aria-labelledby="onlineSettingsTitle"] form');
        const templateSave = () => saveIn('section[aria-labelledby="onlineTemplatesTitle"] form');

        const type = (selector: string, value: string) => {
            const input = el().querySelector(selector) as HTMLInputElement;

            input.value = value;
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
        };

        it('ayar: bağlantı yokken ilk kayıt yapılabilir; kayıttan sonra değişiklik yokken kapalı, değişince açılır', async () => {
            await create();

            expect(settingsSave().disabled).toBe(false);
            settingsSave().click();
            fixture.detectChanges();

            expect(service['saveSettings']).toHaveBeenCalledTimes(1);
            expect(settingsSave().disabled).toBe(true);

            type('#onlineMaxDays', '14');
            expect(settingsSave().disabled).toBe(false);
        });

        it('ayar: kayıtlı bağlantı varken değişiklik yokken kapalı; kayıttan sonra yeniden kapanır', async () => {
            service['getSettings'].mockReturnValue(of(settings({ isEnabled: true, bookingCode: 'abcdefghjkmn', bookingUrl: 'https://portal.test/randevu/abcdefghjkmn' })));
            await create();

            expect(settingsSave().disabled).toBe(true);
            type('#onlineMaxDays', '14');
            expect(settingsSave().disabled).toBe(false);

            settingsSave().click();
            fixture.detectChanges();

            expect(service['saveSettings']).toHaveBeenCalledWith('k1', expect.objectContaining({ maxAdvanceDays: 14 }));
            expect(settingsSave().disabled).toBe(true);
        });

        it('şablon: değişiklik yokken kapalı; kayıttan sonra yeniden kapanır', async () => {
            await create();

            expect(templateSave().disabled).toBe(true);
            type('#templateSubject', 'Yeni');
            expect(templateSave().disabled).toBe(false);

            templateSave().click();
            fixture.detectChanges();

            expect(service['saveEmailTemplate']).toHaveBeenCalledWith('k1', AppointmentRequestEmailKind.Received, { subject: 'Yeni', body: 'Merhaba {{ownerName}}' });
            expect(templateSave().disabled).toBe(true);
        });
    });
});
