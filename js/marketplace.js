// js/marketplace.js
// Marketplace item catalog and inventory system

const INVENTORY_PREFIX = 'goblox_inventory_';
const EQUIPPED_PREFIX = 'goblox_equipped_';

/**
 * Rarity tiers with colors
 */
export const RARITY = {
    COMMON:    { label: 'Common',    color: '#9e9e9e', bg: 'rgba(158,158,158,0.12)' },
    UNCOMMON:  { label: 'Uncommon',  color: '#55efc4', bg: 'rgba(85,239,196,0.12)' },
    RARE:      { label: 'Rare',      color: '#74b9ff', bg: 'rgba(116,185,255,0.12)' },
    EPIC:      { label: 'Epic',      color: '#a29bfe', bg: 'rgba(162,155,254,0.12)' },
    LEGENDARY: { label: 'Legendary', color: '#ffd700', bg: 'rgba(255,215,0,0.12)' },
};

/**
 * Categories
 */
export const CATEGORIES = [
    { id: 'all',         label: 'Alle Items',   icon: '🏪' },
    { id: 'hats',        label: 'Huete',        icon: '🎩' },
    { id: 'hair',        label: 'Haare',        icon: '💇' },
    { id: 'faces',       label: 'Gesichter',    icon: '😎' },
    { id: 'tshirts',     label: 'T-Shirts',     icon: '👕' },
    { id: 'pants',       label: 'Hosen',        icon: '👖' },
    { id: 'accessories', label: 'Accessoires',  icon: '💎' },
    { id: 'animations',  label: 'Animationen',  icon: '🕺' },
    { id: 'gamepasses',  label: 'Game Passes',  icon: '🎮' },
    { id: 'bundles',     label: 'Bundles',       icon: '📦' },
];

/**
 * Full marketplace item catalog
 */
export const MARKETPLACE_ITEMS = [
    // ════════════════════════════════════════════════════════════════
    // HATS (20)
    // ════════════════════════════════════════════════════════════════
    { id: 'hat_krone',          name: 'Goldene Krone',         category: 'hats', description: 'Eine prachtvolle goldene Krone fuer wahre Herrscher.', price: 2500, icon: '👑', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'hat_baseballkappe',  name: 'Baseballkappe',         category: 'hats', description: 'Klassische Kappe fuer den sportlichen Look.', price: 75, icon: '🧢', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hat_zylinder',       name: 'Zylinder',              category: 'hats', description: 'Ein eleganter schwarzer Zylinder.', price: 350, icon: '🎩', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'hat_helm',           name: 'Ritterhelm',            category: 'hats', description: 'Robuster Stahlhelm eines tapferen Ritters.', price: 500, icon: '⚔️', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'hat_pirat',          name: 'Piratenhut',            category: 'hats', description: 'Ahoi! Der klassische Piratenhut mit Totenkopf.', price: 300, icon: '🏴‍☠️', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'hat_cowboy',         name: 'Cowboyhut',             category: 'hats', description: 'Yeehaw! Ein brauner Lederhut aus dem Wilden Westen.', price: 200, icon: '🤠', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'hat_party',          name: 'Partyhut',              category: 'hats', description: 'Bunter Partyhut fuer jede Feier.', price: 50, icon: '🥳', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hat_ninja',          name: 'Ninja Stirnband',       category: 'hats', description: 'Schwarzes Stirnband eines Schatten-Kriegers.', price: 400, icon: '🥷', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'hat_astronaut',      name: 'Astronautenhelm',       category: 'hats', description: 'Futuristischer Helm fuer Weltraumabenteurer.', price: 1500, icon: '🧑‍🚀', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'hat_wikinger',       name: 'Wikingerhelm',          category: 'hats', description: 'Helm mit Hoernern eines nordischen Kriegers.', price: 450, icon: '⚡', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'hat_hexe',           name: 'Hexenhut',              category: 'hats', description: 'Spitzer lila Hut voller magischer Kraft.', price: 350, icon: '🧙', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'hat_barett',         name: 'Kuenstler Barett',      category: 'hats', description: 'Stilvolles Barett fuer kreative Koepfe.', price: 100, icon: '🎨', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hat_muetze',         name: 'Wintermuetze',          category: 'hats', description: 'Warme Strickmuetze mit Bommel.', price: 80, icon: '🧶', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hat_feuerwehr',      name: 'Feuerwehrhelm',         category: 'hats', description: 'Roter Helm eines mutigen Feuerwehrmanns.', price: 250, icon: '🚒', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'hat_koch',           name: 'Kochmuetze',            category: 'hats', description: 'Die klassische weisse Kochmuetze.', price: 120, icon: '👨‍🍳', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hat_detektiv',       name: 'Detektiv Hut',          category: 'hats', description: 'Brauner Filzhut eines Meisterdetektivs.', price: 300, icon: '🔍', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'hat_diamant',        name: 'Diamantkrone',          category: 'hats', description: 'Eine mit Diamanten besetzte Krone. Extrem selten!', price: 5000, icon: '💎', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'hat_pilz',           name: 'Pilzhut',               category: 'hats', description: 'Ein lustiger rot-weisser Pilzhut.', price: 150, icon: '🍄', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'hat_regenbogen',     name: 'Regenbogen Hut',        category: 'hats', description: 'Ein Hut in allen Farben des Regenbogens.', price: 800, icon: '🌈', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'hat_roboter',        name: 'Roboter Antenne',       category: 'hats', description: 'Blinkende Antenne fuer Roboter-Fans.', price: 600, icon: '🤖', rarity: 'RARE', creator: 'GoBlox' },

    // ════════════════════════════════════════════════════════════════
    // HAIR (12)
    // ════════════════════════════════════════════════════════════════
    { id: 'hair_kurz',          name: 'Kurzhaarschnitt',       category: 'hair', description: 'Klassischer kurzer Haarschnitt.', price: 0, icon: '💇‍♂️', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hair_lang',          name: 'Lange Haare',           category: 'hair', description: 'Lange, fliessende Haare.', price: 100, icon: '💇‍♀️', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hair_locken',        name: 'Lockenpracht',          category: 'hair', description: 'Wunderschoene natuerliche Locken.', price: 150, icon: '🌀', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'hair_pferdeschwanz', name: 'Pferdeschwanz',         category: 'hair', description: 'Sportlicher Pferdeschwanz-Look.', price: 75, icon: '🎀', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'hair_irokese',       name: 'Irokese',               category: 'hair', description: 'Punk-Style Irokese in Neonfarben.', price: 300, icon: '⚡', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'hair_afro',          name: 'Afro',                  category: 'hair', description: 'Grosser, stolzer Afro-Look.', price: 200, icon: '✊', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'hair_zoepfe',        name: 'Geflochtene Zoepfe',    category: 'hair', description: 'Kunstvoll geflochtene Zoepfe.', price: 250, icon: '🎗️', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'hair_dutt',          name: 'Eleganter Dutt',        category: 'hair', description: 'Perfekter Dutt fuer elegante Anlaesse.', price: 175, icon: '💫', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'hair_feuer',         name: 'Feuerhaare',            category: 'hair', description: 'Haare, die wie Flammen lodern!', price: 1200, icon: '🔥', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'hair_eis',           name: 'Eisige Straehnen',      category: 'hair', description: 'Kristallblaue, gefrorene Haare.', price: 800, icon: '❄️', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'hair_galaxy',        name: 'Galaxy Haare',          category: 'hair', description: 'Haare mit dem Muster eines Sternennebels.', price: 1500, icon: '🌌', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'hair_neon',          name: 'Neon Glow',             category: 'hair', description: 'Leuchtende Neon-Haare, die im Dunkeln gluehen.', price: 500, icon: '💡', rarity: 'EPIC', creator: 'GoBlox' },

    // ════════════════════════════════════════════════════════════════
    // FACES (10)
    // ════════════════════════════════════════════════════════════════
    { id: 'face_laecheln',      name: 'Freundliches Laecheln', category: 'faces', description: 'Ein warmes, einladendes Laecheln.', price: 0, icon: '😊', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'face_cool',          name: 'Cool Sonnenbrille',     category: 'faces', description: 'Schwarze Sonnenbrille fuer den coolen Look.', price: 200, icon: '😎', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'face_ueberrascht',   name: 'Ueberrascht',           category: 'faces', description: 'Grosser Mund und runde Augen!', price: 100, icon: '😲', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'face_wuetend',       name: 'Kampfgesicht',          category: 'faces', description: 'Furchterregendes Kampfgesicht.', price: 250, icon: '😡', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'face_roboter',       name: 'Roboter Gesicht',       category: 'faces', description: 'Mechanische Augen und LED-Mund.', price: 600, icon: '🤖', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'face_zombie',        name: 'Zombie Fratze',         category: 'faces', description: 'Gruseliges Untoten-Gesicht.', price: 400, icon: '🧟', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'face_galaxie',       name: 'Galaxie-Augen',         category: 'faces', description: 'Augen, die wie Galaxien leuchten.', price: 1000, icon: '🌟', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'face_katze',         name: 'Katzengesicht',         category: 'faces', description: 'Suesse Schnurrhaare und Katzenaugen.', price: 300, icon: '😺', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'face_diamant',       name: 'Diamant Visier',        category: 'faces', description: 'Gesicht aus reinem Diamant. Ultra selten!', price: 3000, icon: '💎', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'face_gluecklich',    name: 'Mega Gluecklich',       category: 'faces', description: 'Das gluecklichste Gesicht aller Zeiten!', price: 50, icon: '🤩', rarity: 'COMMON', creator: 'GoBlox' },

    // ════════════════════════════════════════════════════════════════
    // T-SHIRTS (15)
    // ════════════════════════════════════════════════════════════════
    { id: 'tshirt_rot',         name: 'Rotes T-Shirt',         category: 'tshirts', description: 'Einfaches rotes T-Shirt.', price: 0, icon: '👕', rarity: 'COMMON', creator: 'GoBlox', color: '#e74c3c' },
    { id: 'tshirt_blau',        name: 'Blaues T-Shirt',        category: 'tshirts', description: 'Klassisches blaues T-Shirt.', price: 0, icon: '👕', rarity: 'COMMON', creator: 'GoBlox', color: '#3498db' },
    { id: 'tshirt_gruen',       name: 'Gruenes T-Shirt',       category: 'tshirts', description: 'Frisches gruenes T-Shirt.', price: 0, icon: '👕', rarity: 'COMMON', creator: 'GoBlox', color: '#2ecc71' },
    { id: 'tshirt_schwarz',     name: 'Schwarzes T-Shirt',     category: 'tshirts', description: 'Schlichtes schwarzes T-Shirt.', price: 50, icon: '👕', rarity: 'COMMON', creator: 'GoBlox', color: '#2c3e50' },
    { id: 'tshirt_streifen',    name: 'Streifen Shirt',        category: 'tshirts', description: 'Cooles Shirt mit horizontalen Streifen.', price: 150, icon: '👕', rarity: 'UNCOMMON', creator: 'GoBlox', color: '#e67e22' },
    { id: 'tshirt_sterne',      name: 'Sternen Shirt',         category: 'tshirts', description: 'T-Shirt mit leuchtenden Sternen.', price: 250, icon: '⭐', rarity: 'UNCOMMON', creator: 'GoBlox', color: '#2c3e50' },
    { id: 'tshirt_flammen',     name: 'Flammen Shirt',         category: 'tshirts', description: 'Shirt mit coolen Flammenmustern.', price: 400, icon: '🔥', rarity: 'RARE', creator: 'GoBlox', color: '#e74c3c' },
    { id: 'tshirt_galaxy',      name: 'Galaxy Shirt',          category: 'tshirts', description: 'T-Shirt mit Galaxie-Muster.', price: 600, icon: '🌌', rarity: 'EPIC', creator: 'GoBlox', color: '#6c5ce7' },
    { id: 'tshirt_totenkopf',   name: 'Totenkopf Shirt',       category: 'tshirts', description: 'Schwarzes Shirt mit weissem Totenkopf.', price: 200, icon: '💀', rarity: 'UNCOMMON', creator: 'GoBlox', color: '#2c3e50' },
    { id: 'tshirt_tiger',       name: 'Tiger Shirt',           category: 'tshirts', description: 'Oranges Shirt mit Tigerstreifen.', price: 300, icon: '🐯', rarity: 'RARE', creator: 'GoBlox', color: '#f39c12' },
    { id: 'tshirt_regenbogen',  name: 'Regenbogen Shirt',      category: 'tshirts', description: 'Bunt schillerndes Regenbogen-Shirt.', price: 500, icon: '🌈', rarity: 'EPIC', creator: 'GoBlox', color: '#e91e9b' },
    { id: 'tshirt_gold',        name: 'Goldenes Shirt',        category: 'tshirts', description: 'Glaenzendes goldenes T-Shirt. Premium!', price: 1500, icon: '✨', rarity: 'LEGENDARY', creator: 'GoBlox', color: '#f1c40f' },
    { id: 'tshirt_tarn',        name: 'Tarn Shirt',            category: 'tshirts', description: 'Militaer-Tarnmuster Shirt.', price: 175, icon: '🪖', rarity: 'UNCOMMON', creator: 'GoBlox', color: '#27ae60' },
    { id: 'tshirt_musik',       name: 'Musik Shirt',           category: 'tshirts', description: 'Shirt mit Noten und Kopfhoerer-Design.', price: 225, icon: '🎵', rarity: 'UNCOMMON', creator: 'GoBlox', color: '#9b59b6' },
    { id: 'tshirt_pixel',       name: 'Pixel Art Shirt',       category: 'tshirts', description: 'Retro Pixel-Art Design.', price: 350, icon: '🎮', rarity: 'RARE', creator: 'GoBlox', color: '#00cec9' },

    // ════════════════════════════════════════════════════════════════
    // PANTS (10)
    // ════════════════════════════════════════════════════════════════
    { id: 'pants_jeans',        name: 'Blaue Jeans',           category: 'pants', description: 'Klassische blaue Jeans.', price: 0, icon: '👖', rarity: 'COMMON', creator: 'GoBlox', color: '#2980b9' },
    { id: 'pants_schwarz',      name: 'Schwarze Hose',         category: 'pants', description: 'Elegante schwarze Hose.', price: 75, icon: '👖', rarity: 'COMMON', creator: 'GoBlox', color: '#2c3e50' },
    { id: 'pants_shorts',       name: 'Cargo Shorts',          category: 'pants', description: 'Bequeme Shorts fuer den Sommer.', price: 100, icon: '🩳', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'pants_cargo',        name: 'Cargo Hose',            category: 'pants', description: 'Robuste Cargo-Hose mit vielen Taschen.', price: 200, icon: '👖', rarity: 'UNCOMMON', creator: 'GoBlox', color: '#6c5631' },
    { id: 'pants_sport',        name: 'Sporthose',             category: 'pants', description: 'Sportliche Jogginghose.', price: 125, icon: '🏃', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'pants_tarn',         name: 'Tarn Hose',             category: 'pants', description: 'Militaer-Tarnmuster Hose.', price: 250, icon: '🪖', rarity: 'UNCOMMON', creator: 'GoBlox', color: '#27ae60' },
    { id: 'pants_leder',        name: 'Lederhose',             category: 'pants', description: 'Stilvolle schwarze Lederhose.', price: 400, icon: '🖤', rarity: 'RARE', creator: 'GoBlox', color: '#1a1a2e' },
    { id: 'pants_neon',         name: 'Neon Hose',             category: 'pants', description: 'Leuchtend gruene Neon-Hose.', price: 500, icon: '💚', rarity: 'RARE', creator: 'GoBlox', color: '#00ff87' },
    { id: 'pants_gold',         name: 'Goldene Hose',          category: 'pants', description: 'Glaenzende goldene Hose.', price: 1200, icon: '✨', rarity: 'EPIC', creator: 'GoBlox', color: '#f1c40f' },
    { id: 'pants_flammen',      name: 'Flammen Hose',          category: 'pants', description: 'Hose mit lodernden Flammen!', price: 800, icon: '🔥', rarity: 'EPIC', creator: 'GoBlox', color: '#e74c3c' },

    // ════════════════════════════════════════════════════════════════
    // ACCESSORIES (8)
    // ════════════════════════════════════════════════════════════════
    { id: 'acc_rucksack',       name: 'Abenteuer Rucksack',    category: 'accessories', description: 'Grosser Rucksack fuer Entdecker.', price: 200, icon: '🎒', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'acc_schwert',        name: 'Legendaeres Schwert',   category: 'accessories', description: 'Ein leuchtendes Schwert voller Macht.', price: 1000, icon: '⚔️', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'acc_schild',         name: 'Drachenschild',         category: 'accessories', description: 'Massiver Schild mit Drachen-Emblem.', price: 750, icon: '🛡️', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'acc_fluegel',        name: 'Engelsflugel',          category: 'accessories', description: 'Wunderschoene weisse Fluegel.', price: 2000, icon: '🪽', rarity: 'LEGENDARY', creator: 'GoBlox' },
    { id: 'acc_cape',           name: 'Helden Cape',           category: 'accessories', description: 'Rotes Cape eines Superhelden.', price: 500, icon: '🦸', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'acc_kette',          name: 'Goldkette',             category: 'accessories', description: 'Schwere Goldkette im Hip-Hop Style.', price: 350, icon: '📿', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'acc_brille',         name: 'Nerd Brille',           category: 'accessories', description: 'Grosse runde Nerd-Brille.', price: 100, icon: '🤓', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'acc_skateboard',     name: 'Flammen Skateboard',    category: 'accessories', description: 'Cooles Skateboard mit Flammendesign.', price: 450, icon: '🛹', rarity: 'RARE', creator: 'GoBlox' },

    // ════════════════════════════════════════════════════════════════
    // ANIMATIONS (8)
    // ════════════════════════════════════════════════════════════════
    { id: 'anim_tanz',          name: 'Siegestanz',            category: 'animations', description: 'Cooler Siegestanz nach gewonnenen Spielen.', price: 300, icon: '🕺', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'anim_flip',          name: 'Backflip',              category: 'animations', description: 'Spektakulaerer Rueckwaertssalto.', price: 400, icon: '🤸', rarity: 'RARE', creator: 'GoBlox' },
    { id: 'anim_wave',          name: 'Freundliches Winken',   category: 'animations', description: 'Nette Begruessung fuer andere Spieler.', price: 50, icon: '👋', rarity: 'COMMON', creator: 'GoBlox' },
    { id: 'anim_dab',           name: 'Dab',                   category: 'animations', description: 'Der klassische Dab-Move.', price: 150, icon: '🙆', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'anim_roboter',       name: 'Roboter Tanz',          category: 'animations', description: 'Mechanischer Robotertanz.', price: 250, icon: '🤖', rarity: 'UNCOMMON', creator: 'GoBlox' },
    { id: 'anim_ninja',         name: 'Ninja Pose',            category: 'animations', description: 'Epische Ninja-Kampfpose.', price: 500, icon: '🥷', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'anim_feuerwerk',     name: 'Feuerwerk',             category: 'animations', description: 'Buntes Feuerwerk explodiert um dich herum.', price: 800, icon: '🎆', rarity: 'EPIC', creator: 'GoBlox' },
    { id: 'anim_teleport',      name: 'Teleport Effekt',       category: 'animations', description: 'Verschwinde und erscheine mit Blitzeffekt.', price: 1500, icon: '⚡', rarity: 'LEGENDARY', creator: 'GoBlox' },

    // ════════════════════════════════════════════════════════════════
    // GAME PASSES (8 - matching existing gobux.js passes)
    // ════════════════════════════════════════════════════════════════
    { id: 'gp_speed_boost',     name: 'Speed Boost',           category: 'gamepasses', description: '+20% Bewegungsgeschwindigkeit in allen Spielen.', price: 100, icon: '⚡', rarity: 'UNCOMMON', creator: 'GoBlox', passId: 'speed_boost' },
    { id: 'gp_double_score',    name: 'Double Score',          category: 'gamepasses', description: '2x Punkte-Multiplikator fuer 10 Spiele.', price: 250, icon: '⭐', rarity: 'RARE', creator: 'GoBlox', passId: 'double_score' },
    { id: 'gp_extra_life',      name: 'Extra Life',            category: 'gamepasses', description: '+1 Extra-Leben in allen Spielen.', price: 150, icon: '❤️', rarity: 'UNCOMMON', creator: 'GoBlox', passId: 'extra_life' },
    { id: 'gp_vip_badge',       name: 'VIP Badge',             category: 'gamepasses', description: 'Goldener Name in der Rangliste.', price: 500, icon: '🏅', rarity: 'EPIC', creator: 'GoBlox', passId: 'vip_badge' },
    { id: 'gp_neon_trail',      name: 'Neon Trail',            category: 'gamepasses', description: 'Leuchtender Trail-Effekt hinter dem Spieler.', price: 200, icon: '💜', rarity: 'RARE', creator: 'GoBlox', passId: 'neon_trail' },
    { id: 'gp_lucky_start',     name: 'Lucky Start',           category: 'gamepasses', description: 'Starte jedes Spiel mit +50 Bonuspunkten.', price: 75, icon: '🍀', rarity: 'COMMON', creator: 'GoBlox', passId: 'lucky_start' },
    { id: 'gp_shield',          name: 'Shield',                category: 'gamepasses', description: 'Starte Survival-Spiele mit einem Schild.', price: 300, icon: '🛡️', rarity: 'RARE', creator: 'GoBlox', passId: 'shield' },
    { id: 'gp_time_freeze',     name: 'Time Freeze',           category: 'gamepasses', description: '+10 Sekunden in Zeitspielen.', price: 400, icon: '⏱️', rarity: 'EPIC', creator: 'GoBlox', passId: 'time_freeze' },

    // ════════════════════════════════════════════════════════════════
    // BUNDLES (6)
    // ════════════════════════════════════════════════════════════════
    { id: 'bundle_ritter',      name: 'Ritter Set',            category: 'bundles', description: 'Komplette Ritterruestung: Helm, Schwert, Schild und Cape.', price: 2000, icon: '⚔️', rarity: 'LEGENDARY', creator: 'GoBlox', bundleItems: ['hat_helm', 'acc_schwert', 'acc_schild', 'acc_cape'], originalPrice: 2750 },
    { id: 'bundle_space',       name: 'Space Set',             category: 'bundles', description: 'Astronautenhelm, Galaxy Shirt und Galaxy Haare.', price: 2500, icon: '🚀', rarity: 'LEGENDARY', creator: 'GoBlox', bundleItems: ['hat_astronaut', 'tshirt_galaxy', 'hair_galaxy'], originalPrice: 3700 },
    { id: 'bundle_ninja',       name: 'Ninja Set',             category: 'bundles', description: 'Ninja Stirnband, schwarzes Shirt und Ninja Pose.', price: 750, icon: '🥷', rarity: 'EPIC', creator: 'GoBlox', bundleItems: ['hat_ninja', 'tshirt_schwarz', 'anim_ninja'], originalPrice: 950 },
    { id: 'bundle_neon',        name: 'Neon Set',              category: 'bundles', description: 'Neon Haare, Regenbogen Shirt und Neon Hose.', price: 1200, icon: '💡', rarity: 'EPIC', creator: 'GoBlox', bundleItems: ['hair_neon', 'tshirt_regenbogen', 'pants_neon'], originalPrice: 1500 },
    { id: 'bundle_starter',     name: 'Starter Paket',         category: 'bundles', description: 'Perfekt fuer Anfaenger: Baseballkappe, Blaues Shirt, Jeans und Rucksack.', price: 250, icon: '🎁', rarity: 'UNCOMMON', creator: 'GoBlox', bundleItems: ['hat_baseballkappe', 'tshirt_blau', 'pants_jeans', 'acc_rucksack'], originalPrice: 275 },
    { id: 'bundle_feuer',       name: 'Feuer & Flamme Set',    category: 'bundles', description: 'Feuerhaare, Flammen Shirt, Flammen Hose und Feuerwerk.', price: 2200, icon: '🔥', rarity: 'LEGENDARY', creator: 'GoBlox', bundleItems: ['hair_feuer', 'tshirt_flammen', 'pants_flammen', 'anim_feuerwerk'], originalPrice: 3200 },
];

/**
 * GoBux purchase packages (simulated - free demo)
 */
export const GOBUX_PACKAGES = [
    { id: 'pkg_100',  amount: 100,  bonus: 0,  label: '100 GoBux',   price: 'Gratis' },
    { id: 'pkg_500',  amount: 500,  bonus: 10, label: '500 GoBux',   price: 'Gratis' },
    { id: 'pkg_1000', amount: 1000, bonus: 15, label: '1.000 GoBux', price: 'Gratis' },
    { id: 'pkg_5000', amount: 5000, bonus: 25, label: '5.000 GoBux', price: 'Gratis' },
];

/**
 * Featured items for the hero carousel
 */
export const FEATURED_ITEMS = [
    'hat_diamant', 'bundle_ritter', 'acc_fluegel', 'hair_feuer', 'bundle_space', 'anim_teleport',
];

// ════════════════════════════════════════════════════════════════════════
// Marketplace API
// ════════════════════════════════════════════════════════════════════════

export const Marketplace = {
    /**
     * Get all marketplace items.
     */
    getAllItems() {
        return MARKETPLACE_ITEMS;
    },

    /**
     * Get items filtered by category.
     */
    getByCategory(category) {
        if (!category || category === 'all') return MARKETPLACE_ITEMS;
        return MARKETPLACE_ITEMS.filter(item => item.category === category);
    },

    /**
     * Get a single item by ID.
     */
    getItem(itemId) {
        return MARKETPLACE_ITEMS.find(item => item.id === itemId) || null;
    },

    /**
     * Search items by name.
     */
    search(query) {
        const q = query.toLowerCase().trim();
        if (!q) return MARKETPLACE_ITEMS;
        return MARKETPLACE_ITEMS.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
        );
    },

    /**
     * Get owned item IDs for a user.
     */
    getOwned(userId) {
        const data = JSON.parse(localStorage.getItem(INVENTORY_PREFIX + userId) || '[]');
        return data;
    },

    /**
     * Check if a user owns a specific item.
     */
    isOwned(userId, itemId) {
        return this.getOwned(userId).includes(itemId);
    },

    /**
     * Purchase an item for a user. Returns { success, error }.
     * Uses GoBux.spend internally (must pass GoBux module).
     */
    purchase(userId, itemId, GoBux) {
        const item = this.getItem(itemId);
        if (!item) return { error: 'Item nicht gefunden!' };

        // Check if already owned
        if (this.isOwned(userId, itemId)) return { error: 'Du besitzt dieses Item bereits!' };

        // Free items
        if (item.price === 0) {
            this._addToInventory(userId, itemId);
            // If it's a bundle, also add bundle items
            if (item.bundleItems) {
                item.bundleItems.forEach(bi => {
                    if (!this.isOwned(userId, bi)) this._addToInventory(userId, bi);
                });
            }
            return { success: true };
        }

        // Spend GoBux
        const result = GoBux.spend(userId, item.price, `Marketplace: ${item.name}`);
        if (result.error) return { error: result.error };

        this._addToInventory(userId, itemId);

        // If it's a bundle, also add bundle items
        if (item.bundleItems) {
            item.bundleItems.forEach(bi => {
                if (!this.isOwned(userId, bi)) this._addToInventory(userId, bi);
            });
        }

        // If it's a game pass, also register in the legacy pass system
        if (item.passId) {
            const passesKey = 'goblox_passes';
            const passData = JSON.parse(localStorage.getItem(passesKey) || '{}');
            if (!passData[userId]) passData[userId] = [];
            if (!passData[userId].includes(item.passId)) {
                passData[userId].push(item.passId);
            }
            localStorage.setItem(passesKey, JSON.stringify(passData));
        }

        return { success: true, balance: result.balance };
    },

    /**
     * Add an item to user's inventory.
     */
    _addToInventory(userId, itemId) {
        const data = this.getOwned(userId);
        if (!data.includes(itemId)) {
            data.push(itemId);
            localStorage.setItem(INVENTORY_PREFIX + userId, JSON.stringify(data));
        }
    },

    /**
     * Get equipped items for a user.
     */
    getEquipped(userId) {
        return JSON.parse(localStorage.getItem(EQUIPPED_PREFIX + userId) || '{}');
    },

    /**
     * Equip an item (one per category slot).
     */
    equip(userId, itemId) {
        const item = this.getItem(itemId);
        if (!item) return;
        const equipped = this.getEquipped(userId);
        equipped[item.category] = itemId;
        localStorage.setItem(EQUIPPED_PREFIX + userId, JSON.stringify(equipped));
    },

    /**
     * Unequip an item by category slot.
     */
    unequip(userId, category) {
        const equipped = this.getEquipped(userId);
        delete equipped[category];
        localStorage.setItem(EQUIPPED_PREFIX + userId, JSON.stringify(equipped));
    },

    /**
     * Check if a specific item is equipped.
     */
    isEquipped(userId, itemId) {
        const item = this.getItem(itemId);
        if (!item) return false;
        const equipped = this.getEquipped(userId);
        return equipped[item.category] === itemId;
    },

    /**
     * Sort items by various criteria.
     */
    sortItems(items, sortBy) {
        const copy = [...items];
        switch (sortBy) {
            case 'price_asc':
                return copy.sort((a, b) => a.price - b.price);
            case 'price_desc':
                return copy.sort((a, b) => b.price - a.price);
            case 'name':
                return copy.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            case 'rarity': {
                const order = { LEGENDARY: 0, EPIC: 1, RARE: 2, UNCOMMON: 3, COMMON: 4 };
                return copy.sort((a, b) => (order[a.rarity] ?? 5) - (order[b.rarity] ?? 5));
            }
            case 'newest':
            default:
                return copy; // original order is "newest"
        }
    },

    /**
     * Get featured items (full objects).
     */
    getFeatured() {
        return FEATURED_ITEMS.map(id => this.getItem(id)).filter(Boolean);
    },
};
