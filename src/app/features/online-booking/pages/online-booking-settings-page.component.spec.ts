import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { AppointmentRequestEmailKind, type AppointmentReasonVm, type OnlineBookingSettingsVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { OnlineBookingSettingsPageComponent } from './online-booking-settings-page.component';

const reason = (id: string, over: Partial<AppointmentReasonVm> = {}): AppointmentReasonVm => ({
    id,
    clinicId: 'k1',
    name: 'Aşı',
    defaultDurationMinutes: 15,
    isOnlineBookable: true,
    sortOrder: 1,
    isActive: true,
    veterinarianUserIds: [],
    ...over
});

const day = (dayOfWeek: number, open: boolean): ClinicWorkingHourVm => ({
    dayOfWeek,
    dayLabel: `Gün ${dayOfWeek}`,
    isClosed: !open,
    opensAt: open ? '09:00' : null,
    closesAt: open ? '18:00' : null,
    breakStartsAt: null,
    breakEndsAt: null
});

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
    let reasons: AppointmentReasonVm[];
    let hours: ClinicWorkingHourVm[];
    let phone: string | null;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [OnlineBookingSettingsPageComponent],
            providers: [
                provideRouter([]),
                { provide: OnlineBookingService, useValue: service },
                { provide: AppointmentReasonsService, useValue: { list: () => of(reasons), create: vi.fn(), update: vi.fn(), setActive: vi.fn() } },
                { provide: VisitsService, useValue: { getVeterinarians: () => of([]) } },
                {
                    provide: ClinicsService,
                    useValue: {
                        listClinics: () => of([{ id: 'k1', name: 'Pati', isActive: true }]),
                        getWorkingHours: () => of(hours),
                        getClinicById: () => of({ id: 'k1', name: 'Pati', phone })
                    }
                },
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
        reasons = [reason('r1'), reason('r2', { name: 'Kontrol', sortOrder: 2 }), reason('r3', { name: 'Cerrahi', isOnlineBookable: false })];
        hours = [day(1, true), day(0, false)];
        phone = '0543 958 0091';
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

    it('nedenler sayfada yönetilir; önizleme yalnız online görünenleri ve sonda "Diğer"i, telefonu gösterir; kurulum hazır', async () => {
        await create();
        const el = fixture.nativeElement as HTMLElement;
        const preview = el.querySelector('[data-testid="online-preview-reasons"]')!.textContent!.replace(/\s+/g, ' ');

        expect(el.querySelectorAll('[data-testid="reason-row"]').length).toBe(3);
        expect(preview).toContain('Aşı');
        expect(preview).toContain('Kontrol');
        expect(preview).not.toContain('Cerrahi');
        expect(preview.trim().endsWith('Ne için geldiğinizi aşağıya yazın')).toBe(true);
        expect(el.querySelector('[data-testid="online-preview-phone"]')?.textContent).toBe('0543 958 0091');
        expect(Array.from(el.querySelectorAll('[data-testid="online-readiness"] li')).map((li) => li.getAttribute('data-level'))).toEqual(['ok', 'ok', 'ok']);
    });

    it('eksik kurulum maddeleri gösterilir ve açarken söylenir (engel değil)', async () => {
        reasons = [];
        hours = [day(1, false)];
        phone = null;
        await create();
        const cmp = fixture.componentInstance;
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('[data-testid="readiness-reasons"]')?.getAttribute('data-level')).toBe('warn');
        expect(el.querySelector('[data-testid="readiness-workingHours"]')?.getAttribute('data-level')).toBe('missing');
        expect(el.querySelector('[data-testid="readiness-phone"]')?.getAttribute('data-level')).toBe('warn');
        expect(el.querySelector('[data-testid="readiness-workingHours"] a')?.getAttribute('href')).toBe('/panel/settings/clinics/k1');
        expect(el.querySelector('[data-testid="online-gaps"]')).toBeNull();

        cmp.settingsForm.controls.isEnabled.setValue(true);
        fixture.detectChanges();

        expect(el.querySelector('[data-testid="online-gaps"]')?.textContent).toContain('hiç boş saat göremez');

        cmp.saveSettings();
        expect(service['saveSettings']).toHaveBeenCalled();
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
});
