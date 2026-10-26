import { printWithPageStyle } from './print.utils';

describe('printWithPageStyle', () => {
    it('yazdırma süresince gövde sınıfı ve sayfa kuralı ekler, yazdırma bitince geri alır', () => {
        const win = new EventTarget() as Window;
        const print = vi
            .fn()
            .mockName('print')
            .mockImplementation(() => {
                expect(document.body.classList).toContain('test-print-active');
                expect(Array.from(document.head.querySelectorAll('style')).some((s) => s.textContent === '@page { size: A4 portrait; }')).toBe(true);
            });

        (
            win as unknown as {
                print: () => void;
            }
        ).print = print;

        printWithPageStyle('test-print-active', '@page { size: A4 portrait; }', document, win);
        expect(print).toHaveBeenCalled();

        win.dispatchEvent(new Event('afterprint'));
        expect(document.body.classList).not.toContain('test-print-active');
        expect(Array.from(document.head.querySelectorAll('style')).some((s) => s.textContent === '@page { size: A4 portrait; }')).toBe(false);
    });
});
