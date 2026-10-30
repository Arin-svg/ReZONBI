import { Label, Node, sys } from 'cc';

export type Language = 'en' | 'ms';
const KEY = 'rezonbi.language.v1';
let language: Language = 'en';
try { language = sys.localStorage.getItem(KEY) === 'ms' ? 'ms' : 'en'; } catch { /* English default */ }
const sources = new WeakMap<Label, { source: string; language: Language; rendered: string }>();
const ms: Record<string, string> = {
    '▶   START': '▶   MULA', 'CONTINUE': 'SAMBUNG', 'SETTINGS': 'TETAPAN', 'EXIT': 'KELUAR',
    'STATS': 'STATISTIK', 'WELCOME TO NEW HAVEN': 'SELAMAT DATANG KE NEW HAVEN',
    'PAUSED': 'DIJEDA', 'PAUSE': 'JEDA', 'RESUME': 'SAMBUNG', 'TUTORIAL': 'PANDUAN',
    'RETURN TO HOMEPAGE': 'KEMBALI KE MENU UTAMA', 'RIN HAS FALLEN': 'RIN TELAH TEWAS',
    'RESTART ENCOUNTER': 'MULA SEMULA', 'STAGE CLEAR': 'PERINGKAT SELESAI',
    'TYRANT DEFEATED': 'TYRANT DITEWASKAN', 'NEXT STAGE': 'PERINGKAT SETERUSNYA',
    'LANGUAGE: ENGLISH': 'BAHASA: BAHASA MELAYU', 'BACK': 'KEMBALI', 'PREVIOUS': 'SEBELUMNYA',
    'NEXT': 'SETERUSNYA', 'CLOSE': 'TUTUP', 'CONFIRM': 'SAHKAN', 'CANCEL': 'BATAL',
    'FIELD GUIDE': 'PANDUAN LAPANGAN', 'RUN RECORD': 'REKOD PERMAINAN',
    'SAVED RUN': 'PERMAINAN TERSIMPAN', 'NO SAVED RUN': 'TIADA PERMAINAN TERSIMPAN',
    'Start a new run?': 'Mulakan permainan baharu?',
    'Your saved checkpoint will be replaced.': 'Simpanan permainan anda akan digantikan.',
    'Save this checkpoint and return home?': 'Simpan kemajuan dan kembali ke menu utama?',
    'Exit Re:ZONBI?': 'Keluar daripada Re:ZONBI?', 'MUTE': 'BISUKAN', 'UNMUTE': 'AKTIFKAN',
    'SURVIVE NEW HAVEN': 'BERTAHAN DI NEW HAVEN',
    'The infected are everywhere. Keep moving and stay alert.': 'Zombi ada di mana-mana. Terus bergerak dan sentiasa berwaspada.',
    'EQUIPPED WEAPONS': 'SENJATA ANDA',
    'Your pistol fires automatically at nearby visible enemies. Use the joystick to move, tap the sword to slash, and tap dodge to evade.': 'Pistol menembak musuh berdekatan yang kelihatan secara automatik. Gerak dengan kayu bedik, ketik pedang untuk menebas dan ketik elak untuk mengelak.',
    'Automatic gunfire attracts more infected. Keep moving and use your sword when enemies surround you.': 'Tembakan automatik menarik lebih banyak zombi. Terus bergerak dan gunakan pedang apabila dikepung musuh.',
    'MOVE  Joystick': 'GERAK  Kayu bedik', 'AUTO FIRE  Nearby enemies': 'TEMBAKAN AUTO  Musuh berdekatan',
    'TAP  Sword / Dodge': 'KETIK  Pedang / Elak',
    'Your pistol has unlimited ammo. Area slash is a short-range attack that can hit multiple enemies.': 'Pistol anda mempunyai peluru tanpa had. Tebasan kawasan ialah serangan jarak dekat yang boleh mengenai beberapa musuh.',
    'NOISE DETECTION': 'PENGESANAN BUNYI',
    'Gunfire attracts more infected. Keep moving after you shoot.': 'Bunyi tembakan menarik lebih banyak zombi. Terus bergerak selepas menembak.',
    'HEALTH AND DAMAGE': 'KESIHATAN DAN KEROSAKAN',
    'Your health is shown here. Avoid taking damage to survive longer.': 'Kesihatan anda dipaparkan di sini. Elakkan serangan musuh untuk bertahan lebih lama.',
    'MINIMAP': 'PETA MINI',
    'The minimap shows your position, enemies, and obstacles in the area.': 'Peta mini menunjukkan kedudukan anda, musuh dan halangan di kawasan ini.',
    'There are still more… ': 'Masih ada lagi…', 'There are still more…': 'Masih ada lagi…',
    'I have to keep moving no matter what.': 'Walau apa pun terjadi, aku mesti terus bergerak.',
    "I can't let them catch me.": 'Aku tak boleh biarkan mereka menangkapku.',
    'I have to survive.': 'Aku mesti terus hidup.',
    'Objective Updated': 'Objektif Dikemas Kini', 'Save Point': 'Titik Simpanan',
    'Health Low': 'Kesihatan Rendah', 'Skill Ready': 'Kemahiran Sedia', 'Area Cleared': 'Kawasan Dibersihkan',
    'Zombie Rush!': 'Serbuan Zombi!', 'Supply Found': 'Bekalan Ditemui', 'Ammo Low': 'Peluru Hampir Habis',
    'Door Locked': 'Pintu Berkunci', 'Item Obtained': 'Item Diperoleh',
    'Survive the horde. Tyrant returns after every 100 zombie kills.': 'Bertahan daripada gerombolan zombi. Tyrant kembali selepas setiap 100 zombi ditewaskan.',
    'Checkpoint restored.': 'Simpanan permainan dipulihkan.', 'Keep going!': 'Teruskan perjuangan!',
    'Dodge and keep your distance.': 'Mengelak dan jaga jarak anda.',
    'Area slash is ready. Tap the knife.': 'Tebasan kawasan sudah sedia. Ketik ikon pisau.',
    'Tyrant defeated. Survival continues.': 'Tyrant ditewaskan. Perjuangan diteruskan.',
    'Incoming infected. Keep moving!': 'Zombi menghampiri. Terus bergerak!',
    'HOLD': 'TAHAN', 'OPEN': 'BUKA', 'COLLECT': 'KUTIP', 'TAP': 'KETIK',
    'HEALTH PACK': 'PEK KESIHATAN', 'AMMO': 'PELURU', 'ENERGY CRYSTAL': 'KRISTAL TENAGA',
    'SLASH / K': 'TEBAS / K', 'SPACE': 'SPACE', 'FIRE': 'TEMBAK', 'SLASH': 'TEBAS', 'DODGE': 'ELAK', 'LEVEL UP': 'NAIK TAHAP',
    'Choose an upgrade': 'Pilih naik taraf', 'REWARD DROP': 'GANJARAN',
    'RESIDENTIAL AREA': 'KAWASAN KEDIAMAN', 'Explore the streets': 'Terokai jalan-jalan',
    'WASD / arrows or left joystick': 'WASD / anak panah atau kayu bedik kiri',
    'Tap RESUME to continue': 'Ketik SAMBUNG untuk meneruskan',
    'MOVE  WASD / arrows': 'GERAK  WASD / anak panah',
    'FIRE  J / mouse    SLASH  K (15s)': 'TEMBAK  J / tetikus    TEBAS  K (15s)',
    'DODGE  Space    PAUSE  Esc': 'ELAK  Space    JEDA  Esc',
    'Bullet Storm': 'Ribut Peluru', 'Blade Cyclone': 'Puting Beliung Bilah',
    'Shadow Dash': 'Pecutan Bayang', 'Electric Pulse': 'Denyutan Elektrik',
    'Bloodlust': 'Dahaga Darah', 'Zombie Magnet': 'Magnet Zombi',
    '+1 assisted shot per volley': '+1 tembakan bantuan setiap salvo',
    'Volley damage +25%': 'Kerosakan salvo +25%', '+2 assisted shots per volley': '+2 tembakan bantuan setiap salvo',
    'Fire interval reduced 20%': 'Sela tembakan dikurangkan 20%',
    'Extra shots reach 4m farther': 'Tembakan tambahan mencapai 4m lebih jauh',
    'Damaging afterimage': 'Bayangan yang menyebabkan kerosakan', 'per attributed kill': 'bagi setiap musuh yang anda tewaskan',
};
// Uppercase notification headings use the same catalogue as their source titles.
for (const key of Object.keys(ms)) if (!(key.toUpperCase() in ms)) ms[key.toUpperCase()] = ms[key].toUpperCase();

function line(value: string): string {
    if (ms[value] !== undefined) return ms[value];
    return value
        .replace(/^GRAPHICS  ‹  (HIGH|LOW)  ›$/, (_, q) => `GRAFIK  ‹  ${q === 'HIGH' ? 'TINGGI' : 'RENDAH'}  ›`)
        .replace(/^MUSIC  /, 'MUZIK  ').replace(/^SFX  /, 'KESAN BUNYI  ')
        .replace(/^Level (\d+)(.*?)(\d+) kills$/, 'Tahap $1$2$3 ditewaskan')
        .replace(/^Survived /, 'Bertahan ').replace(/^LEVEL (\d+)(.*?) KILLS$/, 'TAHAP $1$2 DITEWASKAN')
        .replace(/^TIME  (.*?)  \?  KILLS  (\d+)$/, 'MASA  $1  ·  DITEWASKAN  $2')
        .replace(/^WAVE /, 'GELOMBANG ').replace(/^INFECTED /, 'ZOMBI ')
        .replace(/^(HOLD|OPEN|COLLECT|TAP|HEALTH PACK|AMMO|ENERGY CRYSTAL)(  .*)$/, (_, key, rest) => ms[key] + rest)
        .replace(/^(\d+) orbiting blades$/, '$1 bilah berputar').replace(/^(\d+) contact damage$/, '$1 kerosakan sentuhan')
        .replace(/^Dodge cooldown (.*)$/, 'Masa pulih elakan $1').replace(/^Distance (.*)$/, 'Jarak $1')
        .replace(/^(\d+) area damage \/ (.*)$/, '$1 kerosakan kawasan / $2')
        .replace(/^Radius (.*) \+ stun$/, 'Jejari $1 + pelalian').replace(/^Restore (\d+) HP$/, 'Pulihkan $1 HP')
        .replace(/^EXP attraction radius (.*)$/, 'Jejari tarikan EXP $1').replace(/^Pickup radius (.*)$/, 'Jejari kutipan $1');
}
export function getLanguage(): Language { return language; }
export function translate(value: string): string { return language === 'en' ? value : value.split('\n').map(line).join('\n'); }
export function localizedText(label: Label, source: string): void {
    const previous = sources.get(label);
    if (previous && previous.source === source && previous.language === language && label.string === previous.rendered) return;
    const value = translate(source);
    if (previous) { previous.source = source; previous.language = language; previous.rendered = value; }
    else sources.set(label, { source, language, rendered: value });
    if (label.string !== value) label.string = value;
}
export function setLanguage(next: Language, root?: Node): void {
    language = next;
    try { sys.localStorage.setItem(KEY, next); } catch { /* Still switch for this session. */ }
    // Refresh existing labels only on a language change; WeakMap does not retain destroyed UI.
    const refresh = (node: Node) => {
        const label = node.getComponent(Label);
        const previous = label && sources.get(label);
        // Leave labels owned by other systems (e.g. pooled damage numbers) alone.
        if (label && previous && label.string === previous.rendered) localizedText(label, previous.source);
        for (const child of node.children) refresh(child);
    };
    if (root) refresh(root);
}
