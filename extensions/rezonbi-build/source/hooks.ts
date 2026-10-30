declare const require: (name: string) => any;
const fs = require('fs'), path = require('path');
export const throwError = true;
/** Keep the filesystem-safe ReZONBI.rpk basename; set only its user-visible title. */
export function onBeforeMake(root: string): void {
    const file = path.join(root, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    manifest.name = 'Re:ZONBI';
    fs.writeFileSync(file, JSON.stringify(manifest));
    console.log('Re:ZONBI display name applied by source build extension');
}
