// Export the existing vector brand mark to Windows icon sizes, without a new design.
const { Resvg } = require('@resvg/resvg-js');
const path = require('node:path');
const fs = require('node:fs');
(() => {
  try {
    const folder = path.join(__dirname, '../src/assets');
    const fontFile = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'arialbd.ttf');
    const font = fs.existsSync(fontFile) ? { loadSystemFonts: false, fontFiles: [fontFile] } : { loadSystemFonts: true };
    const svg = fs.readFileSync(path.join(folder, 'icon.svg'), 'utf8');
    const render = size => new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng();
    fs.writeFileSync(path.join(folder, 'icon.png'), render(512));
    const sizes = [16, 32, 48, 64, 128, 256];
    const entries = sizes.map(render);
    const header = Buffer.alloc(6 + sizes.length * 16);
    header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, index) => {
      const position = 6 + index * 16;
      header[position] = size === 256 ? 0 : size;
      header[position + 1] = header[position];
      header.writeUInt16LE(1, position + 4); header.writeUInt16LE(32, position + 6);
      header.writeUInt32LE(entries[index].length, position + 8); header.writeUInt32LE(offset, position + 12);
      offset += entries[index].length;
    });
    fs.writeFileSync(path.join(folder, 'icon.ico'), Buffer.concat([header, ...entries]));
    const badgeFolder = path.join(folder, 'badges');
    fs.mkdirSync(badgeFolder, { recursive: true });
    for (let count = 1; count <= 100; count++) {
      const text = count === 100 ? '99+' : String(count);
      const svgBadge = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="15" fill="#ed4245" stroke="#fff" stroke-width="1"/><text x="16" y="21.5" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${text.length === 3 ? 12 : 18}">${text}</text></svg>`;
      fs.writeFileSync(path.join(badgeFolder, `${count === 100 ? '99plus' : count}.png`), new Resvg(svgBadge.replace('<text ', '<text fill="#fff" '), { font }).render().asPng());
    }
    console.log('Exported icon.svg → icon.png (512px) + icon.ico (16–256px)');
  } catch (error) { console.error(error); process.exitCode = 1; }
})();
