# GameVerse

**GameVerse: A Minute-Scale Gameplay Dataset for Long-Horizon Interactive World Modeling** · NeurIPS 2026

[Project](https://kangverse.github.io/GameVerse/) · arXiv (coming soon) · [Code / GitHub](https://github.com/kangverse/GameVerse) · [Hugging Face Dataset](https://huggingface.co/datasets/Kangverse/GameVerse)

## News

- **2026-10-27:** Removed the legacy caption snapshot from this GitHub repository. We are re-annotating clips with incomplete temporal caption coverage and will post another update here when the revised captions are available on Hugging Face.

## Overview

GameVerse is a gameplay video dataset for long-horizon interactive world modeling. It brings together continuous gameplay clips, camera trajectories, and structured descriptions of scene content and activity across diverse games.

The verified final video selection contains **69,678 clips**, **1,655.05 video hours**, and **349,628,223 encoded frames**. Of these, **40,752 clips** are approximately two minutes long and contribute **1,358.43 hours** (82.1% of total video duration). These values were checked against the final retained-clip manifest on October 10, 2026.

![GameVerse construction pipeline: gameplay videos are segmented into scenes, filtered, refined into clips of up to two minutes, and annotated with camera trajectories and structured captions.](website/assets/media/paper-overview-pipeline.webp)

## Dataset access and format

The GameVerse dataset is hosted on [Hugging Face](https://huggingface.co/datasets/Kangverse/GameVerse). Access is currently restricted; we will announce public availability in News. The video dataset and per-clip captions are not stored in this Git repository.

- **Clip IDs:** Each clip is identified by `<youtube_id>_<start_index>_<end_index>`. The numerical suffixes are consistent with source-frame counts at nominal frame rates; they should not be interpreted as microseconds. Use explicit video timestamps and producer metadata for precise timing.
- **Source videos:** [`gameverse_url.txt`](gameverse_url.txt) lists the source YouTube URLs, one per line. Source videos remain the property of their creators.
- **Captions:** Segment-level descriptions are associated with clip IDs and temporal intervals. Some two-minute clips do not yet have caption segments covering the full 120 seconds; see [Ongoing caption updates](#ongoing-caption-updates).
- **Camera trajectories:** Pose records can be matched to clips by ID where available. The October 2026 audit found five missing pose files in the final selection; pose availability and exact temporal alignment should be checked before use.

Clip duration refers to the video track, excluding audio or container padding. Frame counts are encoded video sample counts. Two-minute clips are identified using a 0.05-second tolerance.

## Release notes

### Dataset refinement

The final GameVerse selection differs from the version described in the original OpenReview submission. Following paper acceptance, we applied another round of fine-grained filtering and quality control to improve dataset quality and reliability. The final selection therefore contains fewer clips:

| Dataset version | Clips | Total duration | Two-minute continuous video |
| --- | ---: | ---: | ---: |
| OpenReview submission | 188K | 3,115 hours | 1,747 hours |
| Final refined release | 69.7K | 1,655 hours | 1,358 hours |

The smaller totals reflect post-acceptance curation, rather than missing files from the final selection. Please use the final-release statistics when working with or citing the dataset. The final-release values in the table are rounded; the precise values appear in the Overview above.

### Ongoing caption updates

Some two-minute clips currently have segment-level captions that do not span the full 120-second duration. We are re-annotating the affected clips to improve temporal coverage and alignment. After validation, the updated captions will be synchronized to the [Hugging Face dataset](https://huggingface.co/datasets/Kangverse/GameVerse), with the release announced in News. Caption-derived statistics remain provisional until then.
