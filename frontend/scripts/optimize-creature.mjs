// One-off asset-prep script (not part of the app build/runtime).
//
// gltf-transform's own `resize`/`webp` CLI commands crash in this
// environment -- their image bridge (ndarray-pixels) passes a libvips
// colourspace enum that this sharp/libvips build doesn't recognize
// ("value 32 ... invalid for VipsInterpretation"). Calling `sharp`
// directly (same version, same install) works fine, so this script does
// the same job -- strip non-visible texture maps, downscale + re-encode
// the rest, dedupe animation keyframes -- by driving sharp itself instead
// of going through the broken CLI path.
//
// Usage: node scripts/optimize-creature.mjs <in.glb> <out.glb> [maxTexturePx]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample } from '@gltf-transform/functions';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const [, , inPath, outPath, maxPxArg] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node optimize-creature.mjs <in.glb> <out.glb> [maxTexturePx]');
  process.exit(1);
}
const maxPx = maxPxArg ? Number(maxPxArg) : 512;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

// Keep only the visible colour map -- at the scale/fog these creatures
// render on a webpage, normal/occlusion/spec-gloss detail isn't visible,
// and it's most of the file size.
for (const material of root.listMaterials()) {
  material.setNormalTexture(null);
  material.setOcclusionTexture(null);
  material.setMetallicRoughnessTexture(null);
  material.setEmissiveTexture(null);
  const specGloss = material.getExtension('KHR_materials_pbrSpecularGlossiness');
  if (specGloss) specGloss.setSpecularGlossinessTexture(null);
}
await doc.transform(prune(), dedup());

// Downscale + re-encode every remaining texture with sharp directly.
for (const texture of root.listTextures()) {
  const image = texture.getImage();
  if (!image) continue;
  const resized = await sharp(Buffer.from(image))
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  texture.setImage(resized).setMimeType('image/webp');
}

// Losslessly dedupe animation keyframes (this is what made fish.glb's
// "swimming" clip 9.4MB on its own) -- pure math, no image codec involved.
await doc.transform(resample());

await io.write(outPath, doc);

const before = statSync(inPath).size;
const after = statSync(outPath).size;
console.log(
  `${inPath}: ${(before / 1024 / 1024).toFixed(2)} MB -> ${outPath}: ${(after / 1024 / 1024).toFixed(2)} MB`
);
