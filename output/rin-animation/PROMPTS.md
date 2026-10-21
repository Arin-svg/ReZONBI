# Rin run artwork generation

Tool: built-in image_gen (no API/CLI fallback).
References: assets/art/characters/rin/rin-idle-run.png and run/run_right_00.png.
Output: source/front.png, source/back.png, source/left.png; packed by tools/pack-rin-run.ps1 into the existing runtime atlas paths.

## Shared production prompt

Create a production 2.5D game sprite animation sheet of the reference character Rin, an athletic adult, in the same detailed painted anime style. Preserve silver-pink twin tails, red eyes, black/red ribbons, cropped black tactical top, red/black jacket tails, short black skirt and straps, red/black boots. Exactly eight distinct sequential full-body running poses in a four-column, two-row equal-cell grid, reading order 0..7, 1536x1024 transparent RGBA. Consistent character scale, fixed camera, centered pelvis and generous cell padding. Arms oppose legs, moderate hair/jacket secondary motion. No weapon, text, labels, grid lines, floor, shadow, motion streaks, colored backdrop or magenta/red contamination. Never substitute duplicates or simple translation/warping for changed leg poses.

## Direction-specific prompt set

- FRONT: run directly toward viewer. Frame 0 left foot forward contact/right leg back; 1 left knee loading/right foot lifts; 2 left support/right knee passes forward; 3 right knee high forward flight/left leg folds behind; 4 right forward contact/left back; 5 right knee loading/left lifts; 6 right support/left knee passes; 7 left knee high flight/right folds behind. Anatomical left/right, different knee/ankle silhouettes every frame.
- BACK: run away from viewer, never show face/front torso. Preserve hood and jacket back. Same alternating contact/loading/passing/flight cycle. Raised trailing heels expose boot soles. Clear alternating anatomical legs and consistent near/far relationship.
- LEFT: nose faces left edge, moderate forward body lean. Frame 0 near leg extended left heel contact/far leg stretched right behind; 1 near support bends/far heel lifts; 2 near vertical support/far knee passes; 3 airborne far knee high left/near heel folded right; 4 far left contact/near right trailing; 5 far bends/near heel lifts; 6 far supports/near passes; 7 airborne near knee high left/far heel folded right. Different foot/knee positions in every frame.

## Final front-sheet edit prompt

Background-extraction edit only. Remove the entire pink/burgundy gradient background from this sprite sheet, including every gap between legs, arms, hair and jacket. Output true transparent RGBA alpha, no painted checkerboard, no backdrop, no shadows. Preserve all eight character poses, all original foreground colors and details, exact canvas dimensions and grid positions unchanged. Do not redraw characters.

The PNG preview displayed background RGB even where alpha was zero. Alpha was checked directly, and packing composites onto transparent cells. Generated edges can still have colored fringe artifacts; these are not hand-cleaned production sprites. The generated poses were inspected in the rendered game. No claim of hand-authored animation is made.

## RIGHT run addition -- 2026-10-22

Built-in image_gen, referencing source/left.png for the new style and the previous run_right_00.png for right-facing identity. Saved generated source to source/right.png. Final generation prompt:

Create the matching RIGHT-facing run animation sheet for this game's Rin character. Image 1 is the NEW left run sheet: match its detailed painted anime style, costume, anatomy and scale. Image 2 is the old right-facing identity reference. Output EXACTLY EIGHT sequential distinct full-body poses facing RIGHT (nose points right) in a precise FOUR columns by TWO rows grid, 1536x1024 transparent RGBA. Eight EQUAL 384x512 cells. Keep every silhouette fully inside its own cell with at least 16px transparent margins including flowing hair and boots. Same character scale and pelvis center per cell, moderate forward lean, no camera change. Athletic adult Rin: silver-pink long twin tails, red eyes, black/red ribbons, black cropped tactical top, short black skirt, thigh straps, red/black jacket tails, black boots with red soles. Natural strong running cycle in reading order: 0 near leg extends RIGHT heel contact, far leg extends LEFT behind; 1 near supporting knee bends low, far heel rises behind; 2 near leg vertical support, far knee passes forward; 3 airborne far knee high RIGHT, near heel folded LEFT behind; 4 far leg extends RIGHT heel contact, near leg trails LEFT; 5 far support bends, near heel rises; 6 far vertical support, near knee passes forward; 7 airborne near knee high RIGHT, far heel folded LEFT behind. Clearly different foot and knee positions across all eight frames; arms counter-swing. Keep hair motion secondary. No duplicate poses, no simple bob/translate/warp substitute. Preserve outfit asymmetry correctly for the right view. No weapons. No text, labels, grid lines, background, floor, shadow or colored halo. TRUE alpha transparency.

Packing accommodates the first pose's boot extending past its nominal cell, excluding neighboring hair from that frame. All four atlases are now 3072x384 with 384x384 cells, max content height 336 and foot baseline 360. Previous right atlas and frames are in legacy/.
