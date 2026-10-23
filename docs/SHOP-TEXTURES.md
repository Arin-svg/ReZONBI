# Remaining shop textures

Coffee shop (+/- locations as placed by ResidentialArena), pharmacy, and ramen shop now use separate generated 1254px atlases in assets/resources/environment:

- coffee-shop-atlas.png — amber cafe signage and warm windows
- pharmacy-atlas.png — cyan medical signage and stocked glass storefront
- ramen-shop-atlas.png — red signage, lanterns and warm counter interior

The convenience store retains its existing atlas. All four use the shared applyShopTextures renderer in ConvenienceStoreTextures.ts. Solid 7x6 footprints, five outward-facing surfaces, rooftop geometry and collision are preserved. Each shop has two local sphere lights, colored neon and amber entrance spill. Texture loading needs no Inspector assignments and failure retains procedural fallback geometry. Measured UV panel bounds exclude gutters and accommodate the ramen sheet's uneven row split.

These are detailed illustrated surface textures guided by the supplied reference, not exact reproductions or modeled interiors. Painted window contents and some utilities remain texture detail; roof equipment, rails, vines and facade trim provide real 3D depth. No normal maps or bloom are added. TypeScript and shop fixture checks pass; live in-engine rendering was unavailable, so final lighting and mobile performance still need preview validation.

## Art provenance and complete prompts

Generated with the built-in image_gen tool. Each prompt was the following common specification followed by the shop-specific suffix.

Use case: stylized-concept. Create a production game building texture atlas, square image, EXACTLY four equal square quadrants with NO gutters, NO margins, NO labels. Top-left FRONT elevation, top-right SIDE elevation, bottom-left REAR elevation, bottom-right straight overhead ROOF. Each surface fills its entire quadrant edge to edge, no background. All walls strictly orthographic flat elevations with no perspective, roof strictly overhead. Dense detailed painted cyberpunk Japanese shop like the user's reference: weathered purple grey panels, cables, drainpipes, ivy, air conditioning units, warm upper windows, neon signs, richly detailed illuminated glass storefront at street level. Two storeys. Front sign band between 41% and 59% down the front panel, storefront below it. Flat texture ready to UV map to a solid 3D building, not a sprite or presentation sheet. No exterior bloom spilling across quadrant boundaries. Roof worn panels and ducts with subtle plants. 

### coffee-shop

Coffee shop with amber orange カフェ sign and small CAFE subtitle, cup icon, inviting warmly lit cafe interior, wood framed glass doors, coffee equipment, plants. Side vertical amber coffee sign.

### pharmacy

Pharmacy with luminous cyan blue 薬局 sign and large medical cross, bright organized medicine shelves behind glass, blue vending machine. Side vertical cyan sign.

### ramen-shop

Ramen shop with vivid red ラーメン sign and bowl icon, orange glowing interior, stools and counter behind glass, red hanging lanterns. Side vertical red ramen sign.

