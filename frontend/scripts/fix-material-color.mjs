// One-off asset-fix script (not part of the app build/runtime).
//
// Root cause of the "everything renders grey/black" bug: the source
// materials use the legacy KHR_materials_pbrSpecularGlossiness workflow
// with specularFactor=[1,1,1] and glossinessFactor=1 -- i.e. fully
// mirror-glossy. With no environment map in the scene for that gloss to
// reflect, three.js renders it as near-black everywhere except sharp
// point-light highlights, which reads exactly as "black and white
// silhouettes." Converting to the standard metallic-roughness workflow
// (metalness 0, moderate roughness -- organic skin, not chrome) fixes it:
// the diffuse/base-color texture actually shows through.
//
// Usage: node scripts/fix-material-color.mjs <glb-path> [glb-path...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, prune } from '@gltf-transform/functions';
import { statSync } from 'node:fs';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('Usage: node fix-material-color.mjs <glb-path> [glb-path...]');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const p of paths) {
  const before = statSync(p).size;
  const doc = await io.read(p);
  const root = doc.getRoot();

  await doc.transform(metalRough());

  // metalRough() derives metalness/roughness from the old spec/gloss
  // values, which -- being glossy=1 -- would otherwise convert to
  // near-zero roughness (still mirror-like). Override with sensible
  // organic-material defaults instead of trusting that derivation.
  for (const material of root.listMaterials()) {
    material.setMetallicFactor(0);
    material.setRoughnessFactor(0.75);
  }

  await doc.transform(prune());
  await io.write(p, doc);

  const after = statSync(p).size;
  console.log(`${p}: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB`);
}
