"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwError = void 0;
exports.onBeforeMake = onBeforeMake;
const fs = require('fs'), path = require('path');
exports.throwError = true;
/** Keep the filesystem-safe ReZONBI.rpk basename; set only its user-visible title. */
function onBeforeMake(root) {
    const file = path.join(root, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    manifest.name = 'Re:ZONBI';
    fs.writeFileSync(file, JSON.stringify(manifest));
    console.log('Re:ZONBI display name applied by source build extension');
}
