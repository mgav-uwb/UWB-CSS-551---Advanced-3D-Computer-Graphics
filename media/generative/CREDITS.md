---
title: "S10 Generative Media Credits"
version: "1.0"
status: draft
created_by: "Claude"
created_at: "2026-09-16T18:30"
last_modified_by: "Claude"
last_modified_at: "2026-09-16T18:30"
contributors:
  - "Claude"
tags:
  - "css551"
  - "media"
  - "licensing"
related:
  - path: "../../sessions/S10-rendering-frontier/L10-rendering-frontier.md"
    desc: "The S10 deck that embeds these assets as ../../media/generative/<name>"
  - path: "../overview/CREDITS.md"
    desc: "The S01 media manifest whose process this one follows"
---

# S10 Generative Media Credits

Media assets for the diffusion part of S10. Every asset below was verified against an
allowed license (CC0 / public domain / CC BY / CC BY-SA / Apache-2.0 repository asset;
no NC, no ND). For CC BY-SA and Apache-2.0 assets, attribution is required; use the
on-slide credit line verbatim. Images were downscaled to at most 1600 px on the long
edge and re-exported as JPEG at or under 300 KB; originals are at the source URLs.

| File | Subject | Author | Source (URL) | License | On-slide credit line |
| ---- | ------- | ------ | ------------ | ------- | -------------------- |
| `gallery-1.jpg` | Stable Diffusion output. Prompt (as recorded on Commons): "utopia at street level in city, enhanced humans waiting at lake within city for small futuristic tram to drive in, utopian European city, solar panels on all roofs in Spanish city, solarpunk, green trees, trending on artstation, matte painting, parks, ..." | Prototyperspective | https://commons.wikimedia.org/wiki/File:Green_sustainable_city_with_lots_of_public_transport_and_green_spaces.jpg | CC0 1.0 | Prototyperspective · CC0 · via Wikimedia Commons |
| `gallery-2.jpg` | Stable Diffusion output. Prompt (as recorded on Commons): "Cyberpunk, Tower of Babel, in the rain, 4k, 8k, 10k, highly detailed, illustration, sharp focus, hq" | uploader unnamed (credited on Commons as "Stable Diffusion") | https://commons.wikimedia.org/wiki/File:Cyberpunk_city_created_by_Stable_Diffusion.webp | CC0 1.0 | CC0 · via Wikimedia Commons |
| `gallery-3.jpg` | Stable Diffusion v1.4 output (steps 50, CFG 7, seed 1411213889). Prompt (as recorded on Commons): "Hakurei Shrine in distance, Gensokyo, nature landscape, landscape art, far view from distance, traditional Japanese architecture in distance, Shinto shrine in distance, forests, mountains, rivers, art style of ..." | Benlisquare | https://commons.wikimedia.org/wiki/File:Algorithmically-generated_landscape_artwork_of_forest_with_Shinto_shrine.png | Public domain (author dedication) | Benlisquare · Public domain · via Wikimedia Commons |
| `cfg-row.jpg` | One row (50 sampling steps) of a Stable Diffusion grid varying the classifier-free guidance scale; five of the nine columns (2.5, 7.5, 12.5, 20, 30), relabeled "w = …" | MrAlanKoh | https://commons.wikimedia.org/wiki/File:Image_grid_to_show_correlations_between_CFG_and_Sampling_Steps_-_Original.png | CC BY-SA 4.0 | MrAlanKoh · CC BY-SA 4.0 · via Wikimedia Commons (one row of the original grid) |
| `controlnet-depth.jpg` | ControlNet depth conditioning: the estimated depth map of a toy-robot photo (left) and a generated image for the prompt "Stormtrooper's lecture" (right); the top row of the README's depth example screenshot | lllyasviel (Lvmin Zhang), ControlNet repository README | https://github.com/lllyasviel/ControlNet (github_page/p15.png) | Apache-2.0 (repository license) | lllyasviel/ControlNet README, depth example · Apache-2.0 · github.com/lllyasviel/ControlNet |
| `video-strip.jpg` | Six evenly spaced frames (of 52) from an AI-generated clip of a white dragon | prompted by Lumi's AI Dreams | https://commons.wikimedia.org/wiki/File:AI-generated_video_of_a_domestic_dragon.gif | Public domain (author dedication) | prompted by Lumi's AI Dreams · Public domain · via Wikimedia Commons (six frames) |

## Notes

- Slides: `gallery-1..3.jpg` on "Gallery: prompt to image"; `cfg-row.jpg` on "Classifier-free
  guidance"; `controlnet-depth.jpg` on "Graphics-flavored control"; `video-strip.jpg` on
  "Video: add a time axis".
- `gallery-1.jpg` and `gallery-3.jpg` prompts are truncated on the slide; the full recorded
  prompts are on the Commons file pages.
- `cfg-row.jpg` is a derived crop of a CC BY-SA 4.0 work and is shared under the same license.
- The design's Cornell-scene depth render for the ControlNet slide was deferred (no offline
  model run available at build time); the README example stands in.

---

## Change Log

| Version | Date             | Author | Summary       |
| ------- | ---------------- | ------ | ------------- |
| 1.0     | 2026-09-16T18:30 | Claude | Initial manifest: six license-verified assets for the S10 diffusion slides. |
