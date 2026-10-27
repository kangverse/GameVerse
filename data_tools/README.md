# GameVerse data tools

These small utilities work with source videos and caption JSON files obtained separately from the [GameVerse dataset](https://huggingface.co/datasets/Kangverse/GameVerse). They do not contain videos or per-clip annotations.

## Reconstruct a clip

Install `yt-dlp`, `ffmpeg`, and `ffprobe`. If you already have a local copy of the source video, `yt-dlp` is not needed.

```bash
python data_tools/reconstruct_clip.py \
  --clip-id '<youtube_id>_<start_index>_<end_index>' \
  --url-list gameverse_url.txt \
  --start-seconds <start_seconds> \
  --duration-seconds <duration_seconds> \
  --output /path/to/clip.mp4
```

Replace `--url-list` with `--source-url <url>` or `--source-video /path/to/source.mp4` when appropriate. The script caches downloaded sources in `~/.cache/gameverse-sources/` by default; pass `--cache-dir` to change this location.

**Supply start and duration from authoritative release metadata.** The numeric suffixes in a clip ID are not microsecond timestamps, and this utility deliberately does not convert them into seconds. Re-downloaded YouTube media may differ from the source used for the release; the result is a time-window reconstruction, not a guarantee of frame-identical data. Respect the source creator's rights and the source platform's terms.

## Check caption coverage

For caption JSON files containing `segments[*].time_range_s` as `[start, end]` in seconds:

```bash
python data_tools/caption_coverage.py /path/to/<clip_id>.json --duration 120
```

The tool reports the union of segment intervals, uncovered time ranges, and out-of-bounds segments. Use the actual video duration for clips shorter than 120 seconds. This checks temporal coverage, not caption quality or alignment. The schema of future revised captions should be checked against the Hugging Face dataset card when released.
