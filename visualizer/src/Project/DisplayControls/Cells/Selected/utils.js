// adapted from https://stackoverflow.com/questions/9733288/how-to-programmatically-calculate-the-contrast-ratio-between-two-colors

/**
 * Computes the luminance of a hex color like #000000.
 * Luminance is the perceived brightness of a color.
 * */
export function luminance(hex) {
  const [r, g, b] = hex
    .substr(1)
    .match(/(\S{2})/g)
    .map((x) => parseInt(x, 16));
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/** Computes the contrast between two hex colors. */
export function contrast(hex1, hex2) {
  var lum1 = luminance(hex1);
  var lum2 = luminance(hex2);
  var brightest = Math.max(lum1, lum2);
  var darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}
