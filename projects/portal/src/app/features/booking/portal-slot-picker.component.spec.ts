import { ComponentFixture, TestBed } from '@angular/core/testing';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { BOOKING_DAYS, SLOT_MON_0930, SLOT_TUE_1400 } from './portal-booking.fixtures';
import { bookingDayWeekday, PortalSlotPicker } from './portal-slot-picker.component';

describe('PortalSlotPicker (gün ve saat seçimi)', () => {
    let fixture: ComponentFixture<PortalSlotPicker>;
    let el: HTMLElement;
    let picked: string[];

    async function create(days = BOOKING_DAYS, selected: string | null = null): Promise<void> {
        await TestBed.configureTestingModule({ imports: [PortalSlotPicker] }).compileComponents();
        fixture = TestBed.createComponent(PortalSlotPicker);
        fixture.componentRef.setInput('days', days);
        fixture.componentRef.setInput('selected', selected);
        picked = [];
        fixture.componentInstance.selectedChange.subscribe((v) => picked.push(v));
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    }

    afterEach(() => fixture?.destroy());

    function times(): string[] {
        return Array.from(el.querySelectorAll('[data-testid=slot-times] button')).map((b) => b.textContent!.trim());
    }

    function dayButtons(): HTMLButtonElement[] {
        return Array.from(el.querySelectorAll<HTMLButtonElement>('button.day'));
    }

    it('yalnız saati olan günleri takvim kutucuğu olarak gösterir; saatler İstanbul saatiyle (06:00Z = 09:00)', async () => {
        await create();

        expect(dayButtons().map((b) => b.textContent!.replace(/\s+/g, ''))).toEqual(['Pzt2Kas', 'Sal3Kas']);
        expect(dayButtons()[0].getAttribute('aria-label')).toBe('Pazartesi, 2 Kas, 2 boş saat');
        expect(times()).toEqual(['09:00', '09:30']);
    });

    it('saatler sabah / öğleden sonra / akşam gruplarında (sınırlar 12:00 ve 17:00)', async () => {
        await create([
            {
                date: '2026-11-02',
                slots: [
                    { startUtc: '2026-11-02T08:30:00Z', endUtc: '2026-11-02T09:00:00Z' },
                    { startUtc: '2026-11-02T09:00:00Z', endUtc: '2026-11-02T09:30:00Z' },
                    { startUtc: '2026-11-02T14:00:00Z', endUtc: '2026-11-02T14:30:00Z' }
                ]
            }
        ]);

        const groups = Array.from(el.querySelectorAll('[data-testid=slot-times] h3')).map((h) => h.textContent!.trim());

        expect(groups).toEqual(['Sabah', 'Öğleden sonra', 'Akşam']);
        expect(times()).toEqual(['11:30', '12:00', '17:00']);
    });

    it('gün değişince o günün saatleri; saat tıklanınca startUtc yayımlanır', async () => {
        await create();

        dayButtons()[1].click();
        fixture.detectChanges();
        expect(times()).toEqual(['14:00']);

        buttonByText(el, '14:00')!.click();
        expect(picked).toEqual([SLOT_TUE_1400]);
    });

    it('seçili saatin günü açık gelir ve işaretli olur', async () => {
        await create(BOOKING_DAYS, SLOT_MON_0930);

        expect(buttonByText(el, '09:30')!.getAttribute('aria-pressed')).toBe('true');
    });

    it('hiç müsait saat yoksa bilgi metni', async () => {
        await create([{ date: '2026-11-02', slots: [] }]);

        expect(el.querySelector('[data-testid=no-slots]')).not.toBeNull();
    });

    it('takvim günü İstanbul günüyle adlandırılır', () => {
        expect(bookingDayWeekday('2026-11-02')).toBe('Pazartesi');
    });
});
