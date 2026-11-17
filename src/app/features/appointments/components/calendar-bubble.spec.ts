import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CalendarBubbleComponent, type CalendarBubbleData, CalendarBubbleDirective, CalendarBubbleService } from './calendar-bubble';

const DATA: CalendarBubbleData = { time: '10:00–10:30', title: 'Kontrol', subject: 'Ali – Pamuk', place: 'Merkez – Dr. Ayşe', notes: 'Not', status: 'Planlandı', tone: 'bg-primary' };

@Component({
    standalone: true,
    imports: [CalendarBubbleDirective, CalendarBubbleComponent],
    providers: [CalendarBubbleService],
    template: `<button type="button" [appCalendarBubble]="data" (click)="clicks.set(clicks() + 1)">kart</button><app-calendar-bubble />`
})
class HostComponent {
    readonly data = DATA;
    readonly clicks = signal(0);
}

describe('CalendarBubble', () => {
    const setup = () => {
        const fixture = TestBed.createComponent(HostComponent);

        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;

        return { fixture, el, button: el.querySelector('button')!, bubble: () => el.querySelector('[data-testid="calendar-bubble"]') };
    };

    const pointer = (target: HTMLElement, pointerType: string) => {
        const e = new Event('pointerdown', { bubbles: true }) as Event & { pointerType: string };

        Object.defineProperty(e, 'pointerType', { value: pointerType });
        target.dispatchEvent(e);
    };

    afterEach(() => vi.useRealTimers());

    it('fare üzerine gelince kısa gecikmeyle ayrıntıyı gösterir, ayrılınca kapanır', () => {
        vi.useFakeTimers();
        const { fixture, button, bubble } = setup();

        button.dispatchEvent(new Event('mouseenter'));
        vi.advanceTimersByTime(300);
        fixture.detectChanges();
        expect(bubble()?.textContent).toContain('Ali – Pamuk');
        expect(bubble()?.textContent).toContain('Merkez – Dr. Ayşe');

        button.dispatchEvent(new Event('mouseleave'));
        vi.advanceTimersByTime(100);
        fixture.detectChanges();
        expect(bubble()).toBeNull();
    });

    it('dokunmatikte ilk dokunuş yalnız balonu açar, ikincisi kartın eylemini yapar', () => {
        const { fixture, button, bubble } = setup();

        pointer(button, 'touch');
        button.click();
        fixture.detectChanges();
        expect(bubble()).not.toBeNull();
        expect(fixture.componentInstance.clicks()).toBe(0);

        pointer(button, 'touch');
        button.click();
        fixture.detectChanges();
        expect(fixture.componentInstance.clicks()).toBe(1);
        expect(bubble()).toBeNull();
    });

    it('fareyle tıklama doğrudan eylemi yapar', () => {
        const { fixture, button } = setup();

        pointer(button, 'mouse');
        button.click();
        expect(fixture.componentInstance.clicks()).toBe(1);
    });
});
