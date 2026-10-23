# Night environment pass

Target: supplied rainy neon Japanese intersection reference. Applied wet asphalt and worn paving textures to the existing imported ground meshes using world-space UVs; road paint and collision stay intact. Asphalt uses roughness 0.27; paving 0.46. Generated assets are assets/resources/environment/wet-asphalt.png and wet-pavement.png, imported with repeat wrapping and mip filtering.

Cooler, softer directional light and reduced ambient fill establish night contrast. Four warm street sphere lights replace the flat lamp halo meshes; shop lights increase to 650/480 lumens. Main.scene enables 1024px shadow maps, two cascades, and shadow casting for the textured shop shells and cars. Utility extensions, junction boxes, insulators and one batched mesh of sagging wires add street detail.

TypeScript, fixture and imported road tests pass; collision footprints remain unchanged. No live preview was listening on the local preview/debug ports, so in-engine lighting, shadow quality and mobile performance have not been visually verified. This is a scene-wide implementation toward the reference, not a claim of exact matching. Wet glints are painted into the texture plus standard material highlights; no screen-space reflections, bloom or new normal maps were added. Twelve local lights total (eight shop, four street) may need device-specific tuning.

## Image provenance and complete prompts

Built-in image_gen tool. Both generated outputs were visually inspected and copied into the project.

### wet-asphalt

Seamless tileable wet dark asphalt road surface, orthographic straight top down, edge to edge. Fine coarse aggregate, irregular repaired cracks, shallow puddle streaks, dirty charcoal blue violet palette, subtle broken pink and amber reflected glints in damp patches. Most surface dark and neutral so dynamic lights can illuminate it. No road markings, no curbs, no props, no cars, no perspective. Rich detailed hand-painted realistic anime cyberpunk game environment ground material, not an illustration of a street. Square image.

### wet-pavement

Seamless tileable worn Japanese city sidewalk paving surface, orthographic straight top down, edge to edge. Square grey violet concrete slabs in aligned grid, narrow dark joints, chipped edges, subtle moss in occasional joints, damp mottled surfaces, muted warm grey lavender palette. Fine realistic detail suitable for isometric cyberpunk game, painted anime environment material. No props, no buildings, no curb, no words, no perspective, no strong directional lighting. Square image.

