# KIE.AI Market Model Registry

Generated 2026-10-07T08:11:13.190Z from official `docs.kie.ai` OpenAPI schemas for `POST /api/v1/jobs/createTask`.

| Model | Required input | Official source |
| --- | --- | --- |
| `4o-image-api` | `size` | [Generate 4o Image](<https://docs.kie.ai/4o-image-api/generate-4-o-image.md>) |
| `ai-music-api/add-instrumental` | `negative_tags`, `tags`, `title`, `upload_url` | [Add Instrumental to Music](<https://docs.kie.ai/suno-api/add-instrumental.md>) |
| `ai-music-api/add-vocals` | `negative_tags`, `style`, `title`, `upload_url` | [Add Vocals to Music](<https://docs.kie.ai/suno-api/add-vocals.md>) |
| `ai-music-api/boost-music-style` | `content` | [Boost Music Style](<https://docs.kie.ai/suno-api/boost-music-style.md>) |
| `ai-music-api/check-voice` | `task_id` | [Suno Voice Check Availability API](<https://docs.kie.ai/suno-api/suno-voice-check-voice.md>) |
| `ai-music-api/convert-to-wav-format` | `audio_id`, `task_id` | [Convert to WAV Format](<https://docs.kie.ai/suno-api/convert-to-wav.md>) |
| `ai-music-api/cover-generate` | `task_id` | [Generate Music Cover](<https://docs.kie.ai/suno-api/cover-suno.md>) |
| `ai-music-api/create-music-video` | `audio_id`, `task_id` | [Create Music Video](<https://docs.kie.ai/suno-api/create-music-video.md>) |
| `ai-music-api/create-voice` | `task_id`, `verify_url` | [Suno Voice Create Custom Voice API](<https://docs.kie.ai/suno-api/suno-voice-generate.md>) |
| `ai-music-api/extend` | `audio_id`, `model` | [Extend Music](<https://docs.kie.ai/suno-api/extend-music.md>) |
| `ai-music-api/generate` | `custom_mode`, `instrumental`, `model` | [Generate Music](<https://docs.kie.ai/suno-api/generate-music.md>) |
| `ai-music-api/generate-lyrics` | `prompt` | [Generate Lyrics](<https://docs.kie.ai/suno-api/generate-lyrics.md>) |
| `ai-music-api/generate-midi-from-audio` | `task_id` | [Generate MIDI from Audio](<https://docs.kie.ai/suno-api/generate-midi.md>) |
| `ai-music-api/generate-persona` | `audio_id`, `description`, `name`, `task_id` | [Generate Persona](<https://docs.kie.ai/suno-api/generate-persona.md>) |
| `ai-music-api/mashup` | `model`, `style`, `title`, `upload_url_list` | [Generate Mashup Music](<https://docs.kie.ai/suno-api/generate-mashup.md>) |
| `ai-music-api/regenerate-phrase` | `task_id` | [Suno Voice Regenerate Verification Phrase](<https://docs.kie.ai/suno-api/suno-voice-regenerate.md>) |
| `ai-music-api/replace-section` | `full_lyrics`, `infill_end_s`, `infill_start_s`, `prompt`, `tags`, `title` | [Replace Music Section](<https://docs.kie.ai/suno-api/replace-section.md>) |
| `ai-music-api/separate-vocals` | `stem_name` | [Vocal & Instrument Stem Separation](<https://docs.kie.ai/suno-api/separate-vocals.md>) |
| `ai-music-api/sounds` | `model`, `prompt` | [Generate sounds](<https://docs.kie.ai/suno-api/generate-sounds.md>) |
| `ai-music-api/suno-recovery-audio` | `task_id` | [Recovery Audio](<https://docs.kie.ai/suno-api/recovery-audio.md>) |
| `ai-music-api/timeStamped-lyrics` | `audio_id`, `task_id` | [Get Timestamped Lyrics](<https://docs.kie.ai/suno-api/get-timestamped-lyrics.md>) |
| `ai-music-api/upload-and-cover-audio` | `instrumental`, `model`, `upload_url` | [Upload And Cover Audio](<https://docs.kie.ai/suno-api/upload-and-cover-audio.md>) |
| `ai-music-api/upload-and-extend-audio` | `model`, `upload_url` | [Upload And Extend Audio](<https://docs.kie.ai/suno-api/upload-and-extend-audio.md>) |
| `ai-music-api/validation-phrase` | `vocal_end_s`, `vocal_start_s`, `voice_url` | [Suno Voice Generate Verification Phrase API](<https://docs.kie.ai/suno-api/suno-voice-validate.md>) |
| `bytedance/seedance-1.5-pro` | `aspect_ratio`, `duration`, `prompt` | [Bytedance Seedance 1.5 Pro](<https://docs.kie.ai/market/bytedance/seedance-1-5-pro.md>) |
| `bytedance/seedance-2` |  | [Bytedance Seedance 2.0](<https://docs.kie.ai/market/bytedance/seedance-2.md>) |
| `bytedance/seedance-2-5` |  | [Bytedance Seedance 2.5](<https://docs.kie.ai/market/bytedance/seedance-2-5.md>) |
| `bytedance/seedance-2-fast` |  | [Bytedance Seedance 2.0 Fast](<https://docs.kie.ai/market/bytedance/seedance-2-fast.md>) |
| `bytedance/seedance-2-mini` |  | [Bytedance Seedance 2.0 Mini](<https://docs.kie.ai/market/bytedance/seedance-2-mini.md>) |
| `bytedance/seedream` | `prompt` | [Seedream3.0 - Text to Image](<https://docs.kie.ai/market/seedream/seedream.md>) |
| `bytedance/seedream-v4-edit` | `image_urls`, `prompt` | [Seedream4.0 - Edit](<https://docs.kie.ai/market/seedream/seedream-v4-edit.md>) |
| `bytedance/seedream-v4-text-to-image` | `prompt` | [Seedream4.0 - Text to Image](<https://docs.kie.ai/market/seedream/seedream-v4-text-to-image.md>) |
| `bytedance/v1-lite-image-to-video` | `image_url`, `prompt` | [Bytedance - V1 Lite Image to Video](<https://docs.kie.ai/market/bytedance/v1-lite-image-to-video.md>) |
| `bytedance/v1-lite-text-to-video` | `prompt` | [Bytedance - V1 Lite Text to Video](<https://docs.kie.ai/market/bytedance/v1-lite-text-to-video.md>) |
| `bytedance/v1-pro-fast-image-to-video` | `image_url`, `prompt` | [Bytedance V1 Pro Fast Image to Video](<https://docs.kie.ai/market/bytedance/v1-pro-fast-image-to-video.md>) |
| `bytedance/v1-pro-image-to-video` | `image_url`, `prompt` | [Bytedance V1 Pro Image to Video](<https://docs.kie.ai/market/bytedance/v1-pro-image-to-video.md>) |
| `bytedance/v1-pro-text-to-video` | `prompt` | [Bytedance - V1 Pro Text to Video](<https://docs.kie.ai/market/bytedance/v1-pro-text-to-video.md>) |
| `elevenlabs/audio-isolation` | `audio_url` | [elevenlabs/audio-isolation](<https://docs.kie.ai/market/elevenlabs/audio-isolation.md>) |
| `elevenlabs/text-to-dialogue-v3` | `dialogue` | [elevenlabs/text-to-dialogue-v3](<https://docs.kie.ai/market/elevenlabs/text-to-dialogue-v3.md>) |
| `elevenlabs/text-to-speech-multilingual-v2` | `text`, `voice` | [elevenlabs/text-to-speech-multilingual-v2](<https://docs.kie.ai/market/elevenlabs/text-to-speech-multilingual-v2.md>) |
| `elevenlabs/text-to-speech-turbo-2-5` | `text` | [elevenlabs/text-to-speech-turbo-2-5](<https://docs.kie.ai/market/elevenlabs/text-to-speech-turbo-2-5.md>) |
| `flux-2/flex-image-to-image` | `aspect_ratio`, `input_urls`, `prompt`, `resolution` | [Flux-2 - Image to Image](<https://docs.kie.ai/market/flux2/flex-image-to-image.md>) |
| `flux-2/flex-text-to-image` | `aspect_ratio`, `prompt`, `resolution` | [Flux-2 - Text to Image](<https://docs.kie.ai/market/flux2/flex-text-to-image.md>) |
| `flux-2/pro-image-to-image` | `aspect_ratio`, `input_urls`, `prompt`, `resolution` | [Flux-2 - Pro Image to Image](<https://docs.kie.ai/market/flux2/pro-image-to-image.md>) |
| `flux-2/pro-text-to-image` | `aspect_ratio`, `prompt`, `resolution` | [Flux-2 - Pro Text to Image](<https://docs.kie.ai/market/flux2/pro-text-to-image.md>) |
| `flux1-kontext` | `prompt` | [Generate or Edit Image](<https://docs.kie.ai/flux-kontext-api/generate-or-edit-image.md>) |
| `gemini-omni-video` | `duration`, `prompt` | [Gemini Omni Video](<https://docs.kie.ai/market/gemini-omni-video.md>) |
| `google/gemini-2-5-pro-tts` | `dialogue_turns`, `speakers` | [Gemini 2.5 Pro Text to Speech](<https://docs.kie.ai/google/gemini-2-5-pro-tts.md>) |
| `google/gemini-3-1-flash-tts` | `dialogue_turns`, `speakers` | [Gemini 3.1 Flash Text to speech](<https://docs.kie.ai/market/google/gemini-3-1-flash-tts.md>) |
| `google/gemini-3-8-flash-lite-tts` | `dialogue_turns`, `speakers` | [Gemini 3.8 Flash Lite Text to speech](<https://docs.kie.ai/market/google/gemini-3-8-flash-lite-tts.md>) |
| `google/gemini-3-8-flash-tts` | `dialogue_turns`, `speakers` | [Gemini 3.8 Flash Text to speech](<https://docs.kie.ai/market/google/gemini-3-8-flash-tts.md>) |
| `google/gemini-omni-flash-1-1` | `duration`, `prompt` | [Gemini Omni 1.1 Flash](<https://docs.kie.ai/market/google/gemini-omni-flash-1-1.md>) |
| `google/imagen4` | `aspect_ratio`, `prompt` | [Google - imagen4](<https://docs.kie.ai/market/google/imagen4.md>) |
| `google/imagen4-fast` | `aspect_ratio`, `prompt` | [Google - imagen4-fast](<https://docs.kie.ai/market/google/imagen4-fast.md>) |
| `google/imagen4-ultra` | `aspect_ratio`, `prompt` | [Google - imagen4-ultra](<https://docs.kie.ai/market/google/imagen4-ultra.md>) |
| `google/nano-banana` | `prompt` | [Google - Nano Banana](<https://docs.kie.ai/market/google/nano-banana.md>) |
| `google/nano-banana-edit` | `image_urls`, `prompt` | [Google - Nano Banana Edit](<https://docs.kie.ai/market/google/nano-banana-edit.md>) |
| `gpt-image-2-5-flare-image-to-image` | `input_urls`, `prompt` | [GPT Image 2.5 Flare - Image To Image](<https://docs.kie.ai/market/gpt/gpt-image-2-5-flare-image-to-image.md>) |
| `gpt-image-2-5-flare-text-to-image` | `prompt` | [GPT Image 2.5 Flare - Text to Image](<https://docs.kie.ai/market/gpt/gpt-image-2-5-flare-text-to-image.md>) |
| `gpt-image-2-5-sunburst-image-to-image` | `input_urls`, `prompt` | [GPT Image 2.5 Sunburst - Image To Image](<https://docs.kie.ai/market/gpt/gpt-image-2-5-sunburst-image-to-image.md>) |
| `gpt-image-2-5-sunburst-text-to-image` | `prompt` | [GPT Image 2.5 Sunburst - Text to Image](<https://docs.kie.ai/market/gpt/gpt-image-2-5-sunburst-text-to-image.md>) |
| `gpt-image-2-image-to-image` | `input_urls`, `prompt` | [GPT Image 2 - Image To Image](<https://docs.kie.ai/market/gpt/gpt-image-2-image-to-image.md>) |
| `gpt-image-2-text-to-image` | `prompt` | [GPT Image-2 - Text to Image](<https://docs.kie.ai/market/gpt/gpt-image-2-text-to-image.md>) |
| `gpt-image/1.5-image-to-image` | `aspect_ratio`, `input_urls`, `prompt`, `quality` | [GPT Image-1.5 - Image to Image](<https://docs.kie.ai/market/gpt-image/1-5-image-to-image.md>) |
| `gpt-image/1.5-text-to-image` | `aspect_ratio`, `prompt`, `quality` | [GPT Image-1.5 - Text to Image](<https://docs.kie.ai/market/gpt-image/1-5-text-to-image.md>) |
| `grok-imagine-image-2-0/image-edit` | `aspect_ratio`, `image_urls` | [Grok Imagine Image 2.0 Image Edit](<https://docs.kie.ai/market/grok-imagine-image-2-0/image-to-image.md>) |
| `grok-imagine-image-2-0/segment-edit` | `prompt`, `task_id` | [Grok Imagine Image 2.0 Segment Edit](<https://docs.kie.ai/market/grok-imagine-image-2-0/image-edit.md>) |
| `grok-imagine-image-2-0/segment-map` |  | [Grok Imagine Image 2.0 Segment Map](<https://docs.kie.ai/market/grok-imagine-image-2-0/segment-map.md>) |
| `grok-imagine-image-2-0/text-to-image` | `aspect_ratio`, `prompt` | [Grok Imagine Image 2.0 Text To Image](<https://docs.kie.ai/market/grok-imagine-image-2-0/text-to-image.md>) |
| `grok-imagine-video-1-5-preview` |  | [Grok Imagine Video 1.5 Preview](<https://docs.kie.ai/market/grok-imagine/1-5-preview.md>) |
| `grok-imagine/extend` | `extend_at`, `extend_times`, `prompt`, `task_id` | [Grok Imagine - Video Extend](<https://docs.kie.ai/market/grok-imagine/extend.md>) |
| `grok-imagine/image-to-image` | `image_urls` | [Grok Imagine - image to image](<https://docs.kie.ai/market/grok-imagine/image-to-image.md>) |
| `grok-imagine/image-to-video` |  | [Grok Imagine Image to Video](<https://docs.kie.ai/market/grok-imagine/image-to-video.md>) |
| `grok-imagine/text-to-image` | `aspect_ratio`, `prompt` | [Grok Imagine - Text to Image](<https://docs.kie.ai/market/grok-imagine/text-to-image.md>) |
| `grok-imagine/text-to-video` | `prompt` | [Grok Imagine Text to Video](<https://docs.kie.ai/market/grok-imagine/text-to-video.md>) |
| `grok-imagine/upscale` | `task_id` | [Grok Imagine - Video Upscale](<https://docs.kie.ai/market/grok-imagine/upscale.md>) |
| `hailuo/02-image-to-video-pro` | `image_url`, `prompt` | [Hailuo Pro Image to Video](<https://docs.kie.ai/market/hailuo/02-image-to-video-pro.md>) |
| `hailuo/02-image-to-video-standard` | `duration`, `image_url`, `prompt`, `resolution` | [Hailuo Standard Image to Video](<https://docs.kie.ai/market/hailuo/02-image-to-video-standard.md>) |
| `hailuo/02-text-to-video-pro` | `prompt` | [Hailuo Pro Text to Video](<https://docs.kie.ai/market/hailuo/02-text-to-video-pro.md>) |
| `hailuo/02-text-to-video-standard` | `duration`, `prompt` | [Hailuo Standard Text to Video](<https://docs.kie.ai/market/hailuo/02-text-to-video-standard.md>) |
| `hailuo/2-3-image-to-video-pro` | `duration`, `image_url`, `prompt`, `resolution` | [Hailuo 2.3 Pro Image to Video](<https://docs.kie.ai/market/hailuo/2-3-image-to-video-pro.md>) |
| `hailuo/2-3-image-to-video-standard` | `duration`, `image_url`, `prompt`, `resolution` | [Hailuo 2.3 Standard Image to Video](<https://docs.kie.ai/market/hailuo/2-3-image-to-video-standard.md>) |
| `happyhorse-1-1/image-to-video` | `image_urls` | [HappyHorse-1-1 image-to-video](<https://docs.kie.ai/market/happyhorse-1-1/image-to-video.md>) |
| `happyhorse-1-1/reference-to-video` | `prompt`, `reference_image` | [HappyHorse-1-1 reference-to-video](<https://docs.kie.ai/market/happyhorse-1-1/reference-to-video.md>) |
| `happyhorse-1-1/text-to-video` | `prompt` | [HappyHorse-1-1 text-to-video](<https://docs.kie.ai/market/happyhorse-1-1/text-to-video.md>) |
| `happyhorse/image-to-video` | `image_urls` | [HappyHorse - image-to-video](<https://docs.kie.ai/market/happyhorse/image-to-video.md>) |
| `happyhorse/reference-to-video` | `prompt`, `reference_image` | [HappyHorse - reference-to-video](<https://docs.kie.ai/market/happyhorse/reference-to-video.md>) |
| `happyhorse/text-to-video` | `prompt` | [HappyHorse - text-to-video](<https://docs.kie.ai/market/happyhorse/text-to-video.md>) |
| `happyhorse/video-edit` | `prompt`, `video_url` | [HappyHorse - video-edit](<https://docs.kie.ai/market/happyhorse/video-edit.md>) |
| `ideogram/character` | `prompt`, `reference_image_urls` | [Ideogram - Character](<https://docs.kie.ai/market/ideogram/character.md>) |
| `ideogram/character-edit` | `image_url`, `mask_url`, `prompt`, `reference_image_urls` | [Ideogram - Character Edit](<https://docs.kie.ai/market/ideogram/character-edit.md>) |
| `ideogram/character-remix` | `image_url`, `prompt`, `reference_image_urls` | [Ideogram - Character Remix](<https://docs.kie.ai/market/ideogram/character-remix.md>) |
| `ideogram/v3-edit` | `image_url`, `mask_url`, `prompt` | [Ideogram V3 Edit](<https://docs.kie.ai/market/ideogram/v3-edit.md>) |
| `ideogram/v3-remix` | `image_url`, `prompt` | [Ideogram V3 Remix](<https://docs.kie.ai/market/ideogram/v3-remix.md>) |
| `ideogram/v3-text-to-image` | `prompt` | [Ideogram V3 Text to Image](<https://docs.kie.ai/market/ideogram/v3-text-to-image.md>) |
| `infinitalk/from-audio` | `audio_url`, `image_url`, `prompt` | [Infinitalk - From Audio](<https://docs.kie.ai/market/infinitalk/from-audio.md>) |
| `kling-2.6/image-to-video` | `duration`, `image_urls`, `prompt`, `sound` | [Kling 2.6 Image to Video](<https://docs.kie.ai/market/kling/image-to-video.md>) |
| `kling-2.6/motion-control` | `character_orientation`, `input_urls`, `mode`, `video_urls` | [Kling 2.6 motion-control](<https://docs.kie.ai/market/kling/motion-control.md>) |
| `kling-2.6/text-to-video` | `aspect_ratio`, `duration`, `prompt`, `sound` | [Kling 2.6 Text to Video](<https://docs.kie.ai/market/kling/text-to-video.md>) |
| `kling-3.0-omni/image-to-video` |  | [Kling 3.0 Omni  Image To Video](<https://docs.kie.ai/market/kling/v3-omni-image-to-video.md>) |
| `kling-3.0-omni/reference-to-video` |  | [Kling 3.0 Omni Reference To Video](<https://docs.kie.ai/market/kling/v3-omni-reference-to-video.md>) |
| `kling-3.0-omni/text-to-video` | `prompt` | [Kling 3.0 Omni Text to Video](<https://docs.kie.ai/market/kling/v3-omni-text-to-video.md>) |
| `kling-3.0-omni/transformation` |  | [Kling 3.0 Omni Transformation](<https://docs.kie.ai/market/kling/v3-omni-transformation.md>) |
| `kling-3.0/motion-control` | `input_urls`, `video_urls` | [Kling-3.0 motion-control](<https://docs.kie.ai/market/kling/motion-control-v3.md>) |
| `kling-3.0/video` | `aspect_ratio`, `duration`, `mode`, `multi_prompt`, `multi_shots`, `prompt`, `sound` | [Kling 3.0](<https://docs.kie.ai/market/kling/kling-3-0.md>) |
| `kling/ai-avatar-pro` | `audio_url`, `image_url`, `prompt` | [Kling AI Avatar Pro](<https://docs.kie.ai/market/kling/ai-avatar-pro.md>) |
| `kling/ai-avatar-standard` | `audio_url`, `image_url`, `prompt` | [Kling AI Avatar Standard](<https://docs.kie.ai/market/kling/ai-avatar-standard.md>) |
| `kling/v2-1-master-image-to-video` | `duration`, `image_url`, `prompt` | [Kling V2.1 Master Image to Video](<https://docs.kie.ai/market/kling/v2-1-master-image-to-video.md>) |
| `kling/v2-1-master-text-to-video` | `duration`, `prompt` | [Kling V2.1 Master Text to Video](<https://docs.kie.ai/market/kling/v2-1-master-text-to-video.md>) |
| `kling/v2-1-pro` | `duration`, `image_url`, `prompt` | [Kling V2.1 Pro](<https://docs.kie.ai/market/kling/v2-1-pro.md>) |
| `kling/v2-1-standard` | `duration`, `image_url`, `prompt` | [Kling V2.1 Standard](<https://docs.kie.ai/market/kling/v2-1-standard.md>) |
| `kling/v2-5-turbo-image-to-video-pro` | `duration`, `image_url`, `prompt` | [Kling - V2.5 Turbo Image to Video Pro](<https://docs.kie.ai/market/kling/v25-turbo-image-to-video-pro.md>) |
| `kling/v2-5-turbo-text-to-video-pro` | `duration`, `prompt` | [Kling - V2.5 Turbo Text to Video Pro](<https://docs.kie.ai/market/kling/v25-turbo-text-to-video-pro.md>) |
| `kling/v3-turbo-image-to-video` | `duration`, `image_urls`, `prompt`, `resolution` | [Kling - V3 Turbo Image to Video](<https://docs.kie.ai/market/kling/v3-turbo-image-to-video.md>) |
| `kling/v3-turbo-text-to-video` | `aspect_ratio`, `duration`, `prompt`, `resolution` | [Kling - V3 Turbo Text to Video](<https://docs.kie.ai/market/kling/v3-turbo-text-to-video.md>) |
| `minimax-h3/image-to-video` | `duration`, `prompt` | [MiniMax H3 Image-to-Video](<https://docs.kie.ai/market/minimax-h3/image-to-video.md>) |
| `minimax-h3/reference-to-video` | `duration`, `prompt` | [MiniMax H3 Reference-to-Video](<https://docs.kie.ai/market/minimax-h3/reference-to-video.md>) |
| `minimax-h3/text-to-video` | `aspect_ratio`, `duration`, `prompt` | [MiniMax H3 Text-to-Video](<https://docs.kie.ai/market/minimax-h3/text-to-video.md>) |
| `nano-banana-2` | `prompt` | [Google - Nano Banana 2](<https://docs.kie.ai/market/google/nanobanana2.md>) |
| `nano-banana-2-1` | `prompt` | [Google - Nano Banana 2.1](<https://docs.kie.ai/market/google/nanobanana-2-1.md>) |
| `nano-banana-2-lite` | `aspect_ratio`, `prompt` | [Google - Nano Banana 2 Lite](<https://docs.kie.ai/market/google/nano-banana-2-lite.md>) |
| `nano-banana-pro` | `prompt` | [Google - Nano Banana Pro](<https://docs.kie.ai/market/google/pro-image-to-image.md>) |
| `omnihuman-1-5` | `audio_url`, `image_url` | [Omnihuman 1.5](<https://docs.kie.ai/market/omnihuman-1-5.md>) |
| `omnihuman-1-5/human-identification` | `image_url` | [Omnihuman 1.5 Human Identification](<https://docs.kie.ai/market/omnihuman-1-5/human-identification.md>) |
| `omnihuman-1-5/subject-detection` | `image_url` | [OmniHuman 1.5 Subject Detection](<https://docs.kie.ai/market/omnihuman-1-5/subject-detection.md>) |
| `pixverse-v6/extend` |  | [PixVerse V6 Video Extension](<https://docs.kie.ai/market/pixverse/extend.md>) |
| `pixverse-v6/image-to-video` | `duration`, `image_urls`, `prompt`, `quality` | [PixVerse V6 Image-to-Video](<https://docs.kie.ai/market/pixverse/image-to-video.md>) |
| `pixverse-v6/reference-to-video` | `aspect_ratio`, `duration`, `image_references`, `prompt`, `quality` | [PixVerse V6 Fusion / Reference-to-Video](<https://docs.kie.ai/market/pixverse/reference-to-video.md>) |
| `pixverse-v6/text-to-video` | `aspect_ratio`, `duration`, `prompt`, `quality` | [PixVerse V6 Text-to-Video](<https://docs.kie.ai/market/pixverse/text-to-video.md>) |
| `pixverse-v6/transition` | `duration`, `first_frame_image_url`, `last_frame_image_url`, `prompt`, `quality` | [PixVerse V6 First & Last Frame Transition](<https://docs.kie.ai/market/pixverse/transition.md>) |
| `qwen/image-edit` | `image_url`, `prompt` | [Qwen - Image Edit](<https://docs.kie.ai/market/qwen/image-edit.md>) |
| `qwen/image-to-image` | `image_url`, `prompt` | [Qwen - Image to Image](<https://docs.kie.ai/market/qwen/image-to-image.md>) |
| `qwen/text-to-image` | `prompt` | [Qwen - Text to Image](<https://docs.kie.ai/market/qwen/text-to-image.md>) |
| `qwen2-1/image-to-image` | `image_urls`, `prompt` | [Qwen 2.1 - Image to Image](<https://docs.kie.ai/market/qwen2-1/image-to-image.md>) |
| `qwen2-1/text-to-image` | `prompt` | [Qwen 2.1 - Text to Image](<https://docs.kie.ai/market/qwen2-1/text-to-image.md>) |
| `qwen2/image-edit` | `image_url`, `prompt` | [Qwen2 - Image Edit](<https://docs.kie.ai/market/qwen2/image-edit.md>) |
| `qwen2/text-to-image` | `prompt` | [Qwen2 - Text To Image](<https://docs.kie.ai/market/qwen2/text-to-image.md>) |
| `qwen3/image-to-image` | `image_urls`, `prompt` | [Qwen3 Image to Image](<https://docs.kie.ai/market/qwen3/image-to-image.md>) |
| `qwen3/pro-image-to-image` | `image_urls`, `prompt` | [Qwen3 Pro Image to Image](<https://docs.kie.ai/market/qwen3-pro/image-to-image.md>) |
| `qwen3/pro-text-to-image` | `prompt` | [Qwen3 Pro Text to Image](<https://docs.kie.ai/market/qwen3-pro/text-to-image.md>) |
| `qwen3/text-to-image` | `prompt` | [Qwen3 Text to Image](<https://docs.kie.ai/market/qwen3/text-to-image.md>) |
| `recraft/crisp-upscale` | `image` | [Recraft - Crisp Upscale](<https://docs.kie.ai/market/recraft/crisp-upscale.md>) |
| `recraft/remove-background` | `image` | [Recraft - Remove Background](<https://docs.kie.ai/market/recraft/remove-background.md>) |
| `runway` | `duration`, `prompt`, `quality` | [Generate AI Video](<https://docs.kie.ai/runway-api/generate-ai-video.md>) |
| `runway/extend-ai-video` | `prompt`, `quality`, `task_id` | [Extend AI Video](<https://docs.kie.ai/runway-api/extend-ai-video.md>) |
| `runway/gen4-aleph` | `prompt`, `video_url` | [Generate Aleph Video](<https://docs.kie.ai/runway-api/generate-aleph-video.md>) |
| `seedream/4.5-edit` | `aspect_ratio`, `image_urls`, `prompt`, `quality` | [Seedream4.5 - Edit](<https://docs.kie.ai/market/seedream/4-5-edit.md>) |
| `seedream/4.5-text-to-image` | `aspect_ratio`, `prompt`, `quality` | [Seedream4.5 - Text to Image](<https://docs.kie.ai/market/seedream/4-5-text-to-image.md>) |
| `seedream/5-flash-image-to-image` | `aspect_ratio`, `image_urls`, `prompt` | [Seedream5.0 Flash - Image to Image](<https://docs.kie.ai/market/seedream/5-flash-image-to-image.md>) |
| `seedream/5-flash-layer-decomposition` | `image_url` | [Seedream5.0 Flash -  Layer Decomposition](<https://docs.kie.ai/market/seedream/5-flash-layer-decomposition.md>) |
| `seedream/5-flash-text-to-image` | `aspect_ratio`, `prompt` | [Seedream5.0 Flash - Text to Image](<https://docs.kie.ai/market/seedream/5-flash-text-to-image.md>) |
| `seedream/5-lite-image-to-image` | `aspect_ratio`, `image_urls`, `prompt`, `quality` | [Seedream5.0 Lite - Image to Image](<https://docs.kie.ai/market/seedream-5-lite-image-to-image.md>) |
| `seedream/5-lite-text-to-image` | `aspect_ratio`, `prompt`, `quality` | [Seedream5.0 Lite - Text to Image](<https://docs.kie.ai/market/seedream/5-lite-text-to-image.md>) |
| `seedream/5-pro-image-to-image` | `aspect_ratio`, `image_urls`, `prompt`, `quality` | [Seedream5.0 Pro - Image to Image](<https://docs.kie.ai/market/seedream/5-pro-image-to-image.md>) |
| `seedream/5-pro-layer-decomposition` | `image_url`, `size` | [Seedream5.0 Pro -  Layer Decomposition](<https://docs.kie.ai/market/seedream/5-pro-layer-decomposition.md>) |
| `seedream/5-pro-text-to-image` | `aspect_ratio`, `prompt`, `quality` | [Seedream5.0 Pro - Text to Image](<https://docs.kie.ai/market/seedream/5-pro-text-to-image.md>) |
| `topaz/image-upscale` | `image_url`, `upscale_factor` | [Topaz - Image Upscale](<https://docs.kie.ai/market/topaz/image-upscale.md>) |
| `topaz/video-upscale` | `video_url` | [Topaz - Video Upscale](<https://docs.kie.ai/market/topaz/video-upscale.md>) |
| `veo-3-1` | `prompt` | [Generate Veo3.1 Video](<https://docs.kie.ai/veo3-api/generate-veo-3-video.md>) |
| `veo/extend` | `prompt`, `task_id` | [Extend Veo3.1 Video](<https://docs.kie.ai/veo3-api/extend-video.md>) |
| `veo/get-1080p-video` | `taskId` | [Get 1080P Video](<https://docs.kie.ai/veo3-api/get-veo-3-1080-p-video.md>) |
| `veo/get-4k-video` | `task_id` | [Get 4K Video](<https://docs.kie.ai/veo3-api/get-veo-3-4k-video.md>) |
| `volcengine/video-to-video-lip-sync` | `audio_url`, `mode`, `video_url` | [Volcengine video to video lip sync](<https://docs.kie.ai/market/volcengine/video-to-video-lip-sync.md>) |
| `wan/2-2-a14b-image-to-video-turbo` | `image_url`, `prompt` | [Wan - 2.2 A14B Image to Video Turbo](<https://docs.kie.ai/market/wan/2-2-a14b-image-to-video-turbo.md>) |
| `wan/2-2-a14b-speech-to-video-turbo` | `audio_url`, `image_url`, `prompt` | [Wan - 2.2 A14B Speech to Video Turbo](<https://docs.kie.ai/market/wan/2-2-a14b-speech-to-video-turbo.md>) |
| `wan/2-2-a14b-text-to-video-turbo` | `prompt` | [Wan - 2.2 A14B Text to Video Turbo](<https://docs.kie.ai/market/wan/2-2-a14b-text-to-video-turbo.md>) |
| `wan/2-2-animate-move` | `image_url`, `video_url` | [Wan - Animate Move](<https://docs.kie.ai/market/wan/2-2-animate-move.md>) |
| `wan/2-2-animate-replace` | `image_url`, `video_url` | [Wan - Animate Replace](<https://docs.kie.ai/market/wan/2-2-animate-replace.md>) |
| `wan/2-5-image-to-video` | `duration`, `image_url`, `prompt`, `resolution` | [Wan 2.5 - Image to Video](<https://docs.kie.ai/market/wan/2-5-image-to-video.md>) |
| `wan/2-5-text-to-video` | `duration`, `prompt`, `resolution` | [Wan 2.5 - Text to Video](<https://docs.kie.ai/market/wan/2-5-text-to-video.md>) |
| `wan/2-6-flash-image-to-video` | `audio`, `image_urls`, `prompt` | [Wan - 2.6-flash-image-to-video](<https://docs.kie.ai/market/wan/2-6-flash-image-to-video.md>) |
| `wan/2-6-flash-video-to-video` | `prompt`, `video_urls` | [Wan - 2-6-flash-video-to-video](<https://docs.kie.ai/market/wan/2-6-flash-video-to-video.md>) |
| `wan/2-6-image-to-video` | `image_urls`, `prompt` | [Wan 2.6 - Image to Video](<https://docs.kie.ai/market/wan/2-6-image-to-video.md>) |
| `wan/2-6-text-to-video` | `prompt` | [Wan 2.6 - Text to Video](<https://docs.kie.ai/market/wan/2-6-text-to-video.md>) |
| `wan/2-6-video-to-video` | `prompt`, `video_urls` | [Wan 2.6 - Video to Video](<https://docs.kie.ai/market/wan/2-6-video-to-video.md>) |
| `wan/2-7-image` | `prompt` | [Wan 2.7 Image](<https://docs.kie.ai/market/wan/2-7-image.md>) |
| `wan/2-7-image-pro` | `prompt` | [Wan 2.7 Image Pro](<https://docs.kie.ai/market/wan/2-7-image-pro.md>) |
| `wan/2-7-image-to-video` | `prompt` | [Wan 2.7 - Image to Video](<https://docs.kie.ai/market/wan/2-7-image-to-video.md>) |
| `wan/2-7-r2v` | `prompt` | [Wan 2.7 - Reference to Video](<https://docs.kie.ai/market/wan/2-7-r2v.md>) |
| `wan/2-7-text-to-video` | `prompt` | [Wan 2.7 - Text to Video](<https://docs.kie.ai/market/wan/2-7-text-to-video.md>) |
| `wan/2-7-videoedit` | `video_url` | [Wan 2.7 - Video Edit](<https://docs.kie.ai/market/wan/2-7-videoedit.md>) |
| `wan/3-0-video` |  | [Wan 3.0 - Video](<https://docs.kie.ai/market/wan/3-0-video.md>) |
| `wan/3-0-video-prime` |  | [Wan 3.0 - Video Prime](<https://docs.kie.ai/market/wan/3-0-video-prime.md>) |
| `z-image` | `aspect_ratio`, `prompt` | [Z-Image](<https://docs.kie.ai/market/z-image/z-image.md>) |
