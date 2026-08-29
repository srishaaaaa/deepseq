// One-off asset-prep script (not part of the app build/runtime).
//
// The source GLBs (BabylonJS/MeshesLibrary, CC-BY 4.0) ship 4 texture maps
// per material (diffuse/base-color, normal, occlusion, specular-gloss) at
// up to 2048x2048, sized for a full Babylon.js showcase demo. For small,
// fog-obscured, ambient background creatures in a webpage scene, the
// extra maps are invisible weight -- so this strips every texture except
// the one that's actually visible (diffuse/base color), rather than
// resizing/recompressing them (the image-recompression path hits a
// libvips bug in this environment; property removal doesn't touch image
// bytes at all, so it sidesteps that entirely).
//
// Usage: node scripts/strip-creature-textures.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup } from '@gltf-transform/functions';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node strip-creature-textures.mjs <in.glb> <out.glb>');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

for (const material of root.listMaterials()) {
  material.setNormalTexture(null);
  material.setOcclusionTexture(null);
  material.setMetallicRoughnessTexture(null);
  material.setEmissiveTexture(null);

  // Legacy KHR_materials_pbrSpecularGlossiness workflow used by this asset:
  // diffuseTexture is the actual visible color map, specularGlossinessTexture
  // is the one we don't need for a small ambient background creature.
  const specGloss = material.getExtension('KHR_materials_pbrSpecularGlossiness');
  if (specGloss) {
    specGloss.setSpecularGlossinessTexture(null);
  }
}

await doc.transform(prune(), dedup());
await io.write(outPath, doc);

const { readFileSync, statSync } = await import('node:fs');
const before = statSync(inPath).size;
const after = statSync(outPath).size;
console.log(
  `${inPath}: ${(before / 1024 / 1024).toFixed(2)} MB -> ${outPath}: ${(after / 1024 / 1024).toFixed(2)} MB`
);
