// Default content. Owner edits are saved in Firebase and override these values.
// Product images are fixed here; only the text and rates are editable from the admin page.

export const IMAGES = {
  'brooch-chain':       { box: 'assets/img/products/brooch-chain-box.webp',       use: 'assets/img/products/brooch-chain-use.webp' },
  'safa-kalgi':         { box: 'assets/img/products/kalgi-box.webp',              use: 'assets/img/products/kalgi-use.webp' },
  'coat-brooch':        { box: 'assets/img/products/coat-brooch-box.webp',        use: 'assets/img/products/coat-brooch-use.webp' },
  'necklace-set':       { box: 'assets/img/products/necklace-set-box.webp',       use: 'assets/img/products/necklace-set-use.webp' },
  'butterfly-earrings': { box: 'assets/img/products/butterfly-earrings-box.webp', use: 'assets/img/products/butterfly-earrings-use.webp' }
};

export const PRODUCT_ORDER = ['brooch-chain', 'safa-kalgi', 'coat-brooch', 'necklace-set', 'butterfly-earrings'];

export const DEFAULT_CONTENT = {
  brand: 'Perfect Imitation Jewellers',
  owner: 'Pravin Lomrod',
  since: '2014',
  city: 'Mumbai',
  whatsapp: '918451087229',
  instagram: 'perfect_imitation_jewellers_',
  mapsUrl: 'https://maps.app.goo.gl/GUS4Li6uio384dgE9?g_st=ac',
  address: 'Mumbai, Maharashtra',
  hours: 'Monday to Saturday, 11 am to 8 pm',
  about:
    'Since 2014, Perfect Imitation Jewellers has supplied wedding and occasion jewellery to retailers, boutiques and resellers across India from Mumbai. Every piece is checked by hand before it is packed, so the stone setting, polish and finish hold up to the camera and to the celebration.',
  products: {
    'brooch-chain': {
      name: 'Royal Sherwani Brooch Chain',
      type: 'Sherwani brooch chain',
      finish: 'Silver tone, clear crystals',
      uses: 'Pinned across the chest of a sherwani, bandhgala or Jodhpuri suit. Made for grooms, brothers of the groom and wedding functions where the outfit needs one statement piece.',
      rateMin: '',
      rateMax: ''
    },
    'safa-kalgi': {
      name: 'Pearl Drop Safa Kalgi',
      type: 'Safa kalgi',
      finish: 'Gold tone, crystals with pearl drop',
      uses: 'Worn on the front fold of a groom\u2019s safa or pagdi. Suits baraat, sehra and reception looks, and pairs with maroon, gold and ivory turbans.',
      rateMin: '',
      rateMax: ''
    },
    'coat-brooch': {
      name: 'Crystal Petal Coat Brooch',
      type: 'Coat brooch',
      finish: 'Silver tone, marquise crystals',
      uses: 'Pinned on the lapel of a suit, tuxedo or blazer. Adds a formal finish for receptions, cocktail nights and engagement parties.',
      rateMin: '',
      rateMax: ''
    },
    'necklace-set': {
      name: 'Pastel Baguette Necklace Set',
      type: 'Necklace and earring set',
      finish: 'Rose gold tone, pink, mint and clear stones',
      uses: 'A light necklace with matching drop earrings for mehendi, haldi, engagement and party wear. Works with pastel lehengas, sarees and gowns.',
      rateMin: '',
      rateMax: ''
    },
    'butterfly-earrings': {
      name: 'Butterfly Chain Drop Earrings',
      type: 'Drop earrings',
      finish: 'Rose gold tone, clear crystals',
      uses: 'Everyday and party earrings with a butterfly stud and a fine chain drop. Easy to wear with western and Indo-western outfits.',
      rateMin: '',
      rateMax: ''
    }
  }
};

// Deep merge of saved content over defaults, so a missing field never breaks the page.
export function mergeContent(saved) {
  const out = structuredClone(DEFAULT_CONTENT);
  if (!saved || typeof saved !== 'object') return out;
  for (const [k, v] of Object.entries(saved)) {
    if (k === 'products' && v && typeof v === 'object') {
      for (const [id, p] of Object.entries(v)) {
        if (out.products[id] && p && typeof p === 'object') Object.assign(out.products[id], p);
      }
    } else if (typeof v === 'string' && k in out) {
      out[k] = v;
    }
  }
  return out;
}
