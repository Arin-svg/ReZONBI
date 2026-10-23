# Worn car colors

The three cars now use faded red (#CF7770), grey-white (#DBD8CD), and faded orange (#E8A169) body tints. Glass and litter remain untinted; rust, scratches and chipped paint remain in the atlas. The orange car retains broken headlights. Geometry and collisions are unchanged.

New asset: `assets/resources/environment/worn-car-paint-atlas.png`. The original abandoned-street atlas is preserved. TypeScript and shop/street fixture checks pass; final in-engine appearance is not visually verified.

Built-in image_gen edit, using abandoned-street-atlas.png as the source. Complete prompt:

Edit this 2x2 game material atlas. Preserve its exact four quadrant layout and all texture details. Change ONLY the automotive paint color in TOP LEFT metal and BOTTOM LEFT car door panels from purple to faded light warm grey-white paint, desaturated enough that runtime red and orange material tints will be clear. Preserve dark rust, chipped holes, scratches, grime and door handles. Keep TOP RIGHT cracked glass and BOTTOM RIGHT newspaper unchanged. Same square dimensions, no margins or labels. This is a neutral worn car paint base for tinting red, grey-white and orange cars in a game.
