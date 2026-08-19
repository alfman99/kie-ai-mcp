import { validateJsonSchema } from "./json-schema.js";
import type { JsonObject, ProductOperation } from "./types.js";

export const productOperations: ProductOperation[] = [
  { family: "4o_image", operation: "generate", method: "POST", path: "/api/v1/gpt4o-image/generate", creates: true, description: "Create a 4o Image generation task." },
  { family: "4o_image", operation: "get_details", method: "GET", path: "/api/v1/gpt4o-image/record-info", description: "Get 4o Image task details." },
  { family: "4o_image", operation: "get_download_url", method: "POST", path: "/api/v1/gpt4o-image/download-url", description: "Get a direct 4o Image download URL." },
  { family: "flux_kontext", operation: "generate_or_edit", method: "POST", path: "/api/v1/flux/kontext/generate", creates: true, description: "Create a Flux Kontext image generation or editing task." },
  { family: "flux_kontext", operation: "get_details", method: "GET", path: "/api/v1/flux/kontext/record-info", description: "Get Flux Kontext task details." },
  { family: "runway", operation: "generate", method: "POST", path: "/api/v1/runway/generate", creates: true, description: "Create a Runway video generation task." },
  { family: "runway", operation: "extend", method: "POST", path: "/api/v1/runway/extend", creates: true, description: "Extend a Runway video task." },
  { family: "runway", operation: "get_details", method: "GET", path: "/api/v1/runway/record-detail", description: "Get Runway task details." },
  { family: "aleph", operation: "generate", method: "POST", path: "/api/v1/aleph/generate", creates: true, description: "Create a Runway Aleph video-to-video task." },
  { family: "aleph", operation: "get_details", method: "GET", path: "/api/v1/aleph/record-info", description: "Get Runway Aleph task details." },
  { family: "suno", operation: "generate_music", method: "POST", path: "/api/v1/generate", creates: true, description: "Create a Suno music task." },
  { family: "suno", operation: "extend_music", method: "POST", path: "/api/v1/generate/extend", creates: true, description: "Extend Suno music." },
  { family: "suno", operation: "upload_cover", method: "POST", path: "/api/v1/generate/upload-cover", creates: true, description: "Upload audio and create a Suno cover." },
  { family: "suno", operation: "upload_extend", method: "POST", path: "/api/v1/generate/upload-extend", creates: true, description: "Upload audio and extend it with Suno." },
  { family: "suno", operation: "add_instrumental", method: "POST", path: "/api/v1/generate/add-instrumental", creates: true, description: "Add instrumental to Suno music." },
  { family: "suno", operation: "add_vocals", method: "POST", path: "/api/v1/generate/add-vocals", creates: true, description: "Add vocals to Suno music." },
  { family: "suno", operation: "replace_section", method: "POST", path: "/api/v1/generate/replace-section", creates: true, description: "Replace a Suno music section." },
  { family: "suno", operation: "mashup", method: "POST", path: "/api/v1/generate/mashup", creates: true, description: "Create a Suno mashup." },
  { family: "suno", operation: "get_music_details", method: "GET", path: "/api/v1/generate/record-info", description: "Get Suno music task details." },
  { family: "suno", operation: "generate_lyrics", method: "POST", path: "/api/v1/lyrics", creates: true, description: "Create a Suno lyrics task." },
  { family: "suno", operation: "get_lyrics_details", method: "GET", path: "/api/v1/lyrics/record-info", description: "Get Suno lyrics task details." },
  { family: "suno", operation: "wav_generate", method: "POST", path: "/api/v1/wav/generate", creates: true, description: "Convert a Suno track to WAV." },
  { family: "suno", operation: "wav_details", method: "GET", path: "/api/v1/wav/record-info", description: "Get WAV conversion details." },
  { family: "suno", operation: "vocal_removal_generate", method: "POST", path: "/api/v1/vocal-removal/generate", creates: true, description: "Create a vocal/instrument separation task." },
  { family: "suno", operation: "vocal_removal_details", method: "GET", path: "/api/v1/vocal-removal/record-info", description: "Get vocal separation details." },
  { family: "suno", operation: "midi_generate", method: "POST", path: "/api/v1/midi/generate", creates: true, description: "Generate MIDI from audio." },
  { family: "suno", operation: "midi_details", method: "GET", path: "/api/v1/midi/record-info", description: "Get MIDI generation details." },
  { family: "suno", operation: "mp4_generate", method: "POST", path: "/api/v1/mp4/generate", creates: true, description: "Create a music video." },
  { family: "suno", operation: "mp4_details", method: "GET", path: "/api/v1/mp4/record-info", description: "Get music video details." },
  { family: "suno", operation: "voice_validate", method: "POST", path: "/api/v1/voice/validate", description: "Generate a Suno Voice validation phrase." },
  { family: "suno", operation: "voice_validate_info", method: "GET", path: "/api/v1/voice/validate-info", description: "Get Suno Voice validation phrase details." },
  { family: "suno", operation: "voice_generate", method: "POST", path: "/api/v1/voice/generate", creates: true, description: "Create a custom Suno Voice." },
  { family: "suno", operation: "voice_record_info", method: "GET", path: "/api/v1/voice/record-info", description: "Get custom Suno Voice records." },
  { family: "suno", operation: "voice_regenerate", method: "POST", path: "/api/v1/voice/regenerate", creates: true, description: "Regenerate a Suno Voice phrase." },
  { family: "suno", operation: "voice_check", method: "POST", path: "/api/v1/voice/check-voice", description: "Check Suno Voice availability." },
  { family: "veo", operation: "generate", method: "POST", path: "/api/v1/veo/generate", creates: true, description: "Create a Veo3.1 video task." },
  { family: "veo", operation: "get_details", method: "GET", path: "/api/v1/veo/record-info", description: "Get Veo3.1 task details." },
  { family: "veo", operation: "get_1080p", method: "GET", path: "/api/v1/veo/get-1080p-video", description: "Get a Veo3.1 1080p video." },
  { family: "veo", operation: "get_4k", method: "POST", path: "/api/v1/veo/get-4k-video", creates: true, description: "Create a Veo3.1 4K video task." },
  { family: "veo", operation: "extend", method: "POST", path: "/api/v1/veo/extend", creates: true, description: "Extend a Veo3.1 video." }
];

export function findProductOperation(family: string, operation: string): ProductOperation | undefined {
  return productOperations.find((item) => item.family === family && item.operation === operation);
}

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function officialEndpoints(catalog: JsonObject): JsonObject[] {
  return Array.isArray(catalog.endpoints) ? catalog.endpoints.filter(isRecord) : [];
}

export function findOfficialProductEndpoint(
  productOperation: ProductOperation,
  catalog: JsonObject
): JsonObject | undefined {
  return officialEndpoints(catalog).find(
    (endpoint) =>
      String(endpoint.method).toUpperCase() === productOperation.method && endpoint.path === productOperation.path
  );
}

export function getProductOperationSchema(productOperation: ProductOperation, catalog: JsonObject): JsonObject {
  const endpoint = findOfficialProductEndpoint(productOperation, catalog);
  if (!endpoint) {
    throw new Error(
      `Official schema missing for product operation ${productOperation.family}/${productOperation.operation}.`
    );
  }
  return endpoint;
}

export function validateProductOperationInput(args: {
  productOperation: ProductOperation;
  query: JsonObject;
  body: unknown;
  catalog: JsonObject;
}): void {
  const endpoint = getProductOperationSchema(args.productOperation, args.catalog);
  const parameters = Array.isArray(endpoint.parameters) ? endpoint.parameters.filter(isRecord) : [];
  const queryParameters = parameters.filter((parameter) => parameter.in === "query");
  const queryProperties = Object.fromEntries(
    queryParameters
      .filter((parameter) => typeof parameter.name === "string")
      .map((parameter) => [String(parameter.name), parameter.schema])
  );
  const requiredQuery = queryParameters
    .filter((parameter) => parameter.required === true && typeof parameter.name === "string")
    .map((parameter) => String(parameter.name));
  const errors = validateJsonSchema(
    args.query,
    {
      type: "object",
      properties: queryProperties,
      required: requiredQuery
    },
    { path: "query", rejectUnknownProperties: true }
  );

  if (args.productOperation.method === "GET") {
    if (args.body !== undefined) {
      errors.push("body is not accepted for this GET operation");
    }
  } else {
    const request = isRecord(endpoint.request) ? endpoint.request : {};
    const jsonContent = Object.entries(request).find(
      ([contentType]) => contentType === "application/json" || contentType.endsWith("+json")
    );
    const media = jsonContent && isRecord(jsonContent[1]) ? jsonContent[1] : undefined;
    if (media?.schema) {
      errors.push(
        ...validateJsonSchema(args.body ?? {}, media.schema, {
          path: "body",
          rejectUnknownProperties: true
        })
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid parameters for ${args.productOperation.family}/${args.productOperation.operation}: ${errors.join("; ")}`
    );
  }
}
