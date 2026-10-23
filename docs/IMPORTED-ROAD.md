# Imported road intersection

Source: `assets/art/environment/ReZONBI_Cyberpunk_Road_Intersection.glb`, copied
unchanged from the supplied Downloads file. This asset contains vertex colors,
not texture images: 290 meshes and 4,296 triangles.

`node tools/import-road-glb.cjs` converts its baked static geometry to
`ImportedRoadData.ts`, grouped into 35 color/emission batches. `ImportedRoad.ts`
creates Cocos meshes synchronously through the existing geometry owner, with
normals calculated from the fitted triangles. No Inspector assignment is needed.
This is conversion of the supplied meshes, not a recreation using substitute boxes.

The source spans 40 x 40 units with sidewalks starting at +/-8.4. Its XZ positions
are fitted piecewise to the existing street edges at X=+/-5 and Z=+/-4.5 and the
arena bounds at +/-18. This intentionally changes source proportions to preserve
the current shop locations and playable layout. Ground layers are lowered below
the actors' 0.06 ground anchor; drain/manhole relief is reduced too. Rubble and
cones are decorative, without new gameplay colliders.

The previous road surfaces, sidewalk visuals, markings, puddles, manholes and
damage decals are replaced. Shops, cars, lamps, garden walls, barriers, arena
boundaries and their collision footprints remain. The underlying city foundation
remains to cover the area outside the playable square.

Validation: imported mesh data, TypeScript, unchanged arena collision, wall chase
and spawn-continuity fixtures. Live Cocos appearance and device performance are
not verified; no accessible preview was running during this integration.
