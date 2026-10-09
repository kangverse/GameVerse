# GameVerse

**GameVerse: A Minute-Scale Gameplay Dataset for Long-Horizon Interactive World Modeling** · NeurIPS 2026

The verified final video selection contains **69,678 clips**, **1,655.05 video hours**, and **349,628,223 encoded frames**. Of these, **40,752 clips** are approximately two minutes long and account for **82.1% of video hours**. Video metadata was checked against the final OCR-pass manifest on October 10, 2026.

## Project website

The new project website is in [`website/`](website/), with eight attributed gameplay recording excerpts, duration distributions, structured annotation examples, and resource links.

The intended address is **https://gameverse.github.io/GameVerse/**. It is **not deployed yet**: this repository belongs to `kangverse`, and publishing at that address requires access to the `gameverse` account or organization and its `GameVerse` repository. The Pages workflow deliberately runs only when the repository owner is `gameverse`.

Preview locally:

```bash
python3 -m http.server 8766 --directory website
```

Open http://127.0.0.1:8766/ . For deployment, place this website in `gameverse/GameVerse`, enable GitHub Actions in Settings > Pages, and run the included workflow.

## Release status

- [Hugging Face dataset](https://huggingface.co/datasets/Kangverse/GameVerse): currently private; public access is forthcoming.
- Paper and arXiv links: forthcoming.
- Existing `caption/` files are a legacy annotation snapshot. Full-duration captions are being regenerated; caption-derived distributions are provisional.
- Camera trajectory audit found 69,673 readable pose files and five missing files in the final selection. Exact temporal alignment requires confirmation of the preprocessing timebase. This README does not imply every final clip already has validated released poses and intrinsics.

## Repository contents

- `website/`: public project page, aggregate video statistics, and short recording previews.
- `gameverse_url.txt`: 11,002 distinct collected YouTube URLs; the final selection retains 5,866 distinct source IDs.
- `caption/`: existing structured captions. Use the final release manifest to establish membership; these files alone do not define the final dataset.

## Clip IDs

IDs have the form `<youtube_id>_<start_index>_<end_index>`. The two numerical suffixes should **not** be interpreted as microseconds. Their differences are consistent with source frame counts at nominal 30 or 60 FPS; use explicit video timestamps and the producer metadata for precise time mapping. Caption and pose records can be joined by matching clip IDs when both are available.

## Statistics scope

Video duration is the video-track duration, excluding audio/container padding. Frame counts are encoded video sample counts rather than estimates from hours and a fixed FPS. Two-minute classification uses a 0.05 second tolerance. Historical collection/segmentation-stage quantities and game-title, genre, action, or pose-motion category counts require their own inventories and validated mappings; they are not inferred from final video scale.

The private paper audit, original unpublished LaTeX, full per-clip evidence, and internal paths are maintained separately from this public website repository.
