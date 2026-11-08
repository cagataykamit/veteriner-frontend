import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnlineBookingEmbedComponent } from './online-booking-embed.component';

const URL_ = 'https://portal.test/randevu/abcdefghjkmn';

describe('OnlineBookingEmbedComponent', () => {
    let fixture: ComponentFixture<OnlineBookingEmbedComponent>;
    let el: HTMLElement;

    async function create(url = URL_): Promise<void> {
        await TestBed.configureTestingModule({ imports: [OnlineBookingEmbedComponent] }).compileComponents();
        fixture = TestBed.createComponent(OnlineBookingEmbedComponent);
        fixture.componentRef.setInput('bookingUrl', url);
        fixture.componentRef.setInput('clinicName', 'Pati');
        fixture.detectChanges();
        el = fixture.nativeElement as HTMLElement;
    }

    const q = <T extends HTMLElement>(id: string) => el.querySelector(`[data-testid="${id}"]`) as T | null;

    it('düğme ve gömme kodunu gösterir; önizleme düğmesi aynı metin ve stille çizilir', async () => {
        await create();

        expect(q<HTMLTextAreaElement>('embed-button-code')!.value).toContain(`href="${URL_}?kaynak=dis-site"`);
        expect(q<HTMLTextAreaElement>('embed-iframe-code')!.value).toContain('<iframe');

        const preview = q<HTMLAnchorElement>('embed-button-preview')!;

        expect(preview.textContent).toBe('Online randevu al');
        expect(preview.getAttribute('href')).toBe(URL_);
        expect(preview.getAttribute('target')).toBe('_blank');
        expect(preview.style.minHeight).toBe('44px');
    });

    it('kopyala kodu panoya yazar; izin yoksa elle kopyalamayı söyler', async () => {
        await create();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

        q<HTMLButtonElement>('embed-button-copy')!.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(writeText).toHaveBeenCalledWith(fixture.componentInstance.buttonCode());
        expect(q('embed-button-copy')!.textContent).toContain('Kopyalandı');

        writeText.mockRejectedValueOnce(new Error('izin yok'));
        q<HTMLButtonElement>('embed-iframe-copy')!.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(el.textContent).toContain('elle kopyalayın');
    });

    it('gömme önizlemesi istenince yüklenir', async () => {
        await create();

        expect(q('embed-iframe-preview')).toBeNull();

        q<HTMLButtonElement>('embed-iframe-toggle')!.click();
        fixture.detectChanges();

        expect(q<HTMLIFrameElement>('embed-iframe-preview')!.getAttribute('src')).toBe(URL_);
    });

    it('http(s) olmayan bağlantı önizlenmez', async () => {
        await create('javascript:alert(1)');
        fixture.componentInstance.previewOpen.set(true);
        fixture.detectChanges();

        expect(q('embed-iframe-preview')).toBeNull();
    });
});
