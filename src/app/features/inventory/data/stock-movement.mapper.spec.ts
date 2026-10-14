import { movementKindLabel, normalizeMovementKind } from './stock-movement.mapper';

describe('stock-movement.mapper hareket tipi', () => {
    it('Reversal (4 / "Reversal") ters hareket olarak tanınır ve anlamlı etiket alır', () => {
        expect(normalizeMovementKind(4)).toBe('Reversal');
        expect(normalizeMovementKind('Reversal')).toBe('Reversal');
        expect(movementKindLabel('Reversal')).toBe('Geri alma (iade)');
    });

    it('bilinmeyen tip Unknown kalır', () => {
        expect(normalizeMovementKind(9)).toBe('Unknown');
        expect(movementKindLabel('Unknown')).toBe('Bilinmiyor');
    });
});
