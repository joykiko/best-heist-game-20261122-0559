// The Gilded Frame — the three gallery rooms.
// One job: the maps. Walls and covers block movement and sight; paintings are
// decor on the walls; loot, guards, cameras, lasers and the exit are placed here.

export const ROOMS = [
  {
    name: 'ROOM 1 · THE MARBLE FOYER',
    objective: 'Lift the foyer loot, then slip through the east arch.',
    playerStart: [96, 400],
    exit: { x: 1224, y: 330, w: 40, h: 110, label: 'EAST ARCH' },
    walls: [
      { x: 330, y: 72, w: 26, h: 210 },
      { x: 330, y: 430, w: 26, h: 282 },
      { x: 700, y: 72, w: 26, h: 150 },
      { x: 700, y: 380, w: 26, h: 332 },
      { x: 1010, y: 470, w: 26, h: 242 },
    ],
    covers: [
      { x: 470, y: 250, w: 74, h: 74, kind: 'statue', label: 'MARBLE FOX' },
      { x: 850, y: 560, w: 74, h: 74, kind: 'statue', label: 'BRONZE OWL' },
      { x: 520, y: 560, w: 90, h: 46, kind: 'pedestal', label: '' },
      { x: 900, y: 180, w: 90, h: 46, kind: 'pedestal', label: '' },
    ],
    paintings: [
      { x: 120, y: 76, w: 150, h: 84, hue: 210, title: 'Harbour at Dusk' },
      { x: 420, y: 76, w: 120, h: 84, hue: 20, title: 'The Red Violin' },
      { x: 780, y: 76, w: 150, h: 84, hue: 140, title: 'Garden of Echoes' },
      { x: 120, y: 610, w: 150, h: 72, hue: 280, title: 'Violet Hour' },
      { x: 560, y: 610, w: 130, h: 72, hue: 45, title: 'Sun Over Rye' },
      { x: 1060, y: 76, w: 130, h: 84, hue: 190, title: 'Winter Canal' },
    ],
    loot: [
      { x: 565, y: 583, value: 4000, kind: 'vase', name: 'Jade Vase' },
      { x: 945, y: 203, value: 3000, kind: 'bust', name: 'Bronze Bust' },
      { x: 1140, y: 620, value: 5000, kind: 'brooch', name: 'Pearl Brooch' },
    ],
    guards: [
      { path: [[430, 180], [430, 620], [640, 620], [640, 180]], name: 'Warden Marlowe' },
      { path: [[950, 620], [950, 160], [1150, 160], [1150, 620]], name: 'Warden Ivo' },
    ],
    cameras: [
      { x: 640, y: 78, base: Math.PI / 2, sweep: 0.9, speed: 0.55 },
    ],
    lasers: [
      { x1: 1010, y1: 300, x2: 1010, y2: 470, id: 'L1' },
    ],
  },
  {
    name: 'ROOM 2 · THE PORTRAIT HALL',
    objective: 'Three portraits watch you. Take the tiara — mind the lasers.',
    playerStart: [96, 400],
    exit: { x: 1224, y: 330, w: 40, h: 110, label: 'EAST ARCH' },
    walls: [
      { x: 300, y: 470, w: 26, h: 242 },
      { x: 300, y: 72, w: 26, h: 190 },
      { x: 620, y: 72, w: 26, h: 200 },
      { x: 620, y: 470, w: 26, h: 242 },
      { x: 940, y: 72, w: 26, h: 190 },
      { x: 940, y: 470, w: 26, h: 242 },
    ],
    covers: [
      { x: 450, y: 330, w: 80, h: 80, kind: 'statue', label: 'THE DANCER' },
      { x: 760, y: 330, w: 80, h: 80, kind: 'statue', label: 'THE DUCHESS' },
      { x: 150, y: 150, w: 90, h: 46, kind: 'pedestal', label: '' },
      { x: 1090, y: 560, w: 90, h: 46, kind: 'pedestal', label: '' },
    ],
    paintings: [
      { x: 90, y: 76, w: 130, h: 84, hue: 0, title: 'Lady in Scarlet' },
      { x: 360, y: 76, w: 130, h: 84, hue: 100, title: 'The Gardener' },
      { x: 680, y: 76, w: 130, h: 84, hue: 230, title: 'Admiral Blue' },
      { x: 1000, y: 76, w: 130, h: 84, hue: 320, title: 'The Actress' },
      { x: 360, y: 610, w: 130, h: 72, hue: 55, title: 'Boy with a Kite' },
      { x: 680, y: 610, w: 130, h: 72, hue: 160, title: 'The Beekeeper' },
      { x: 1000, y: 610, w: 130, h: 72, hue: 260, title: 'Night Watchman' },
    ],
    loot: [
      { x: 195, y: 173, value: 6000, kind: 'goblet', name: 'Silver Goblet' },
      { x: 1135, y: 583, value: 8000, kind: 'tiara', name: 'Sapphire Tiara' },
      { x: 430, y: 250, value: 4500, kind: 'mask', name: 'Venetian Mask' },
    ],
    guards: [
      { path: [[200, 300], [200, 620], [560, 620], [560, 300]], name: 'Warden Cole' },
      { path: [[800, 180], [800, 620], [1120, 620], [1120, 180]], name: 'Warden Priya' },
      { path: [[470, 180], [1100, 180], [1100, 560], [470, 560]], name: 'Warden Okafor' },
    ],
    cameras: [
      { x: 460, y: 78, base: Math.PI / 2, sweep: 1.0, speed: 0.7 },
      { x: 820, y: 706, base: -Math.PI / 2, sweep: 1.0, speed: 0.6 },
    ],
    lasers: [
      { x1: 620, y1: 272, x2: 620, y2: 470, id: 'L1' },
      { x1: 940, y1: 262, x2: 940, y2: 470, id: 'L2' },
    ],
  },
  {
    name: 'ROOM 3 · THE GILDED VAULT',
    objective: 'Steal THE GILDED FRAME, then reach the service door.',
    playerStart: [96, 400],
    exit: { x: 1224, y: 560, w: 40, h: 120, label: 'SERVICE DOOR' },
    walls: [
      { x: 380, y: 72, w: 26, h: 240 },
      { x: 380, y: 480, w: 26, h: 232 },
      { x: 760, y: 72, w: 26, h: 180 },
      { x: 760, y: 420, w: 26, h: 292 },
      { x: 1080, y: 72, w: 26, h: 200 },
    ],
    covers: [
      { x: 540, y: 300, w: 84, h: 84, kind: 'statue', label: 'GOLDEN HARE' },
      { x: 900, y: 540, w: 84, h: 84, kind: 'statue', label: 'SILVER STAG' },
      { x: 180, y: 560, w: 90, h: 46, kind: 'pedestal', label: '' },
      { x: 1140, y: 300, w: 90, h: 46, kind: 'pedestal', label: '' },
    ],
    paintings: [
      { x: 480, y: 76, w: 170, h: 96, hue: 48, title: 'THE GILDED FRAME', grand: true },
      { x: 90, y: 76, w: 130, h: 84, hue: 200, title: 'Storm at Sea' },
      { x: 820, y: 76, w: 130, h: 84, hue: 10, title: 'Embers' },
      { x: 90, y: 610, w: 130, h: 72, hue: 130, title: 'Orchard' },
      { x: 480, y: 610, w: 130, h: 72, hue: 300, title: 'The Widow' },
    ],
    loot: [
      { x: 225, y: 583, value: 7000, kind: 'goblet', name: 'Emerald Goblet' },
      { x: 1185, y: 323, value: 9000, kind: 'brooch', name: 'Ruby Brooch' },
      { x: 565, y: 124, value: 50000, kind: 'frame', name: 'THE GILDED FRAME', grand: true },
    ],
    guards: [
      { path: [[300, 200], [300, 620], [700, 620], [700, 200]], name: 'Warden Marlowe' },
      { path: [[900, 160], [900, 620], [1180, 620], [1180, 160]], name: 'Warden Ivo' },
      { path: [[200, 340], [1180, 340], [1180, 560], [200, 560]], name: 'Captain Voss' },
    ],
    cameras: [
      { x: 565, y: 78, base: Math.PI / 2, sweep: 0.8, speed: 0.8 },
      { x: 1080, y: 706, base: -Math.PI / 2, sweep: 1.1, speed: 0.65 },
    ],
    lasers: [
      { x1: 380, y1: 312, x2: 380, y2: 480, id: 'L1' },
      { x1: 760, y1: 252, x2: 760, y2: 420, id: 'L2' },
      { x1: 1080, y1: 272, x2: 1080, y2: 620, id: 'L3' },
    ],
  },
];

// Rects that block sight and movement in a room: its walls plus its covers.
export function blockers(room) { return room.walls.concat(room.covers); }
