// Consolidated, single-pass asset-prep script (not part of the app
// build/runtime) -- replaces the earlier multi-script pipeline
// (strip -> optimize -> fix-material-color -> webp-to-png), which wrote
// the GLB through four separate read/transform/write cycles. That's the
// likely source of the "renders solid white regardless of any lighting/
// format change" bug: each write re-serializes buffer views, and doing
// that four times compounds any small corruption. This does every
// transform in one read -> transform -> write pass instead.
//
// Usage: node scripts/build-creature.mjs <in.glb> <out.glb> [maxTexturePx]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, prune, dedup, resample } from '@gltf-transform/functions';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const [, , inPath, outPath, maxPxArg] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node build-creature.mjs <in.glb> <out.glb> [maxTexturePx]');
  process.exit(1);
}
const maxPx = maxPxArg ? Number(maxPxArg) : 512;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

// 1. Keep only the visible colour map.
for (const material of root.listMaterials()) {
  material.setNormalTexture(null);
  material.setOcclusionTexture(null);
  material.setMetallicRoughnessTexture(null);
  material.setEmissiveTexture(null);
  // The bug that took forever to track down: stripping the emissive
  // TEXTURE isn't enough -- some of the source materials also carry an
  // emissiveFactor of [1,1,1] (full white self-illumination), which gets
  // added on top of the lit diffuse color regardless of scene lighting.
  // That's what "some fish are flat white no matter what I do to the
  // lights" actually was. Zero it explicitly rather than assuming
  // removing the texture also clears the factor.
  material.setEmissiveFactor([0, 0, 0]);
  const specGloss = material.getExtension('KHR_materials_pbrSpecularGlossiness');
  if (specGloss) specGloss.setSpecularGlossinessTexture(null);
}
await doc.transform(prune(), dedup());

// 2. Convert the legacy specular-glossiness workflow to metallic-roughness
// (diffuseTexture -> baseColorTexture) and set sane organic-material
// defaults -- the source's specular=1/glossiness=1 was fully mirror-glossy,
// which is what actually caused the original "black and white" look.
await doc.transform(metalRough());
for (const material of root.listMaterials()) {
  material.setMetallicFactor(0);
  material.setRoughnessFactor(0.75);
}

// 3. Downscale + re-encode as PNG (not WebP -- avoids depending on any
// loader's EXT_texture_webp support).
for (const texture of root.listTextures()) {
  const image = texture.getImage();
  if (!image) continue;
  const png = await sharp(Buffer.from(image))
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  texture.setImage(png).setMimeType('image/png');
}

// 4. Losslessly dedupe animation keyframes.
await doc.transform(resample());
await doc.transform(prune(), dedup());

await io.write(outPath, doc);

const before = statSync(inPath).size;
const after = statSync(outPath).size;
console.log(`${inPath}: ${(before / 1024 / 1024).toFixed(2)} MB -> ${outPath}: ${(after / 1024 / 1024).toFixed(2)} MB`);
