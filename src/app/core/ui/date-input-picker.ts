const PICKER_INPUT_TYPES = new Set(['date', 'datetime-local', 'time', 'month', 'week']);

/** Yerel tarih/saat alanları (`<input type="date">` vb.) varsayılan olarak yalnız sağdaki takvim simgesinde açılır. */
function isPickerInput(target: EventTarget | null): target is HTMLInputElement {
    return target instanceof HTMLInputElement && PICKER_INPUT_TYPES.has(target.type);
}

/**
 * Tarih/saat alanının herhangi bir yerine tıklayınca takvimi açar (tek global dinleyici; ekranlarda ayrı ayar gerekmez).
 * Klavyeyle yazma ve tarayıcının yerel biçimi değişmez; devre dışı/salt okunur alanlara dokunulmaz.
 * Simgeye tıklanınca tarayıcı zaten açmıştır: `showPicker` açıkken çağrılırsa hata verebilir, bu yüzden sessizce yutulur.
 * Döndürülen işlev dinleyiciyi kaldırır.
 */
export function openDatePickerOnInputClick(doc: Document): () => void {
    const onClick = (event: Event): void => {
        const input = event.target;
        if (!isPickerInput(input) || input.disabled || input.readOnly || typeof input.showPicker !== 'function') {
            return;
        }
        try {
            input.showPicker();
        } catch {
            /* seçici zaten açık veya tarayıcı izin vermedi */
        }
    };
    doc.addEventListener('click', onClick);
    return () => doc.removeEventListener('click', onClick);
}
