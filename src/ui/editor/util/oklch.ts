// chatgpt

export function oklchToHex(oklchString: string): string | null {
    // Extracting values from the oklch string
    const match = oklchString.match(/oklch\((\d+)%\s+(\d+)\s+(\d+)\)/);

    if (!match) {
        // Invalid input format
        return null;
    }

    const lightness = parseInt(match[1], 10);
    const chroma = parseInt(match[2], 10);
    const hue = parseInt(match[3], 10);

    // Convert oklch to RGB
    const rgb = oklchToRGB(lightness, chroma, hue);

    // Convert RGB to hexadecimal
    const hex = rgbToHex(rgb);

    return hex;
}

function oklchToRGB(lightness: number, chroma: number, hue: number): number[] {
    const h = hue / 360;
    const s = chroma / 100;
    const l = lightness / 100;

    const x = chroma * (1 - Math.abs((h * 6) % 2 - 1));

    let r, g, b;

    if (0 <= h && h < 1) {
        [r, g, b] = [chroma, x, 0];
    } else if (1 <= h && h < 2) {
        [r, g, b] = [x, chroma, 0];
    } else if (2 <= h && h < 3) {
        [r, g, b] = [0, chroma, x];
    } else if (3 <= h && h < 4) {
        [r, g, b] = [0, x, chroma];
    } else if (4 <= h && h < 5) {
        [r, g, b] = [x, 0, chroma];
    } else if (5 <= h && h < 6) {
        [r, g, b] = [chroma, 0, x];
    } else {
        [r, g, b] = [0, 0, 0];
    }

    const m = l - chroma / 2;

    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(rgb: number[]): string {
    return '#' + rgb.map(value => value.toString(16).padStart(2, '0')).join('');
}
