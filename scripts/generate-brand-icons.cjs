const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "public/brand/yns-card-logo.jpeg");
const background = "#FAF8F2";
const symbolCrop = { left: 170, top: 170, width: 915, height: 530 };

async function renderSymbol(size) {
  return sharp(source)
    .extract(symbolCrop)
    .resize(size, size, { fit: "contain", background })
    .ensureAlpha()
    .png()
    .toBuffer();
}

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt8(1, 2);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

async function main() {
  const [small, medium, icon, apple, large] = await Promise.all(
    [32, 48, 192, 180, 512].map(async (size) => ({
      size,
      data: await renderSymbol(size),
    })),
  );

  fs.writeFileSync(
    path.join(root, "app/favicon.ico"),
    createIco([small, medium]),
  );
  fs.writeFileSync(path.join(root, "app/icon.png"), icon.data);
  fs.writeFileSync(path.join(root, "app/apple-icon.png"), apple.data);
  fs.writeFileSync(
    path.join(root, "public/brand/yns-card-icon-512.png"),
    large.data,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
