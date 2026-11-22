// Neon Bay — shared tuning constants, city layout and story data.
// One job: every magic number and every mission definition lives here.
export const CITY = {
  half: 200,          // playable half-extent in metres
  roadSpacing: 40,    // distance between road centrelines
  roadWidth: 12,
  blockSize: 28,
  beachX: -200,       // sand starts west of here
  oceanX: -232,
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  radius: 0.6,
  maxHealth: 100,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 34,
  maxReverse: 10,
  turnRate: 1.9,
  drag: 0.6,
};

// Vehicle catalogue: name, top speed multiplier, accel multiplier, colour palette.
export const VEHICLE_TYPES = {
  sedan:  { name: 'Coral Sedan',   speed: 1.0,  accel: 1.0,  colors: [0x3fa7d6, 0xd6d6d6, 0x2e4057, 0xc94f6d] },
  taxi:   { name: 'Bay Taxi',      speed: 0.95, accel: 1.0,  colors: [0xf2c230, 0xf2c230] },
  sports: { name: 'Vortex GT',     speed: 1.35, accel: 1.35, colors: [0xe63946, 0x111111, 0xff7b00] },
  truck:  { name: 'Harbor Truck',  speed: 0.8,  accel: 0.75, colors: [0x7a7a7a, 0x4a6b8a, 0x8a6b4a] },
  van:    { name: 'Surf Van',      speed: 0.9,  accel: 0.9,  colors: [0x2ec4b6, 0xf4a261, 0xe9c46a] },
  police: { name: 'NBPD Interceptor', speed: 1.2, accel: 1.25, colors: [0x101418] },
};

// Story: Kai Vega, a courier who just arrived in Neon Bay, takes jobs from
// fixer Mara Solis to pay off his late brother's debt to the Coral Kings.
export const MISSIONS = [
  {
    id: 'first-wheels', title: 'Misi 1 — Roda Pertama',
    giver: 'Mara Solis', reward: 250,
    brief: 'Mara butuh kurir beroda. Curi mobil apa saja (tekan E di dekat mobil), lalu bawa ke bengkelnya di timur kota.',
    steps: [
      { kind: 'stealCar', text: 'Curi sebuah mobil (E di dekat mobil)' },
      { kind: 'goto', pos: [150, -130], radius: 17, text: 'Antar mobil ke Bengkel Mara (marker kuning)' },
    ],
  },
  {
    id: 'beach-run', title: 'Misi 2 — Paket Pantai',
    giver: 'Mara Solis', reward: 400,
    brief: 'Antar paket ke Pondok Pasir di pantai barat. Jangan sampai terlambat — kliennya tidak sabar.',
    timeLimit: 75,
    steps: [
      { kind: 'goto', pos: [-185, 150], radius: 11, text: 'Antar paket ke Pondok Pasir di pantai (75 detik)' },
    ],
  },
  {
    id: 'heat', title: 'Misi 3 — Panas',
    giver: 'Mara Solis', reward: 500,
    brief: 'Seseorang membocorkan namamu ke NBPD. Bintang wanted naik — hilangkan polisi dari ekormu.',
    steps: [
      { kind: 'loseCops', text: 'Hilangkan polisi: wanted kembali ke 0' },
    ],
  },
  {
    id: 'rooftop-pickup', title: 'Misi 4 — Tagihan Coral Kings',
    giver: 'Mara Solis', reward: 700,
    brief: 'Tiga penagih Coral Kings menunggumu di gang dekat pelabuhan. Turun dari mobil, hadapi mereka, ambil uangnya.',
    steps: [
      { kind: 'goto', pos: [110, 90], radius: 9, text: 'Datangi gang pelabuhan (marker kuning)' },
      { kind: 'combat', count: 3, text: 'Kalahkan 3 penagih Coral Kings (klik untuk menembak)' },
      { kind: 'goto', pos: [150, -130], radius: 17, text: 'Bawa uang ke Bengkel Mara' },
    ],
  },
  {
    id: 'neon-heist', title: 'Misi 5 — Perampokan Neon',
    giver: 'Mara Solis', reward: 1500,
    brief: 'Pekerjaan terakhir: ambil uang tunai dari Bank Merdeka, lalu kabur ke tempat persembunyian di ujung selatan dengan polisi di ekormu.',
    steps: [
      { kind: 'goto', pos: [-30, -30], radius: 19, text: 'Masuk ke Bank Merdeka' },
      { kind: 'escape', pos: [30, 170], radius: 15, text: 'Kabur ke tempat persembunyian di selatan (wanted 3!)' },
    ],
  },
];

export const STORY_INTRO =
  'Neon Bay, 2026. Kai Vega baru tiba di kota pantai ini dengan satu tas, ' +
  'satu utang warisan kakaknya, dan satu nama di buku teleponnya: Mara Solis, ' +
  'perantara pekerjaan yang tidak pernah ditanya asal-usulnya.';
