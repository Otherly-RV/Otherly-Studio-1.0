// lib/engines.ts

// ---------------- TYPES ----------------

export type ProviderId = "openai" | "gemini"

export type EngineId =
  | "openai-gpt-5.1"
  | "openai-gpt-5-mini"
  | "gemini-3-preview" // logical id for Gemini 3 Pro Preview

export type EngineKind = "text" | "image" | "both"

export type EngineDefinition = {
  id: EngineId
  label: string
  provider: ProviderId
  kind: EngineKind
  // text chat / canon / co-pilot
  text?: {
    provider: ProviderId
    model: string // provider model id
  }
  // image generations (hero, character, location)
  image?: {
    provider: ProviderId
    model: string // provider model id
  }
}

// Per-project engine config stored in KV
export type ProjectEngineConfig = {
  // “global” choice the user made in the UI
  globalEngineId: EngineId
  // Canon (hard bible) generator
  canonEngineId: EngineId
  // Co-Pilot chat
  copilotEngineId: EngineId
  // Images (hero, characters, locations)
  imageEngineId: EngineId
}

// ---------------- ENGINE DEFINITIONS ----------------

// NOTE: For OpenAI engines we use:
//
//   text:  gpt-5.1 / gpt-5-mini
//   image: gpt-image-1
//
// For Gemini 3 Pro Preview we use:
//   text:  gemini-3-pro-preview
//   image: gemini-3-pro-image-preview

const ENGINES: Record<EngineId, EngineDefinition> = {
  "openai-gpt-5.1": {
    id: "openai-gpt-5.1",
    label: "OpenAI · GPT-5.1",
    provider: "openai",
    kind: "both",
    text: { provider: "openai", model: "gpt-5.1" },
    image: { provider: "openai", model: "gpt-image-1" },
  },

  "openai-gpt-5-mini": {
    id: "openai-gpt-5-mini",
    label: "OpenAI · GPT-5 mini",
    provider: "openai",
    kind: "both",
    text: { provider: "openai", model: "gpt-5-mini" },
    image: { provider: "openai", model: "gpt-image-1" },
  },

  // GEMINI 3 PREVIEW (logical id) → actual API models:
  //   - text:  gemini-3-pro-preview
  //   - image: gemini-3-pro-image-preview
  "gemini-3-preview": {
    id: "gemini-3-preview",
    label: "Gemini · 3 Pro Preview",
    provider: "gemini",
    kind: "both",
    text: {
      provider: "gemini",
      model: "gemini-3-pro-preview", // <- real Gemini chat model id
    },
    image: {
      provider: "gemini",
      model: "gemini-3-pro-image-preview", // <- real Gemini image model id
    },
  },
}

// --------------- DEFAULTS & HELPERS ----------------

// ❗ These MUST be EngineId values, NOT provider model names
export const DEFAULT_CANON_ENGINE_ID: EngineId = "gemini-3-preview"
export const DEFAULT_COPILOT_ENGINE_ID: EngineId = "gemini-3-preview"
export const DEFAULT_IMAGE_ENGINE_ID: EngineId = "gemini-3-preview"

export const ALL_ENGINES: EngineDefinition[] = Object.values(ENGINES)

export function getEngineOrThrow(engineId: EngineId): EngineDefinition {
  const engine = ENGINES[engineId]
  if (!engine) {
    throw new Error(`Unknown engineId: ${engineId}`)
  }
  return engine
}

// Use this when you read from KV or construct a project config.
export function ensureProjectEngineConfig(
  partial?: Partial<ProjectEngineConfig>
): ProjectEngineConfig {
  const globalEngineId: EngineId =
    partial?.globalEngineId ?? DEFAULT_CANON_ENGINE_ID

  return {
    globalEngineId,
    canonEngineId: partial?.canonEngineId ?? globalEngineId,
    copilotEngineId: partial?.copilotEngineId ?? globalEngineId,
    imageEngineId: partial?.imageEngineId ?? globalEngineId,
  }
}
