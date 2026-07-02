# KIE.AI Market Model Registry

Extracted 114 model-specific schemas for `POST /api/v1/jobs/createTask`.

## Kling 3.0

- Model value(s): `unknown`
- Required input fields: none detected
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/kling/kling-3-0.md

## Bytedance Seedance 1.5 Pro

- Model value(s): `bytedance/seedance-1.5-pro`
- Required input fields: prompt, aspect_ratio, duration
- Optional input fields: input_urls, resolution, fixed_lens, generate_audio, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/seedance-1-5-pro.md

## Bytedance Seedance 2.0

- Model value(s): `bytedance/seedance-2`
- Required input fields: none detected
- Optional input fields: prompt, first_frame_url, last_frame_url, reference_image_urls, reference_video_urls , reference_audio_urls, return_last_frame, generate_audio, resolution, aspect_ratio, duration, web_search, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/seedance-2.md

## Bytedance Seedance 2.0 Fast

- Model value(s): `bytedance/seedance-2-fast`
- Required input fields: none detected
- Optional input fields: prompt, first_frame_url, last_frame_url, reference_image_urls, reference_video_urls , reference_audio_urls, return_last_frame, generate_audio, resolution, aspect_ratio, duration, web_search, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/seedance-2-fast.md

## Bytedance Seedance 2.0 Mini

- Model value(s): `bytedance/seedance-2-fast`, `bytedance/seedance-2-mini`
- Required input fields: none detected
- Optional input fields: prompt, first_frame_url, last_frame_url, reference_image_urls, reference_video_urls , reference_audio_urls, generate_audio, resolution, aspect_ratio, duration, web_search, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/seedance-2-mini.md

## Seedream3.0 - Text to Image

- Model value(s): `bytedance/seedream`
- Required input fields: prompt
- Optional input fields: image_size, guidance_scale, seed
- Source: https://docs.kie.ai/market/seedream/seedream.md

## Seedream4.0 - Edit

- Model value(s): `bytedance/seedream-v4-edit`
- Required input fields: prompt, image_urls
- Optional input fields: image_size, image_resolution, max_images, seed, nsfw_checker
- Source: https://docs.kie.ai/market/seedream/seedream-v4-edit.md

## Seedream4.0 - Text to Image

- Model value(s): `bytedance/seedream-v4-text-to-image`
- Required input fields: prompt
- Optional input fields: image_size, image_resolution, max_images, seed, nsfw_checker
- Source: https://docs.kie.ai/market/seedream/seedream-v4-text-to-image.md

## Bytedance - V1 Lite Image to Video

- Model value(s): `bytedance/v1-lite-image-to-video`
- Required input fields: prompt, image_url
- Optional input fields: resolution, duration, camera_fixed, seed, enable_safety_checker, end_image_url, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/v1-lite-image-to-video.md

## Bytedance - V1 Lite Text to Video

- Model value(s): `bytedance/v1-lite-text-to-video`
- Required input fields: prompt
- Optional input fields: aspect_ratio, resolution, duration, camera_fixed, seed, enable_safety_checker, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/v1-lite-text-to-video.md

## Bytedance V1 Pro Fast Image to Video

- Model value(s): `bytedance/v1-pro-fast-image-to-video`
- Required input fields: prompt, image_url
- Optional input fields: resolution, duration, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/v1-pro-fast-image-to-video.md

## Bytedance V1 Pro Image to Video

- Model value(s): `bytedance/v1-pro-image-to-video`
- Required input fields: prompt, image_url
- Optional input fields: resolution, duration, camera_fixed, seed, enable_safety_checker, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/v1-pro-image-to-video.md

## Bytedance - V1 Pro Text to Video

- Model value(s): `bytedance/v1-pro-text-to-video`
- Required input fields: prompt
- Optional input fields: aspect_ratio, resolution, duration, camera_fixed, seed, enable_safety_checker, nsfw_checker
- Source: https://docs.kie.ai/market/bytedance/v1-pro-text-to-video.md

## elevenlabs/audio-isolation

- Model value(s): `elevenlabs/audio-isolation`
- Required input fields: audio_url
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/elevenlabs/audio-isolation.md

## elevenlabs/text-to-dialogue-v3

- Model value(s): `elevenlabs/text-to-dialogue-v3`
- Required input fields: dialogue
- Optional input fields: stability, language_code
- Source: https://docs.kie.ai/market/elevenlabs/text-to-dialogue-v3.md

## elevenlabs/text-to-speech-multilingual-v2

- Model value(s): `elevenlabs/text-to-speech-multilingual-v2`
- Required input fields: text, voice
- Optional input fields: stability, similarity_boost, style, speed, timestamps, previous_text, next_text, language_code
- Source: https://docs.kie.ai/market/elevenlabs/text-to-speech-multilingual-v2.md

## elevenlabs/text-to-speech-turbo-2-5

- Model value(s): `elevenlabs/text-to-speech-turbo-2-5`
- Required input fields: text
- Optional input fields: voice, stability, similarity_boost, style, speed, timestamps, previous_text, next_text, language_code
- Source: https://docs.kie.ai/market/elevenlabs/text-to-speech-turbo-2-5.md

## Flux-2 - Image to Image

- Model value(s): `flux-2/flex-image-to-image`
- Required input fields: input_urls, prompt, aspect_ratio, resolution
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/flux2/flex-image-to-image.md

## Flux-2 - Text to Image

- Model value(s): `flux-2/flex-text-to-image`
- Required input fields: prompt, aspect_ratio, resolution
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/flux2/flex-text-to-image.md

## Flux-2 - Pro Image to Image

- Model value(s): `flux-2/pro-image-to-image`
- Required input fields: input_urls, prompt, aspect_ratio, resolution
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/flux2/pro-image-to-image.md

## Flux-2 - Pro Text to Image

- Model value(s): `flux-2/pro-text-to-image`
- Required input fields: prompt, aspect_ratio, resolution
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/flux2/pro-text-to-image.md

## Gemini Omni Video

- Model value(s): `gemini-omni-video`
- Required input fields: prompt, duration
- Optional input fields: image_urls, audio_ids, video_list, character_ids, aspect_ratio, seed, resolution
- Source: https://docs.kie.ai/market/gemini-omni-video.md

## Google - imagen4

- Model value(s): `google/imagen4`
- Required input fields: prompt
- Optional input fields: negative_prompt, aspect_ratio, seed
- Source: https://docs.kie.ai/market/google/imagen4.md

## Google - imagen4-fast

- Model value(s): `google/imagen4-fast`
- Required input fields: prompt
- Optional input fields: negative_prompt, aspect_ratio, seed
- Source: https://docs.kie.ai/market/google/imagen4-fast.md

## Google - imagen4-ultra

- Model value(s): `google/imagen4-ultra`
- Required input fields: prompt
- Optional input fields: negative_prompt, aspect_ratio, seed
- Source: https://docs.kie.ai/market/google/imagen4-ultra.md

## Google - Nano Banana

- Model value(s): `google/nano-banana`
- Required input fields: prompt
- Optional input fields: output_format, aspect_ratio, image_size, nsfw_checker
- Source: https://docs.kie.ai/market/google/nano-banana.md

## Google - Nano Banana Edit

- Model value(s): `google/nano-banana-edit`
- Required input fields: prompt, image_urls
- Optional input fields: output_format, aspect_ratio, image_size
- Source: https://docs.kie.ai/market/google/nano-banana-edit.md

## GPT Image 2 - Image To Image

- Model value(s): `gpt-image-2-image-to-image`
- Required input fields: prompt, input_urls
- Optional input fields: aspect_ratio, resolution
- Source: https://docs.kie.ai/market/gpt/gpt-image-2-image-to-image.md

## GPT Image-2 - Text to Image

- Model value(s): `gpt-image-2-text-to-image`
- Required input fields: prompt
- Optional input fields: aspect_ratio, resolution
- Source: https://docs.kie.ai/market/gpt/gpt-image-2-text-to-image.md

## GPT Image-1.5 - Image to Image

- Model value(s): `gpt-image/1.5-image-to-image`
- Required input fields: input_urls, prompt, aspect_ratio, quality
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/gpt-image/1-5-image-to-image.md

## GPT Image-1.5 - Text to Image

- Model value(s): `gpt-image/1.5-text-to-image`
- Required input fields: prompt, aspect_ratio, quality
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/gpt-image/1-5-text-to-image.md

## Grok Imagine Video 1.5 Preview

- Model value(s): `grok-imagine-video-1-5-preview`
- Required input fields: none detected
- Optional input fields: prompt, image_urls, aspect_ratio, resolution, duration, nsfw_checker
- Source: https://docs.kie.ai/market/grok-imagine/1-5-preview.md

## Grok Imagine - Video Extend

- Model value(s): `grok-imagine/extend`
- Required input fields: task_id, prompt, extend_at, extend_times
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/grok-imagine/extend.md

## Grok Imagine - image to image

- Model value(s): `grok-imagine/image-to-image`
- Required input fields: image_urls
- Optional input fields: prompt, nsfw_checker
- Source: https://docs.kie.ai/market/grok-imagine/image-to-image.md

## Grok Imagine Image to Video

- Model value(s): `grok-imagine/image-to-video`
- Required input fields: none detected
- Optional input fields: image_urls, task_id, index, prompt, mode, duration, resolution, aspect_ratio, nsfw_checker
- Source: https://docs.kie.ai/market/grok-imagine/image-to-video.md

## Grok Imagine - Text to Image

- Model value(s): `grok-imagine/text-to-image`
- Required input fields: prompt
- Optional input fields: aspect_ratio, nsfw_checker, enable_pro
- Source: https://docs.kie.ai/market/grok-imagine/text-to-image.md

## Grok Imagine Text to Video

- Model value(s): `grok-imagine/text-to-video`
- Required input fields: prompt
- Optional input fields: aspect_ratio, mode, duration, resolution, nsfw_checker
- Source: https://docs.kie.ai/market/grok-imagine/text-to-video.md

## Grok Imagine - Video Upscale

- Model value(s): `grok-imagine/upscale`
- Required input fields: task_id
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/grok-imagine/upscale.md

## Hailuo Pro Image to Video

- Model value(s): `hailuo/02-image-to-video-pro`
- Required input fields: prompt, image_url
- Optional input fields: end_image_url, prompt_optimizer, nsfw_checker
- Source: https://docs.kie.ai/market/hailuo/02-image-to-video-pro.md

## Hailuo Standard Image to Video

- Model value(s): `hailuo/02-image-to-video-standard`
- Required input fields: prompt, image_url
- Optional input fields: end_image_url, duration, resolution, prompt_optimizer, nsfw_checker
- Source: https://docs.kie.ai/market/hailuo/02-image-to-video-standard.md

## Hailuo Pro Text to Video

- Model value(s): `hailuo/02-text-to-video-pro`
- Required input fields: prompt
- Optional input fields: prompt_optimizer, nsfw_checker
- Source: https://docs.kie.ai/market/hailuo/02-text-to-video-pro.md

## Hailuo Standard Text to Video

- Model value(s): `hailuo/02-text-to-video-standard`
- Required input fields: prompt
- Optional input fields: duration, prompt_optimizer, nsfw_checker
- Source: https://docs.kie.ai/market/hailuo/02-text-to-video-standard.md

## Hailuo 2.3 Pro Image to Video

- Model value(s): `hailuo/2-3-image-to-video-pro`
- Required input fields: prompt, image_url
- Optional input fields: duration, resolution, nsfw_checker
- Source: https://docs.kie.ai/market/hailuo/2-3-image-to-video-pro.md

## Hailuo 2.3 Standard Image to Video

- Model value(s): `hailuo/2-3-image-to-video-standard`
- Required input fields: prompt, image_url
- Optional input fields: duration, resolution, nsfw_checker
- Source: https://docs.kie.ai/market/hailuo/2-3-image-to-video-standard.md

## HappyHorse 1.1 图生视频

- Model value(s): `happyhorse-1-1/image-to-video`
- Required input fields: image_urls
- Optional input fields: prompt, resolution, duration
- Source: https://docs.kie.ai/38308980e0.md

## HappyHorse-1-1 image-to-video

- Model value(s): `happyhorse-1-1/image-to-video`
- Required input fields: image_urls
- Optional input fields: prompt, resolution, duration
- Source: https://docs.kie.ai/market/happyhorse-1-1/image-to-video.md

## HappyHorse 1.1 参考图生成视频

- Model value(s): `happyhorse-1-1/reference-to-video`
- Required input fields: prompt, reference_image
- Optional input fields: resolution, aspect_ratio, duration
- Source: https://docs.kie.ai/38309489e0.md

## HappyHorse-1-1 reference-to-video

- Model value(s): `happyhorse-1-1/reference-to-video`
- Required input fields: prompt, reference_image
- Optional input fields: resolution, aspect_ratio, duration
- Source: https://docs.kie.ai/market/happyhorse-1-1/reference-to-video.md

## HappyHorse 1.1 文生视频

- Model value(s): `happyhorse-1-1/text-to-video`
- Required input fields: prompt
- Optional input fields: resolution, aspect_ratio, duration
- Source: https://docs.kie.ai/38309290e0.md

## HappyHorse-1-1 text-to-video

- Model value(s): `happyhorse-1-1/text-to-video`
- Required input fields: prompt
- Optional input fields: resolution, aspect_ratio, duration
- Source: https://docs.kie.ai/market/happyhorse-1-1/text-to-video.md

## HappyHorse - image-to-video

- Model value(s): `happyhorse/image-to-video`
- Required input fields: image_urls 
- Optional input fields: prompt, resolution, duration, seed
- Source: https://docs.kie.ai/market/happyhorse/image-to-video.md

## HappyHorse - reference-to-video

- Model value(s): `happyhorse/reference-to-video`
- Required input fields: prompt, reference_image
- Optional input fields: resolution, aspect_ratio, duration, seed
- Source: https://docs.kie.ai/market/happyhorse/reference-to-video.md

## HappyHorse - text-to-video

- Model value(s): `happyhorse/text-to-video`
- Required input fields: prompt
- Optional input fields: resolution, aspect_ratio, duration, seed
- Source: https://docs.kie.ai/market/happyhorse/text-to-video.md

## HappyHorse - video-edit

- Model value(s): `happyhorse/video-edit`
- Required input fields: prompt, video_url
- Optional input fields: reference_image , resolution, audio_setting, seed
- Source: https://docs.kie.ai/market/happyhorse/video-edit.md

## Ideogram - Character

- Model value(s): `ideogram/character`
- Required input fields: prompt, reference_image_urls
- Optional input fields: rendering_speed, style, expand_prompt, num_images, image_size, seed, negative_prompt
- Source: https://docs.kie.ai/market/ideogram/character.md

## Ideogram - Character Edit

- Model value(s): `ideogram/character-edit`
- Required input fields: prompt, image_url, mask_url, reference_image_urls
- Optional input fields: rendering_speed, style, expand_prompt, num_images, seed
- Source: https://docs.kie.ai/market/ideogram/character-edit.md

## Ideogram - Character Remix

- Model value(s): `ideogram/character-remix`
- Required input fields: prompt, image_url, reference_image_urls
- Optional input fields: rendering_speed, style, expand_prompt, image_size, num_images, seed, strength, negative_prompt, image_urls, reference_mask_urls
- Source: https://docs.kie.ai/market/ideogram/character-remix.md

## Ideogram V3 Edit

- Model value(s): `ideogram/v3-edit`
- Required input fields: prompt, image_url, mask_url
- Optional input fields: rendering_speed, expand_prompt, seed
- Source: https://docs.kie.ai/market/ideogram/v3-edit.md

## Ideogram V3 Remix

- Model value(s): `ideogram/v3-remix`
- Required input fields: prompt, image_url
- Optional input fields: rendering_speed, style, expand_prompt, image_size, num_images, seed, strength, negative_prompt
- Source: https://docs.kie.ai/market/ideogram/v3-remix.md

## Ideogram V3 Text to Image

- Model value(s): `ideogram/v3-text-to-image`
- Required input fields: prompt
- Optional input fields: rendering_speed, style, expand_prompt, image_size, seed, negative_prompt
- Source: https://docs.kie.ai/market/ideogram/v3-text-to-image.md

## Infinitalk - From Audio

- Model value(s): `infinitalk/from-audio`
- Required input fields: image_url, audio_url, prompt
- Optional input fields: resolution, seed
- Source: https://docs.kie.ai/market/infinitalk/from-audio.md

## Kling 2.6 Image to Video

- Model value(s): `kling-2.6/image-to-video`
- Required input fields: prompt, image_urls, sound, duration
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/kling/image-to-video.md

## Kling 2.6 motion-control

- Model value(s): `kling-2.6/motion-control`
- Required input fields: input_urls, video_urls, character_orientation, mode
- Optional input fields: prompt
- Source: https://docs.kie.ai/market/kling/motion-control.md

## Kling 2.6 Text to Video

- Model value(s): `kling-2.6/text-to-video`
- Required input fields: prompt, sound, aspect_ratio, duration
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/kling/text-to-video.md

## Kling-3.0 motion-control

- Model value(s): `kling-3.0/motion-control`
- Required input fields: input_urls, video_urls
- Optional input fields: prompt, mode, character_orientation, background_source
- Source: https://docs.kie.ai/market/kling/motion-control-v3.md

## Kling AI Avatar Pro

- Model value(s): `kling/ai-avatar-pro`
- Required input fields: image_url, audio_url, prompt
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/kling/ai-avatar-pro.md

## Kling AI Avatar Standard

- Model value(s): `kling/ai-avatar-standard`
- Required input fields: image_url, audio_url, prompt
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/kling/ai-avatar-standard.md

## Kling V2.1 Master Image to Video

- Model value(s): `kling/v2-1-master-image-to-video`
- Required input fields: prompt, image_url
- Optional input fields: duration, negative_prompt, cfg_scale
- Source: https://docs.kie.ai/market/kling/v2-1-master-image-to-video.md

## Kling - V2.5 Turbo Image to Video Pro

- Model value(s): `kling/v2-1-master-image-to-video`
- Required input fields: prompt, image_url
- Optional input fields: tail_image_url, duration, negative_prompt, cfg_scale
- Source: https://docs.kie.ai/market/kling/v25-turbo-image-to-video-pro.md

## Kling V2.1 Master Text to Video

- Model value(s): `kling/v2-1-master-text-to-video`
- Required input fields: prompt
- Optional input fields: duration, aspect_ratio, negative_prompt, cfg_scale
- Source: https://docs.kie.ai/market/kling/v2-1-master-text-to-video.md

## Kling V2.1 Pro

- Model value(s): `kling/v2-1-pro`
- Required input fields: prompt, image_url
- Optional input fields: duration, negative_prompt, cfg_scale, tail_image_url
- Source: https://docs.kie.ai/market/kling/v2-1-pro.md

## Kling V2.1 Standard

- Model value(s): `kling/v2-1-standard`
- Required input fields: prompt, image_url
- Optional input fields: duration, negative_prompt, cfg_scale
- Source: https://docs.kie.ai/market/kling/v2-1-standard.md

## Kling - V2.5 Turbo Text to Video Pro

- Model value(s): `kling/v2-5-turbo-text-to-video-pro`
- Required input fields: prompt
- Optional input fields: duration, aspect_ratio, negative_prompt, cfg_scale
- Source: https://docs.kie.ai/market/kling/v25-turbo-text-to-video-pro.md

## Kling - V3 Turbo Image to Video

- Model value(s): `kling/v3-turbo-image-to-video`
- Required input fields: prompt, image_urls, duration, resolution
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/kling/v3-turbo-image-to-video.md

## Kling - V3 Turbo Text to Video

- Model value(s): `kling/v3-turbo-text-to-video`
- Required input fields: prompt, duration, aspect_ratio, resolution
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/kling/v3-turbo-text-to-video.md

## Google - Nano Banana 2

- Model value(s): `nano-banana-2`
- Required input fields: prompt
- Optional input fields: image_input, aspect_ratio, resolution, output_format
- Source: https://docs.kie.ai/market/google/nanobanana2.md

## Google - Nano Banana 2 Lite

- Model value(s): `nano-banana-2-lite`
- Required input fields: prompt, aspect_ratio
- Optional input fields: image_urls
- Source: https://docs.kie.ai/market/google/nano-banana-2-lite.md

## Google - Nano Banana Pro

- Model value(s): `nano-banana-pro`
- Required input fields: prompt
- Optional input fields: image_input, aspect_ratio, resolution, output_format
- Source: https://docs.kie.ai/market/google/pro-image-to-image.md

## Omnihuman 1.5

- Model value(s): `omnihuman-1-5`
- Required input fields: image_url, audio_url
- Optional input fields: mask_url, prompt, output_resolution, pe_fast_mode, seed
- Source: https://docs.kie.ai/market/omnihuman-1-5.md

## Omnihuman 1.5 Human Identification

- Model value(s): `omnihuman-1-5/human-identification`
- Required input fields: image_url
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/omnihuman-1-5/human-identification.md

## OmniHuman 1.5 Subject Detection

- Model value(s): `omnihuman-1-5/subject-detection`
- Required input fields: image_url
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/omnihuman-1-5/subject-detection.md

## Qwen - Image Edit

- Model value(s): `qwen/image-edit`
- Required input fields: prompt, image_url
- Optional input fields: acceleration, image_size, num_inference_steps, seed, guidance_scale, sync_mode, num_images, enable_safety_checker, output_format, negative_prompt, nsfw_checker
- Source: https://docs.kie.ai/market/qwen/image-edit.md

## Qwen - Image to Image

- Model value(s): `qwen/image-to-image`
- Required input fields: prompt, image_url
- Optional input fields: strength, output_format, acceleration, negative_prompt, seed, num_inference_steps, guidance_scale, enable_safety_checker, nsfw_checker
- Source: https://docs.kie.ai/market/qwen/image-to-image.md

## Qwen - Text to Image

- Model value(s): `qwen/text-to-image`
- Required input fields: prompt
- Optional input fields: image_size, num_inference_steps, seed, guidance_scale, enable_safety_checker, output_format, negative_prompt, acceleration, nsfw_checker
- Source: https://docs.kie.ai/market/qwen/text-to-image.md

## Qwen2 - Image Edit

- Model value(s): `qwen2/image-edit`
- Required input fields: prompt, image_url
- Optional input fields: image_size, seed, output_format, nsfw_checker
- Source: https://docs.kie.ai/market/qwen2/image-edit.md

## Qwen2 - Text To Image

- Model value(s): `qwen2/image-edit`, `qwen2/text-to-image`
- Required input fields: prompt
- Optional input fields: image_size, seed, output_format, nsfw_checker
- Source: https://docs.kie.ai/market/qwen2/text-to-image.md

## Recraft - Crisp Upscale

- Model value(s): `recraft/crisp-upscale`
- Required input fields: image
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/recraft/crisp-upscale.md

## Recraft - Remove Background

- Model value(s): `recraft/remove-background`
- Required input fields: image
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/recraft/remove-background.md

## Seedream4.5 - Edit

- Model value(s): `seedream/4.5-edit`
- Required input fields: prompt, image_urls, aspect_ratio, quality
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/seedream/4-5-edit.md

## Seedream4.5 - Text to Image

- Model value(s): `seedream/4.5-text-to-image`
- Required input fields: prompt, aspect_ratio, quality
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/seedream/4-5-text-to-image.md

## Seedream5.0 Lite - Image to Image

- Model value(s): `seedream/5-lite-image-to-image`
- Required input fields: prompt, image_urls, aspect_ratio, quality
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/seedream-5-lite-image-to-image.md

## Seedream5.0 Lite - Text to Image

- Model value(s): `seedream/5-lite-text-to-image`
- Required input fields: prompt, aspect_ratio, quality
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/seedream/5-lite-text-to-image.md

## Topaz - Image Upscale

- Model value(s): `topaz/image-upscale`
- Required input fields: image_url, upscale_factor
- Optional input fields: none detected
- Source: https://docs.kie.ai/market/topaz/image-upscale.md

## Topaz - Video Upscale

- Model value(s): `topaz/video-upscale`
- Required input fields: video_url
- Optional input fields: upscale_factor
- Source: https://docs.kie.ai/market/topaz/video-upscale.md

## Volcengine video to video lip sync

- Model value(s): `volcengine/video-to-video-lip-sync`
- Required input fields: mode, video_url, audio_url
- Optional input fields: separate_vocal, open_scenedet, align_audio, align_audio_reverse, templ_start_seconds
- Source: https://docs.kie.ai/market/volcengine/video-to-video-lip-sync.md

## Wan - Image to Video

- Model value(s): `wan/2-2-a14b-image-to-video-turbo`
- Required input fields: image_url, prompt
- Optional input fields: resolution, enable_prompt_expansion, seed, acceleration, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-2-a14b-image-to-video-turbo.md

## Wan - 2.2 A14B Speech to Video Turbo

- Model value(s): `wan/2-2-a14b-speech-to-video-turbo`
- Required input fields: prompt, image_url, audio_url
- Optional input fields: num_frames, frames_per_second, resolution, negative_prompt, seed, num_inference_steps, guidance_scale, shift, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-2-a14b-speech-to-video-turbo.md

## Wan - Text to Video

- Model value(s): `wan/2-2-a14b-text-to-video-turbo`
- Required input fields: prompt
- Optional input fields: resolution, aspect_ratio, enable_prompt_expansion, seed, acceleration, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-2-a14b-text-to-video-turbo.md

## Wan - Animate Move

- Model value(s): `wan/2-2-animate-move`
- Required input fields: video_url, image_url
- Optional input fields: resolution, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-2-animate-move.md

## Wan - Animate Replace

- Model value(s): `wan/2-2-animate-replace`
- Required input fields: video_url, image_url
- Optional input fields: resolution, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-2-animate-replace.md

## Wan 2.5 - Image to Video

- Model value(s): `wan/2-5-image-to-video`
- Required input fields: prompt, image_url, duration
- Optional input fields: resolution, negative_prompt, enable_prompt_expansion, seed, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-5-image-to-video.md

## Wan 2.5 - Text to Video

- Model value(s): `wan/2-5-text-to-video`
- Required input fields: prompt, duration
- Optional input fields: aspect_ratio, resolution, negative_prompt, enable_prompt_expansion, seed, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-5-text-to-video.md

## Wan - 2.6-flash-image-to-video

- Model value(s): `wan/2-6-flash-image-to-video`
- Required input fields: prompt, image_urls, audio
- Optional input fields: duration, resolution, multi_shots, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-6-flash-image-to-video.md

## Wan - 2-6-flash-video-to-video

- Model value(s): `wan/2-6-flash-video-to-video`
- Required input fields: prompt, video_urls
- Optional input fields: duration, resolution, audio, multi_shots, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-6-flash-video-to-video.md

## Wan 2.6 - Image to Video

- Model value(s): `wan/2-6-image-to-video`
- Required input fields: prompt, image_urls
- Optional input fields: duration, resolution, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-6-image-to-video.md

## Wan 2.6 - Text to Video

- Model value(s): `wan/2-6-text-to-video`
- Required input fields: prompt
- Optional input fields: duration, resolution, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-6-text-to-video.md

## Wan 2.6 - Video to Video

- Model value(s): `wan/2-6-video-to-video`
- Required input fields: prompt, video_urls
- Optional input fields: duration, resolution, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-6-video-to-video.md

## Wan 2.7 Image

- Model value(s): `wan/2-7-image`
- Required input fields: prompt
- Optional input fields: input_urls, aspect_ratio, enable_sequential, n, resolution, thinking_mode, color_palette, bbox_list, watermark, seed, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-7-image.md

## Wan 2.7 Image Pro

- Model value(s): `wan/2-7-image-pro`
- Required input fields: prompt
- Optional input fields: input_urls, aspect_ratio, enable_sequential, n, resolution, thinking_mode, color_palette, bbox_list, watermark, seed, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-7-image-pro.md

## Wan 2.7 - Image to Video

- Model value(s): `wan/2-7-image-to-video`
- Required input fields: prompt
- Optional input fields: negative_prompt, first_frame_url, last_frame_url, first_clip_url, driving_audio_url, resolution, duration, prompt_extend, watermark, seed, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-7-image-to-video.md

## Wan 2.7 - Reference to Video

- Model value(s): `wan/2-7-r2v`
- Required input fields: prompt
- Optional input fields: negative_prompt, reference_image, reference_video, first_frame, reference_voice, resolution, aspect_ratio, duration, prompt_extend, watermark, seed, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-7-r2v.md

## Wan 2.7 - Text to Video

- Model value(s): `wan/2-7-text-to-video`
- Required input fields: prompt
- Optional input fields: negative_prompt, audio_url, resolution, ratio, duration, prompt_extend, watermark, seed, nsfw_checker
- Source: https://docs.kie.ai/market/wan/2-7-text-to-video.md

## Wan 2.7 - Video Edit

- Model value(s): `wan/2-7-videoedit`
- Required input fields: video_url
- Optional input fields: prompt, negative_prompt, resolution, aspect_ratio, duration, audio_setting, prompt_extend, watermark, seed, nsfw_checker, reference_image
- Source: https://docs.kie.ai/market/wan/2-7-videoedit.md

## Z-Image

- Model value(s): `z-image`
- Required input fields: prompt, aspect_ratio
- Optional input fields: nsfw_checker
- Source: https://docs.kie.ai/market/z-image/z-image.md

