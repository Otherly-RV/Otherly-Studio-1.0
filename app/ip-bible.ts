// Central types for the Living IP Bible.
// Later, your AI/engineer will populate these objects/arrays.

// --- PLOT ---

export type PlotData = {
  title: string
  logline: string
  synopsis: string
}

// --- CHARACTERS ---

export type CharacterCardData = {
  id: string
  name: string
  occupation: string
  role: string
  bio: string
  // pictureUrl?: string // reserved for later
}

export type CharacterDetail = {
  id: string
  name: string
  occupation: string
  role: string
  shortBio: string
  longBio: string
  visualNotes: string
  goals: string
  flaws: string
  relationships: { name: string; relation: string; note?: string }[]
  keyScenes: string[]
  imagePrompt?: string
  imageUrl?: string
}

// --- LOCATIONS ---

export type LocationCardData = {
  id: string
  name: string
  world: string
  region: string
  placeType: string
  note: string
  // pictureUrl?: string // reserved for later
}

export type LocationDetail = {
  id: string
  name: string
  world: string
  region: string
  placeType: string
  moodLine: string
  description: string
  functionInStory: string
  recurringTimeOrWeather: string
  keyScenes: string[]
  // pictureUrl?: string // reserved for later
}

// --- ART STYLE ---

export type ArtStyleData = {
  aesthetic: string
  palette: string
}

// --- WORLD RULES ---

export type WorldRulesData = {
  physicsMagic: string
  technology: string
  society: string
}

// --- FULL IP BIBLE SHAPE ---

export type IpBible = {
  plot: PlotData
  characters: {
    list: CharacterCardData[]
    byId: Record<string, CharacterDetail>
  }
  locations: {
    list: LocationCardData[]
    byId: Record<string, LocationDetail>
  }
  artStyle: ArtStyleData
  worldRules: WorldRulesData
}

// TEMPORARY SAMPLE / DEFAULT — will be replaced by AI later.
export const ipBibleSample: IpBible = {
  plot: {
    title: "Project title",
    logline: "A one-sentence logline, conventional and clear.",
    synopsis:
      "A short, conventional synopsis (2–5 paragraphs max) that covers the setup, main conflict, and resolution without going scene by scene.",
  },
  characters: {
    list: [],
    byId: {},
  },
  locations: {
    list: [],
    byId: {},
  },
  artStyle: {
    aesthetic:
      "A short description of the overall visual aesthetic: influences, camera behavior, texture, and rhythm.",
    palette:
      "A description of the mood / color palette: dominant hues, contrasts, and how color shifts across the story.",
  },
  worldRules: {
    physicsMagic:
      "Short description of how reality works here: normal physics, altered gravity, magic systems, time loops, etc.",
    technology:
      "Level and style of technology: analog, near-future, cyberpunk, biotech, hard sci-fi, etc. What tech can and cannot do.",
    society:
      "Social rules, power structures, taboos, and everyday behavior. What gets you rewarded, what gets you punished.",
  },
}
