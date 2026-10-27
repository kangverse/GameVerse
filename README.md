# GameVerse

**GameVerse: A Minute-Scale Gameplay Dataset for Long-Horizon Interactive World Modeling** · NeurIPS 2026

<p align="center">
  <a href="https://kangverse.github.io/GameVerse/"><img src="https://img.shields.io/badge/Project-Page-2864DC?logo=githubpages&logoColor=white" alt="Project page"></a>
  <!-- Replace the arXiv homepage URL with the GameVerse paper URL when available. -->
  <a href="https://arxiv.org/"><img src="https://img.shields.io/badge/arXiv-Coming%20Soon-B31B1B?logo=arxiv&logoColor=white" alt="arXiv paper coming soon"></a>
  <a href="https://github.com/kangverse/GameVerse/tree/main/data_tools"><img src="https://img.shields.io/badge/Code-Data%20Tools-181717?logo=github&logoColor=white" alt="Data tools code"></a>
  <a href="https://huggingface.co/datasets/Kangverse/GameVerse"><img src="https://img.shields.io/badge/Dataset-Hugging%20Face-FFD21E?logo=huggingface&logoColor=black" alt="Hugging Face dataset"></a>
</p>

## 📰 News

- **2026-10-27:** Added public data tools and removed the legacy caption snapshot from this GitHub repository. We are re-annotating clips with incomplete temporal caption coverage and will post another update here when the revised captions are available on Hugging Face.

## 📊 Overview

GameVerse is a gameplay video dataset for long-horizon interactive world modeling. It brings together continuous gameplay clips, camera trajectories, and structured descriptions of scene content and activity across diverse games.

The verified final video selection contains **69,678 clips**, **1,655.05 video hours**, and **349,628,223 encoded frames**. Of these, **40,752 clips** are approximately two minutes long and contribute **1,358.43 hours** (82.1% of total video duration). These values were checked against the final retained-clip manifest on October 10, 2026.

![GameVerse construction pipeline: gameplay videos are segmented into scenes, filtered, refined into clips of up to two minutes, and annotated with camera trajectories and structured captions.](website/assets/media/paper-overview-pipeline.webp)

## 📥 Dataset access and format

The GameVerse dataset is hosted on [Hugging Face](https://huggingface.co/datasets/Kangverse/GameVerse). Access is currently restricted; we will announce public availability in News. The video dataset and per-clip captions are not stored in this Git repository.

- **Clip IDs:** Each clip is identified by `<youtube_id>_<start_index>_<end_index>`. The numerical suffixes are consistent with source-frame counts at nominal frame rates; they should not be interpreted as microseconds. Use explicit video timestamps and producer metadata for precise timing.
- **Source videos:** [`gameverse_url.txt`](gameverse_url.txt) lists the source YouTube URLs, one per line. Source videos remain the property of their creators.
- **Captions:** Segment-level descriptions are associated with clip IDs and temporal intervals. Some two-minute clips do not yet have caption segments covering the full 120 seconds; see [Ongoing caption updates](#ongoing-caption-updates).
- **Camera trajectories:** Pose records can be matched to clips by ID where available. The October 2026 audit found five missing pose files in the final selection; pose availability and exact temporal alignment should be checked before use.

Clip duration refers to the video track, excluding audio or container padding. Frame counts are encoded video sample counts. Two-minute clips are identified using a 0.05-second tolerance.

## 🛠️ Data tools

The [`data_tools/`](data_tools/) directory contains two small utilities:

- [`reconstruct_clip.py`](data_tools/reconstruct_clip.py) downloads or reads a source video and extracts a clip from **explicit start time and duration**. It does not infer timestamps from the clip ID.
- [`caption_coverage.py`](data_tools/caption_coverage.py) measures the union of caption segment intervals and reports uncovered time ranges.

See the [data tools guide](data_tools/README.md) for commands and limitations. Reconstructed downloads may differ from the media used in the final release; clip IDs alone are insufficient for exact timing.

## 📝 Release notes

### Dataset refinement

The final GameVerse selection differs from the version described in the original OpenReview submission. Following paper acceptance, we applied another round of fine-grained filtering and quality control to improve dataset quality and reliability. The final selection therefore contains fewer clips:

| Dataset version | Clips | Total duration | Two-minute continuous video |
| --- | ---: | ---: | ---: |
| OpenReview submission | 188K | 3,115 hours | 1,747 hours |
| Final refined release | 69.7K | 1,655 hours | 1,358 hours |

The smaller totals reflect post-acceptance curation, rather than missing files from the final selection. Please use the final-release statistics when working with or citing the dataset. The final-release values in the table are rounded; the precise values appear in the Overview above.

### Ongoing caption updates

Some two-minute clips currently have segment-level captions that do not span the full 120-second duration. We are re-annotating the affected clips to improve temporal coverage and alignment. After validation, the updated captions will be synchronized to the [Hugging Face dataset](https://huggingface.co/datasets/Kangverse/GameVerse), with the release announced in News. Caption-derived statistics remain provisional until then.
