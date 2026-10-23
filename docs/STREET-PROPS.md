# Abandoned street props

Implemented the supplied abandoned-car and prop design as static 3D geometry with a generated material atlas. Entry point: assets/scripts/levels/StreetProps.ts, called by ResidentialArena.ts.

Three cars replace the original block cars at (-3.2,-9), (10,2.6), and (3.2,12). Each has 11 UV-mapped body/glass faces, sloped cabin, wheel rims, bumpers, pillars, mirrors, lamps and ivy. The third car uses darker burnt material tint and unlit headlights. Original collision footprints remain 1.65 x 3.3. Cones, concrete blocks, trash bags, cans, paper, drains, manholes and asphalt cracks are decorative, not extra movement blockers. Existing imported road geometry is preserved.

The atlas is assets/resources/environment/abandoned-street-atlas.png. Its four quadrants contain weathered steel, shattered glass, door panels and newspaper. Generated with the built-in image_gen tool; inspected before integration. Standard lit materials use no extra texture emission. Missing texture loads preserve fallback materials. GeometryFactory owns custom meshes and materials for cleanup.

Validation: TypeScript, shop/street fixture and imported-road tests pass. The fixture checks unchanged collision, outward car face normals, valid UVs, atlas assignment and dark tint. No live in-engine screenshot or mobile performance measurement was taken. This is a 3D adaptation of the reference rather than its exact illustrated sprites; small details are simplified.

## Complete generation prompt

Use case: stylized-concept. Production UV material atlas for an abandoned cyberpunk sedan and street debris in a 3D isometric zombie game. Square texture exactly 2x2 equal panels with no gutters, no captions and no background. TOP LEFT: edge-to-edge mottled charcoal violet painted automotive steel with chipped paint, rusty reddish scratches, small green moss spots and weathered seams, flat surface material, no depicted car. TOP RIGHT: edge-to-edge dark blue black shattered automotive window glass with thin irregular spiderweb cracks and missing dark shards, flat material, no window frame. BOTTOM LEFT: edge-to-edge abandoned car side panel orthographic flat texture, two weathered purple grey car doors with handles and lower rusty rocker panel, no wheels, no windows, no background. BOTTOM RIGHT: edge-to-edge dirty old pale grey newspaper surface, tiny columns of illegible print, a couple of faded photographs, stains and creases. Rich detailed painted anime game environment material matching user's rusted ivy-covered sedan reference; restrained orange and magenta edge highlights, cool indigo shadows. No perspective, no full vehicles, no labels or margins. All four materials extend to panel edges.

