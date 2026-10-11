import { openDatePickerOnInputClick } from './date-input-picker';

describe('openDatePickerOnInputClick', () => {
    let off: () => void;
    let host: HTMLElement;
    let showPicker: jasmine.Spy;

    const make = (type: string, attrs: Partial<HTMLInputElement> = {}): HTMLInputElement => {
        const input = document.createElement('input');
        input.type = type;
        Object.assign(input, attrs);
        host.appendChild(input);
        return input;
    };

    beforeEach(() => {
        host = document.createElement('div');
        document.body.appendChild(host);
        showPicker = jasmine.createSpy('showPicker');
        spyOn(HTMLInputElement.prototype, 'showPicker').and.callFake(showPicker);
        off = openDatePickerOnInputClick(document);
    });

    afterEach(() => {
        off();
        host.remove();
    });

    it('date ve datetime-local alanına tıklayınca takvimi açar', () => {
        make('date').click();
        make('datetime-local').click();
        expect(showPicker).toHaveBeenCalledTimes(2);
    });

    it('time/month alanlarında da açar', () => {
        make('time').click();
        make('month').click();
        expect(showPicker).toHaveBeenCalledTimes(2);
    });

    it('metin, sayı ve onay kutusu alanlarına dokunmaz', () => {
        make('text').click();
        make('number').click();
        make('checkbox').click();
        expect(showPicker).not.toHaveBeenCalled();
    });

    it('devre dışı veya salt okunur alanda açmaz', () => {
        make('date', { disabled: true }).click();
        make('date', { readOnly: true }).click();
        expect(showPicker).not.toHaveBeenCalled();
    });

    it('showPicker hata verirse (zaten açık) sessizce yutar', () => {
        showPicker.and.throwError('InvalidStateError');
        expect(() => make('date').click()).not.toThrow();
    });

    it('kaldırma işlevi dinleyiciyi söker', () => {
        off();
        make('date').click();
        expect(showPicker).not.toHaveBeenCalled();
        off = openDatePickerOnInputClick(document);
    });
});
