/**
 * Gera os ícones da marca a partir de `public/brand/fitrank-mark.svg`.
 *
 *   node scripts/generate-brand-icons.mjs
 *
 * Rasteriza com o Chrome headless que já existe na máquina — nada de dependência
 * nova só para virar SVG em PNG. Rodar de novo depois de trocar o mark.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BRAND = "public/brand";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const INK = "#0E0D0B"; // fundo da marca, igual ao --background do tema escuro

// Miolo do mark (os dois <path>: corpo cor creme + galho lime), sem o <svg> de fora.
const markInner = readFileSync(`${BRAND}/fitrank-mark.svg`, "utf8").replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, "");

/**
 * Tile 512×512 com o mark centralizado. `radius` 0 deixa quadrado — é o que o
 * apple-touch-icon precisa, porque o iOS aplica a máscara dele em cima; canto
 * já arredondado com fora transparente vira borda escura no springboard.
 */
const tile = ({ radius, translate, scale }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">` +
  `<rect width="512" height="512"${radius ? ` rx="${radius}"` : ""} fill="${INK}"></rect>` +
  `<g transform="translate(${translate}) scale(${scale})">${markInner}</g></svg>\n`;

// Proporções vindas do protótipo: o ícone comum ocupa mais área que o maskable,
// que precisa sobrar borda para o recorte em círculo do Android.
const APP_ICON = { radius: 115, translate: "51.2 86.6", scale: "2.0480" };
const MASKABLE = { radius: 0, translate: "97.3 124.7", scale: "1.5872" };

writeFileSync(`${BRAND}/app-icon.svg`, tile(APP_ICON));
writeFileSync(`${BRAND}/maskable-icon.svg`, tile(MASKABLE));

const tmp = mkdtempSync(join(tmpdir(), "fitrank-icons-"));
const appleTouch = join(tmp, "apple-touch.svg");
writeFileSync(appleTouch, tile({ ...APP_ICON, radius: 0 }));

/** Renderiza um SVG em PNG no tamanho pedido, via screenshot do Chrome headless. */
function render(svgPath, size, outPath) {
  const html = join(tmp, `page-${size}-${Math.abs(hash(outPath))}.html`);
  writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}` +
      `img{display:block;width:${size}px;height:${size}px}</style>` +
      `<img src="file://${svgPath.startsWith("/") ? svgPath : join(process.cwd(), svgPath)}">`,
  );
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--default-background-color=00000000",
    "--virtual-time-budget=2000",
    `--window-size=${size},${size}`,
    `--screenshot=${outPath}`,
    `file://${html}`,
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

const targets = [
  [`${BRAND}/app-icon.svg`, 512, `${BRAND}/icon-512.png`],
  [`${BRAND}/app-icon.svg`, 192, `${BRAND}/icon-192.png`],
  [`${BRAND}/maskable-icon.svg`, 512, `${BRAND}/maskable-512.png`],
  [appleTouch, 180, `${BRAND}/apple-touch-icon.png`],
  [`${BRAND}/favicon.svg`, 48, join(tmp, "favicon-48.png")],
  [`${BRAND}/favicon.svg`, 32, `${BRAND}/favicon-32.png`],
  [`${BRAND}/favicon.svg`, 16, `${BRAND}/favicon-16.png`],
];

for (const [src, size, out] of targets) {
  render(src, size, out);
  console.log(`${out}  ${size}×${size}`);
}

/**
 * Monta o favicon.ico com os quadros de 16/32/48 embutidos como PNG. Serve o
 * /favicon.ico que navegador e crawler pedem sozinhos, sem link no HTML.
 */
const frames = [16, 32, 48].map((size) => ({
  size,
  data: readFileSync(size === 48 ? join(tmp, "favicon-48.png") : `${BRAND}/favicon-${size}.png`),
}));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reservado
header.writeUInt16LE(1, 2); // tipo 1 = ícone
header.writeUInt16LE(frames.length, 4);

let offset = 6 + frames.length * 16;
const entries = frames.map(({ size, data }) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size === 256 ? 0 : size, 0);
  e.writeUInt8(size === 256 ? 0 : size, 1);
  e.writeUInt8(0, 2); // paleta
  e.writeUInt8(0, 3); // reservado
  e.writeUInt16LE(1, 4); // planos
  e.writeUInt16LE(32, 6); // bits por pixel
  e.writeUInt32LE(data.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += data.length;
  return e;
});

writeFileSync("public/favicon.ico", Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]));
console.log(`public/favicon.ico  ${frames.map((f) => f.size).join("/")}`);

rmSync(tmp, { recursive: true, force: true });
