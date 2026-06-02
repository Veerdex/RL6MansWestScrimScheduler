export interface TeamInfo {
  rank: number;
  name: string;
  group: string;
  players: [string, string, string];
  rating: number;
}

export const GROUP_COLORS: Record<string, { badge: string; dot: string }> = {
  'Royal Gramma':              { badge: 'bg-purple-800/50 text-purple-300 border border-purple-700', dot: 'bg-purple-400' },
  'Blobfish':                  { badge: 'bg-pink-800/50 text-pink-300 border border-pink-700',       dot: 'bg-pink-400' },
  'Boops Boops':               { badge: 'bg-teal-800/50 text-teal-300 border border-teal-700',       dot: 'bg-teal-400' },
  "Humuhumunukunukuapua'a":    { badge: 'bg-amber-800/50 text-amber-300 border border-amber-700',    dot: 'bg-amber-400' },
};

export const TEAMS_DATA: TeamInfo[] = [
  { rank: 1,  name: "Santa's Sack",          group: 'Royal Gramma',           players: ['CivilPangolin', 'coletia', 'lunnasuki'],       rating: 1760.1 },
  { rank: 2,  name: 'Flowerboys',             group: 'Blobfish',               players: ['yough', 'peelz', 'frawd.'],                   rating: 1754.9 },
  { rank: 3,  name: 'Tsukuyomi',              group: 'Boops Boops',            players: ['mekohh', 'its_stunt', 'heyitsnate'],          rating: 1751.4 },
  { rank: 4,  name: 'Shorpify Rebellion',     group: "Humuhumunukunukuapua'a", players: ['b0bbbbby', 'shore275', 'scorpionnest'],        rating: 1745.2 },
  { rank: 5,  name: 'Los Habibis',            group: 'Blobfish',               players: ['syed.moqhtar', 'jaay.esports', 'Murc'],       rating: 1740.8 },
  { rank: 6,  name: 'Slot Team 6',            group: "Humuhumunukunukuapua'a", players: ['.hiding.', 'duri', '_realth'],                rating: 1723.4 },
  { rank: 7,  name: 'Beef Brawlers',          group: "Humuhumunukunukuapua'a", players: ['Benbo', '_thankful', 'steakfight'],           rating: 1723.3 },
  { rank: 8,  name: 'Arrh Arrh Arrh',         group: 'Royal Gramma',           players: ['doublerl', 'NightmareRally', 'nebs48'],       rating: 1718.5 },
  { rank: 9,  name: 'Tasselled Wobbegong',    group: 'Boops Boops',            players: ['Galaxxyzs', 'imshelly', 'Wormseatdirt'],      rating: 1715.9 },
  { rank: 10, name: 'Stickless',              group: "Humuhumunukunukuapua'a", players: ['.huntr', 'Rycer', 'scottilars'],              rating: 1714.8 },
  { rank: 11, name: 'Deep Sea Dominators',    group: 'Blobfish',               players: ['pufferfishguy', 'AdamS', 'qoldres'],         rating: 1714.6 },
  { rank: 12, name: 'Bricked Beyond Belief',  group: 'Royal Gramma',           players: ['boone.', 'bava.', '.be.ni.'],                 rating: 1704.4 },
  { rank: 13, name: "Shrek's Minions",        group: 'Boops Boops',            players: ['Dekogon', 'docswag', 'thesimpleshark'],       rating: 1699.1 },
  { rank: 14, name: '3 Pickles In a Pod',     group: "Humuhumunukunukuapua'a", players: ['Pickle King', 'issasonofgod', 'Veerdex'],     rating: 1697.0 },
  { rank: 15, name: 'Full Send FC',           group: 'Royal Gramma',           players: ['jardeh', 'Csmk.', 'Spekkzy'],                rating: 1693.3 },
  { rank: 16, name: 'Bandits',                group: 'Blobfish',               players: ['Ultramag.', 'dread3506', 'pigkilleryt'],      rating: 1687.8 },
  { rank: 17, name: 'Sophisticated Gentlemen',group: 'Royal Gramma',           players: ['Louie', 'ClassyTx', 'arby8812'],             rating: 1687.1 },
  { rank: 18, name: 'One in a Krillion',      group: 'Royal Gramma',           players: ['Beanboy', 'latumos', 'ollieidk'],            rating: 1684.9 },
  { rank: 19, name: '$2 and an Overpay',      group: 'Boops Boops',            players: ['webajablasted', 'PixelSkills', 'aerose_.'],   rating: 1683.1 },
  { rank: 20, name: 'Zouch Oven',             group: 'Blobfish',               players: ['el_swift', 'nerolyk24', 'hamtheone'],        rating: 1671.9 },
  { rank: 21, name: 'DUI',                    group: "Humuhumunukunukuapua'a", players: ['ejjrl', 'aWannaBe_NERD', 'TiPSY'],           rating: 1669.7 },
  { rank: 22, name: 'Vacay',                  group: 'Royal Gramma',           players: ['anglelr', 'camwinsones', 'lyn._'],           rating: 1664.6 },
  { rank: 23, name: 'Sackpack',               group: 'Boops Boops',            players: ['gioyn', 'aryaneil', 'Sacksquerque'],         rating: 1663.4 },
  { rank: 24, name: 'Absolutely No Clue',     group: 'Boops Boops',            players: ['1zen', 'zokarus', 'dcbl'],                   rating: 1662.6 },
  { rank: 25, name: 'Las Abuelas',            group: 'Boops Boops',            players: ['supabigsteve', 'deb0e', 'Fiatcolour'],       rating: 1659.3 },
  { rank: 26, name: 'Dream Blunt Rotation',   group: 'Blobfish',               players: ['eblacek', 'croutqn', 'shez01'],             rating: 1657.8 },
  { rank: 27, name: 'GentleBR8s',             group: 'Blobfish',               players: ['j8ck', 'virtualtragedy', 'LightStreakz.'],   rating: 1654.9 },
  { rank: 28, name: 'Reef Raiders',           group: 'Royal Gramma',           players: ['noctiv3n', 'thainfernal', 'lasonya_man'],    rating: 1653.8 },
  { rank: 29, name: 'Jimmie Johns',           group: "Humuhumunukunukuapua'a", players: ['brody.jimmie', 'bizi0162', 'Arxh'],          rating: 1650.7 },
  { rank: 30, name: 'Egoists',               group: 'Boops Boops',            players: ['Poggi358', 'cincofs', 'oBlue'],              rating: 1624.9 },
  { rank: 31, name: 'Corona with Lime',       group: 'Blobfish',               players: ['thumper_rl', 'rocket_0766', 'monihead12.3'], rating: 1615.9 },
  { rank: 32, name: 'Sweetie Pis',            group: "Humuhumunukunukuapua'a", players: ['kotala.', 'Smileypieman101', 'Sw33t'],       rating: 1615.4 },
];
