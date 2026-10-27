#!/usr/bin/env python3
"""Reconstruct a GameVerse clip from an explicit source and time interval."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import parse_qs, urlparse


MEDIA_SUFFIXES = {".mp4", ".mkv", ".webm", ".mov"}


def source_id_from_clip_id(clip_id: str) -> str:
    parts = clip_id.rsplit("_", 2)
    if (
        len(parts) != 3
        or not re.fullmatch(r"[A-Za-z0-9_-]+", parts[0])
        or not parts[1].isdigit()
        or not parts[2].isdigit()
    ):
        raise ValueError("clip ID must be <youtube_id>_<start_index>_<end_index>")
    return parts[0]


def youtube_id(url: str) -> str | None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        if parsed.path.startswith(("/shorts/", "/live/")):
            return parsed.path.split("/")[2]
    if host in {"youtu.be", "www.youtu.be"}:
        return parsed.path.strip("/").split("/")[0]
    return None


def source_url_for_id(url_list: Path, source_id: str) -> str:
    matches = {
        url
        for line in url_list.read_text(encoding="utf-8").splitlines()
        if (url := line.strip()) and youtube_id(url) == source_id
    }
    if len(matches) != 1:
        raise ValueError(f"expected one source URL for {source_id}, found {len(matches)}")
    return matches.pop()


def cached_source(cache_dir: Path, source_id: str) -> Path | None:
    candidates = sorted(
        path for path in cache_dir.glob(source_id + ".*")
        if path.suffix.lower() in MEDIA_SUFFIXES
    )
    if len(candidates) > 1:
        raise RuntimeError(f"multiple cached media files for {source_id}: {candidates}")
    return candidates[0] if candidates else None


def download_source(url: str, source_id: str, cache_dir: Path, yt_dlp: str) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    existing = cached_source(cache_dir, source_id)
    if existing is not None:
        return existing
    subprocess.run(
        [
            yt_dlp,
            "--no-playlist",
            "--no-part",
            "--merge-output-format",
            "mkv",
            "-f",
            "bestvideo+bestaudio/best",
            "-o",
            str(cache_dir / (source_id + ".%(ext)s")),
            url,
        ],
        check=True,
    )
    downloaded = cached_source(cache_dir, source_id)
    if downloaded is None:
        raise RuntimeError("yt-dlp did not produce a supported media file")
    return downloaded


def encode_clip(source: Path, output: Path, start: float, duration: float, ffmpeg: str) -> None:
    if output.exists():
        raise FileExistsError(f"output already exists: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            ffmpeg,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(source),
            "-ss",
            str(start),
            "-t",
            str(duration),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0?",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError(f"ffmpeg did not produce a nonempty clip: {output}")


def probe_duration(path: Path, ffprobe: str) -> float:
    result = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clip-id", required=True)
    parser.add_argument("--start-seconds", type=float, required=True)
    parser.add_argument("--duration-seconds", type=float, required=True)
    parser.add_argument("--output", type=Path, required=True)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--source-video", type=Path, help="Existing local source video")
    source.add_argument("--source-url", help="Source video URL")
    source.add_argument("--url-list", type=Path, help="Find the source in gameverse_url.txt")
    parser.add_argument("--cache-dir", type=Path, default=Path.home() / ".cache/gameverse-sources")
    parser.add_argument("--yt-dlp", default="yt-dlp")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()

    source_id = source_id_from_clip_id(args.clip_id)
    if not (0 <= args.start_seconds < float("inf") and 0 < args.duration_seconds < float("inf")):
        parser.error("start and duration must be finite, with start >= 0 and duration > 0")
    if args.output.suffix.lower() != ".mp4":
        parser.error("--output must end in .mp4")
    for executable in (args.ffmpeg, args.ffprobe):
        if shutil.which(executable) is None:
            parser.error(f"required executable not found: {executable}")

    if args.source_video:
        source_video = args.source_video
        if not source_video.is_file():
            parser.error(f"source video not found: {source_video}")
    else:
        if shutil.which(args.yt_dlp) is None:
            parser.error(f"required executable not found: {args.yt_dlp}")
        url = args.source_url or source_url_for_id(args.url_list, source_id)
        if youtube_id(url) != source_id:
            parser.error("source URL video ID does not match --clip-id")
        source_video = download_source(url, source_id, args.cache_dir, args.yt_dlp)

    encode_clip(source_video, args.output, args.start_seconds, args.duration_seconds, args.ffmpeg)
    print(
        json.dumps(
            {
                "clip_id": args.clip_id,
                "output": str(args.output),
                "requested_start_s": args.start_seconds,
                "requested_duration_s": args.duration_seconds,
                "encoded_video_duration_s": probe_duration(args.output, args.ffprobe),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
