import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NEVER, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClinicTaxpayerSettingsService } from '@/app/features/clinics/services/clinic-taxpayer-settings.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicDetailPageComponent } from './clinic-detail-page.component';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

describe('ClinicDetailPageComponent — çalışma saatleri ve randevu varsayılanları', () => {
    let fixture: ComponentFixture<ClinicDetailPageComponent>;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    beforeEach(async () => {
        const clinics = {
            getClinicById: vi.fn().mockName('ClinicsService.getClinicById'),
            getWorkingHours: vi.fn().mockName('ClinicsService.getWorkingHours'),
            getAppointmentSettings: vi.fn().mockName('ClinicsService.getAppointmentSettings')
        };

        clinics.getClinicById.mockReturnValue(of({ id: 'c1', name: 'Merkez Pati', city: 'İstanbul', isActive: true, phone: '', email: '', address: '', description: '' }));
        clinics.getWorkingHours.mockReturnValue(
            of(
                DAYS.map((dayLabel, dayOfWeek) => ({
                    dayOfWeek,
                    dayLabel,
                    isClosed: dayOfWeek === 0,
                    opensAt: dayOfWeek === 0 ? null : '09:00:00',
                    closesAt: dayOfWeek === 0 ? null : '18:00:00',
                    breakStartsAt: dayOfWeek === 1 ? '12:00:00' : null,
                    breakEndsAt: dayOfWeek === 1 ? '13:00:00' : null
                }))
            )
        );
        clinics.getAppointmentSettings.mockReturnValue(of({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false }));
        await TestBed.configureTestingModule({
            imports: [ClinicDetailPageComponent],
            providers: [
                provideRouter([]),
                MessageService,
                { provide: ClinicsService, useValue: clinics },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getAccessToken: () => 't' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClinicTaxpayerSettingsService, useValue: { get: () => NEVER, update: () => NEVER } },
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ clinicId: 'c1' })), snapshot: { paramMap: convertToParamMap({ clinicId: 'c1' }) } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClinicDetailPageComponent);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await wait(100);
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('7 gün, gün adları ve saat alanları çizilir; randevu varsayılanları yüklenir', () => {
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        for (const d of DAYS) {
            expect(text).toContain(d);
        }

        const times = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-date-input input')) as HTMLInputElement[];

        expect(times.length).toBe(28);
        expect(times.some((i) => i.value === '09:00')).toBe(true);
        expect(text).not.toContain('Randevu varsayılanları yükleniyor');
    });
});

describe('ClinicDetailPageComponent — yükleme, form ve durum eylemleri', () => {
    let fixture: ComponentFixture<ClinicDetailPageComponent>;
    let clinics: Record<string, ReturnType<typeof vi.fn>>;
    let claims: string[];
    let routeClinicId: string | null;
    const readOnly = signal(false);

    const clinic = (over: Record<string, unknown> = {}) => ({
        id: 'c1',
        name: 'Merkez Pati',
        city: 'İstanbul',
        isActive: true,
        phone: '02125550000',
        email: 'merkez@ornek.com',
        address: 'Bağdat Cad. 1',
        description: 'Ana şube',
        ...over
    });
    const hours = () =>
        DAYS.map((dayLabel, dayOfWeek) => ({
            dayOfWeek,
            dayLabel,
            isClosed: dayOfWeek === 0,
            opensAt: dayOfWeek === 0 ? null : '09:00:00',
            closesAt: dayOfWeek === 0 ? null : '18:00:00',
            breakStartsAt: null,
            breakEndsAt: null
        }));
    const settings = { defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false };

    const el = () => fixture.nativeElement as HTMLElement;
    const text = () => el().textContent ?? '';

    const button = (label: string) => {
        const b = (Array.from(el().querySelectorAll('button')) as HTMLButtonElement[]).find((x) => x.textContent?.trim() === label);

        if (!b) {
            throw new Error(`Düğme yok: ${label}`);
        }

        return b;
    };

    const settle = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const click = async (label: string) => {
        button(label).click();
        await settle();
    };

    const type = (selector: string, value: string) => {
        const input = el().querySelector(selector) as HTMLInputElement;

        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    const render = async () => {
        const params = convertToParamMap(routeClinicId ? { clinicId: routeClinicId } : {});

        TestBed.configureTestingModule({
            imports: [ClinicDetailPageComponent],
            providers: [
                provideRouter([]),
                MessageService,
                { provide: ClinicsService, useValue: clinics },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getAccessToken: () => 't' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: readOnly } },
                { provide: ClinicTaxpayerSettingsService, useValue: { get: () => NEVER, update: () => NEVER } },
                { provide: ActivatedRoute, useValue: { paramMap: of(params), snapshot: { paramMap: params } } }
            ]
        });
        fixture = TestBed.createComponent(ClinicDetailPageComponent);
        document.body.appendChild(fixture.nativeElement);
        await settle();
    };

    beforeEach(() => {
        claims = [CLINICS_UPDATE_CLAIM];
        routeClinicId = 'c1';
        readOnly.set(false);
        clinics = {
            getClinicById: vi.fn().mockName('ClinicsService.getClinicById').mockReturnValue(of(clinic())),
            getWorkingHours: vi.fn().mockName('ClinicsService.getWorkingHours').mockReturnValue(of(hours())),
            getAppointmentSettings: vi.fn().mockName('ClinicsService.getAppointmentSettings').mockReturnValue(of(settings)),
            updateClinicFromForm: vi.fn().mockName('ClinicsService.updateClinicFromForm'),
            updateWorkingHours: vi.fn().mockName('ClinicsService.updateWorkingHours'),
            updateAppointmentSettings: vi.fn().mockName('ClinicsService.updateAppointmentSettings'),
            deactivateClinic: vi.fn().mockName('ClinicsService.deactivateClinic'),
            activateClinic: vi.fn().mockName('ClinicsService.activateClinic')
        };
    });

    afterEach(() => fixture?.destroy());

    it('klinik gelene kadar yükleniyor durumu', async () => {
        clinics['getClinicById'].mockReturnValue(NEVER);
        await render();

        expect(text()).toContain('Klinik bilgileri yükleniyor…');
        expect(clinics['getWorkingHours']).not.toHaveBeenCalled();
    });

    it('rota kimliği yoksa Geçersiz klinik', async () => {
        routeClinicId = null;
        await render();

        expect(text()).toContain('Geçersiz klinik.');
        expect(clinics['getClinicById']).not.toHaveBeenCalled();
    });

    it('klinik alınamazsa hata; Tekrar dene yeniden yükler', async () => {
        clinics['getClinicById'].mockReturnValue(throwError(() => new Error('Klinik bulunamadı.')));
        await render();

        expect(text()).toContain('Klinik bulunamadı.');

        clinics['getClinicById'].mockReturnValue(of(clinic()));
        await click('Tekrar dene');

        expect(clinics['getClinicById']).toHaveBeenCalledTimes(2);
        expect(text()).toContain('Klinik ayarları');
        expect(clinics['getWorkingHours']).toHaveBeenCalledWith('c1');
        expect(clinics['getAppointmentSettings']).toHaveBeenCalledWith('c1');
    });

    it('özet, düzenleme formu ve bölüm başlıkları', async () => {
        await render();
        const t = text();

        for (const s of ['Klinik ayarları', 'Özet', 'Aktif', 'merkez@ornek.com', 'Bağdat Cad. 1', 'Ana şube', 'Düzenle', 'Klinik adı *', 'Çalışma Saatleri', 'Randevu Varsayılanları', 'Durum']) {
            expect(t).toContain(s);
        }

        expect((el().querySelector('#clinicName') as HTMLInputElement).value).toBe('Merkez Pati');
        expect((el().querySelector('#defaultAppointmentDurationMinutes') as HTMLInputElement).value).toBe('30');
        expect(button('Pasife al').disabled).toBe(false);
    });

    it('çalışma saatleri ve randevu varsayılanları alınamazsa ayrı hata', async () => {
        clinics['getWorkingHours'].mockReturnValue(throwError(() => new Error('Saatler alınamadı.')));
        clinics['getAppointmentSettings'].mockReturnValue(throwError(() => new Error('Varsayılanlar alınamadı.')));
        await render();

        expect(text()).toContain('Saatler alınamadı.');
        expect(text()).toContain('Varsayılanlar alınamadı.');
        expect(text()).toContain('Klinik adı *');
    });

    it('güncelleme yetkisi yoksa özet, saatler, varsayılanlar ve durum bölümü yok', async () => {
        claims = [];
        await render();
        const t = text();

        expect(t).toContain('Düzenle');
        expect(t).not.toContain('Özet');
        expect(t).not.toContain('Çalışma Saatleri');
        expect(t).not.toContain('Randevu Varsayılanları');
        expect(t).not.toContain('Pasife al');
    });

    it('Kaydet klinik bilgilerini günceller', async () => {
        clinics['updateClinicFromForm'].mockReturnValue(of(clinic({ name: 'Yeni Pati' })));
        await render();

        type('#clinicName', 'Yeni Pati');
        await click('Kaydet');

        expect(clinics['updateClinicFromForm']).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Yeni Pati', city: 'İstanbul' }));
    });

    it('çalışma saatleri kaydedilir', async () => {
        clinics['updateWorkingHours'].mockReturnValue(of(hours()));
        await render();

        await click('Çalışma saatlerini kaydet');

        expect(clinics['updateWorkingHours']).toHaveBeenCalledTimes(1);
        expect(clinics['updateWorkingHours'].mock.calls[0][0]).toBe('c1');
    });

    it('randevu varsayılanı aralık dışıysa kaydetme kapalı; geçerli değer kaydedilir', async () => {
        clinics['updateAppointmentSettings'].mockReturnValue(of({ ...settings, slotIntervalMinutes: 10 }));
        await render();

        type('#slotIntervalMinutes', '200');
        expect(button('Randevu varsayılanlarını kaydet').disabled).toBe(true);

        type('#slotIntervalMinutes', '10');
        await click('Randevu varsayılanlarını kaydet');

        expect(clinics['updateAppointmentSettings']).toHaveBeenCalledWith('c1', expect.objectContaining({ slotIntervalMinutes: 10 }));
    });

    it('Pasife al sonrası klinik, saatler ve varsayılanlar yeniden çekilir', async () => {
        clinics['deactivateClinic'].mockReturnValue(of(undefined));
        await render();
        clinics['getClinicById'].mockReturnValue(of(clinic({ isActive: false })));

        await click('Pasife al');

        expect(clinics['deactivateClinic']).toHaveBeenCalledWith('c1');
        expect(clinics['getClinicById']).toHaveBeenCalledTimes(2);
        expect(clinics['getWorkingHours']).toHaveBeenCalledTimes(2);
        expect(clinics['getAppointmentSettings']).toHaveBeenCalledTimes(2);
        expect(text()).toContain('Pasif');
        expect(button('Aktifleştir')).toBeTruthy();
    });

    it('salt okunur modda durum işlemi yapılamaz', async () => {
        readOnly.set(true);
        await render();

        expect(text()).toContain('Bu işletme salt okunur moddadır; klinik bilgileri güncellenemez.');
        expect(text()).toContain('Salt okunur modda pasif/aktif işlemi yapılamaz.');
        expect(button('Çalışma saatlerini kaydet').disabled).toBe(true);
    });
});
