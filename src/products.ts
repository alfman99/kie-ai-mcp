import type { ProductOperation } from "./types.js";

export const productOperations: ProductOperation[] = [
  { family: "4o_image", operation: "generate", method: "POST", path: "/api/v1/gpt4o-image/generate", description: "Create a 4o Image generation task." },
  { family: "4o_image", operation: "get_details", method: "GET", path: "/api/v1/gpt4o-image/record-info", description: "Get 4o Image task details." },
  { family: "4o_image", operation: "get_download_url", method: "POST", path: "/api/v1/gpt4o-image/download-url", description: "Get a direct 4o Image download URL." },
  { family: "flux_kontext", operation: "generate_or_edit", method: "POST", path: "/api/v1/flux/kontext/generate", description: "Create a Flux Kontext image generation or editing task." },
  { family: "flux_kontext", operation: "get_details", method: "GET", path: "/api/v1/flux/kontext/record-info", description: "Get Flux Kontext task details." },
  { family: "runway", operation: "generate", method: "POST", path: "/api/v1/runway/generate", description: "Create a Runway video generation task." },
  { family: "runway", operation: "extend", method: "POST", path: "/api/v1/runway/extend", description: "Extend a Runway video task." },
  { family: "runway", operation: "get_details", method: "GET", path: "/api/v1/runway/record-detail", description: "Get Runway task details." },
  { family: "aleph", operation: "generate", method: "POST", path: "/api/v1/aleph/generate", description: "Create a Runway Aleph video-to-video task." },
  { family: "aleph", operation: "get_details", method: "GET", path: "/api/v1/aleph/record-info", description: "Get Runway Aleph task details." },
  { family: "suno", operation: "generate_music", method: "POST", path: "/api/v1/generate", description: "Create a Suno music task." },
  { family: "suno", operation: "extend_music", method: "POST", path: "/api/v1/generate/extend", description: "Extend Suno music." },
  { family: "suno", operation: "upload_cover", method: "POST", path: "/api/v1/generate/upload-cover", description: "Upload audio and create a Suno cover." },
  { family: "suno", operation: "upload_extend", method: "POST", path: "/api/v1/generate/upload-extend", description: "Upload audio and extend it with Suno." },
  { family: "suno", operation: "add_instrumental", method: "POST", path: "/api/v1/generate/add-instrumental", description: "Add instrumental to Suno music." },
  { family: "suno", operation: "add_vocals", method: "POST", path: "/api/v1/generate/add-vocals", description: "Add vocals to Suno music." },
  { family: "suno", operation: "replace_section", method: "POST", path: "/api/v1/generate/replace-section", description: "Replace a Suno music section." },
  { family: "suno", operation: "mashup", method: "POST", path: "/api/v1/generate/mashup", description: "Create a Suno mashup." },
  { family: "suno", operation: "get_music_details", method: "GET", path: "/api/v1/generate/record-info", description: "Get Suno music task details." },
  { family: "suno", operation: "generate_lyrics", method: "POST", path: "/api/v1/lyrics", description: "Create a Suno lyrics task." },
  { family: "suno", operation: "get_lyrics_details", method: "GET", path: "/api/v1/lyrics/record-info", description: "Get Suno lyrics task details." },
  { family: "suno", operation: "wav_generate", method: "POST", path: "/api/v1/wav/generate", description: "Convert a Suno track to WAV." },
  { family: "suno", operation: "wav_details", method: "GET", path: "/api/v1/wav/record-info", description: "Get WAV conversion details." },
  { family: "suno", operation: "vocal_removal_generate", method: "POST", path: "/api/v1/vocal-removal/generate", description: "Create a vocal/instrument separation task." },
  { family: "suno", operation: "vocal_removal_details", method: "GET", path: "/api/v1/vocal-removal/record-info", description: "Get vocal separation details." },
  { family: "suno", operation: "midi_generate", method: "POST", path: "/api/v1/midi/generate", description: "Generate MIDI from audio." },
  { family: "suno", operation: "midi_details", method: "GET", path: "/api/v1/midi/record-info", description: "Get MIDI generation details." },
  { family: "suno", operation: "mp4_generate", method: "POST", path: "/api/v1/mp4/generate", description: "Create a music video." },
  { family: "suno", operation: "mp4_details", method: "GET", path: "/api/v1/mp4/record-info", description: "Get music video details." },
  { family: "suno", operation: "voice_validate", method: "POST", path: "/api/v1/voice/validate", description: "Generate a Suno Voice validation phrase." },
  { family: "suno", operation: "voice_validate_info", method: "GET", path: "/api/v1/voice/validate-info", description: "Get Suno Voice validation phrase details." },
  { family: "suno", operation: "voice_generate", method: "POST", path: "/api/v1/voice/generate", description: "Create a custom Suno Voice." },
  { family: "suno", operation: "voice_record_info", method: "GET", path: "/api/v1/voice/record-info", description: "Get custom Suno Voice records." },
  { family: "suno", operation: "voice_regenerate", method: "POST", path: "/api/v1/voice/regenerate", description: "Regenerate a Suno Voice phrase." },
  { family: "suno", operation: "voice_check", method: "POST", path: "/api/v1/voice/check-voice", description: "Check Suno Voice availability." },
  { family: "veo", operation: "generate", method: "POST", path: "/api/v1/veo/generate", description: "Create a Veo3.1 video task." },
  { family: "veo", operation: "get_details", method: "GET", path: "/api/v1/veo/record-info", description: "Get Veo3.1 task details." },
  { family: "veo", operation: "get_1080p", method: "GET", path: "/api/v1/veo/get-1080p-video", description: "Get a Veo3.1 1080p video." },
  { family: "veo", operation: "get_4k", method: "POST", path: "/api/v1/veo/get-4k-video", description: "Create a Veo3.1 4K video task." },
  { family: "veo", operation: "extend", method: "POST", path: "/api/v1/veo/extend", description: "Extend a Veo3.1 video." }
];

export function findProductOperation(family: string, operation: string): ProductOperation | undefined {
  return productOperations.find((item) => item.family === family && item.operation === operation);
}
