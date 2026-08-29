// One-off asset-fix script (not part of the app build/runtime).
//
// Diagnostic screenshots showed 3 of 4 fish-school textures (and likely
// the shark's) rendering as flat, unlit white regardless of any lighting
// change -- ruling out exposure/lighting as the cause. The textures were
// re-encoded as WebP earlier (scripts/optimize-creature.mjs) for size;
// WebP-in-glTF requires the EXT_texture_webp extension to be recognized
// by the loader, and drei's default useGLTF loader doesn't register
// support for it, so some/all of those textures silently fail to bind.
// PNG needs no such extension -- every glTF loader handles it natively.
// The images are already small (resized in the earlier pass), so
// switching format costs some KB, not the size win itself.
//
// Usage: node scripts/webp-to-png.mjs <glb-path> [glb-path...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('Usage: node webp-to-png.mjs <glb-path> [glb-path...]');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const p of paths) {
  const before = statSync(p).size;
  const doc = await io.read(p);
  const root = doc.getRoot();

  for (const texture of root.listTextures()) {
    const image = texture.getImage();
    if (!image) continue;
    const png = await sharp(Buffer.from(image)).png({ compressionLevel: 9 }).toBuffer();
    texture.setImage(png).setMimeType('image/png');
  }

  await io.write(p, doc);
  const after = statSync(p).size;
  console.log(`${p}: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB`);
}
