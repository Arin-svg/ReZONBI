# Convenience store texture and lighting pass

The convenience store at world X=-11, Z=-11 now loads a generated surface atlas
from `assets/resources/environment/convenience-store-atlas.png`. Its front,
side, rear, and roof panels map to five outward-facing 3D mesh surfaces. The
7-by-6 ground collision footprint is unchanged. Rooftop HVAC, railings, antenna,
planters, vines, drainpipes and facade trim remain separate 3D geometry.

The texture includes painted stocked interiors and surface wear. Those interior
details are not modeled room geometry. The store remains a solid exterior prop.
The coffee shop, pharmacy, and ramen shop now use their own atlases through the same solid-shell renderer; see SHOP-TEXTURES.md.

`ConvenienceStoreTextures.ts` loads the texture via the resources bundle, so no
Inspector texture assignment is required. Existing geometry stays visible until
loading succeeds. Failure logs an error and keeps the fallback. A destroyed store
is ignored by the asynchronous load callback.

The standard lit material uses an albedo texture with mild texture-driven emission
(strongest on the front) and rough exterior surfaces. Two short-range sphere lights
provide pink sign spill and amber entrance spill. This pass does not add bloom,
baked lightmaps, normal maps, or shadow maps. These need live visual and mobile
performance checks before tuning further. The texture contains painted lighting.

Validation: TypeScript check with skipLibCheck; shop fixture verifies resource load,
five UV-mapped faces, outward winding, retained rooftop geometry, two lights, and
unchanged arena collision. Wall-chase and spawn-continuity tests pass. Live Cocos
rendering was unavailable: the computer-use native pipe was unavailable and browser
inventory exposed no tabs. No screenshot of the final in-engine result is claimed.

Art generated using the built-in image_gen tool, guided by
`C:/Users/Arin Ja/Downloads/Cyberpunk Convenience Store Breakdown.png`.

## Generation prompt

Use case: stylized-concept. Asset type: UV texture atlas for a REAL 3D convenience store in an isometric anime zombie survival game. Use the supplied local reference as style/design guidance, NOT as a composition to repeat.
Create ONE square texture atlas precisely divided into 2 columns and 2 rows of equal square quadrants, edge-to-edge textures, NO gutters, NO frames, NO captions.
TOP LEFT: orthographic FRONT ELEVATION of a two-storey Japanese cyberpunk convenience store, perfectly flat front view, no perspective, no roof visible, no pavement. Entire square is facade. Weathered charcoal-violet concrete, exposed pipes, chipped metal, detailed warm amber glass display windows across bottom 40 percent with visible stocked shelves and glass double door on right. Hot pink illuminated sign band at vertical 45-58 percent from top, readable Japanese コンビニ and smaller CONVENIENCE. Upper floor amber windows, stained concrete, cables and hanging vines. Exact rectangular outer edges of wall.
TOP RIGHT: orthographic RIGHT SIDE ELEVATION of the same building, wall fills square, flat view no perspective, two floors, weathered violet panels, electrical meters, pipes, air conditioning grille, small amber windows, maintenance access door, trailing vines. No large text.
BOTTOM LEFT: orthographic REAR ELEVATION of same building, wall fills square. Weathered concrete panels, metal service door, small windows, rusty conduit, utilities, subdued cool purple shadow, bits of green moss. No pavement.
BOTTOM RIGHT: orthographic TOP DOWN roof surface material, flat square dark gray roofing with seams, drains, grime, metal access hatch, subtle damp patches, perimeter moss. NO protruding HVAC or railings rendered in this quadrant because these will be real 3D geometry.
Style: richly detailed hand-painted anime environment texture, restrained realistic surface texture, dramatic warm interior against cool purple exterior, luminous saturated pink signage. Match the reference's gritty but inviting cyberpunk shop. No rendered 3D diorama, no perspective, no background, no titles, no watermark, no grid lines. Each quadrant is a complete flat surface UV map intended to wrap a box building.
