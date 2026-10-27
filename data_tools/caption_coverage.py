#!/usr/bin/env python3
"""Measure temporal coverage in a GameVerse-style caption JSON file."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


def segment_intervals(document: dict, duration: float) -> tuple[list[tuple[float, float]], int]:
    segments = document.get("segments")
    if not isinstance(segments, list):
        raise ValueError("caption JSON must contain a 'segments' list")

    intervals: list[tuple[float, float]] = []
    out_of_bounds = 0
    for index, segment in enumerate(segments):
        if not isinstance(segment, dict):
            raise ValueError(f"segments[{index}] must be an object")
        bounds = segment.get("time_range_s")
        if not isinstance(bounds, list) or len(bounds) != 2:
            raise ValueError(f"segments[{index}].time_range_s must be [start, end]")
        try:
            start, end = (float(value) for value in bounds)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"segments[{index}] has nonnumeric boundaries") from exc
        if not (math.isfinite(start) and math.isfinite(end) and start < end):
            raise ValueError(f"segments[{index}] has an invalid time range")
        if start < 0 or end > duration:
            out_of_bounds += 1
        clipped_start, clipped_end = max(0.0, start), min(duration, end)
        if clipped_start < clipped_end:
            intervals.append((clipped_start, clipped_end))
    return intervals, out_of_bounds


def merge_intervals(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    merged: list[list[float]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(start, end) for start, end in merged]


def coverage_report(document: dict, duration: float) -> dict:
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError("duration must be a positive finite number")
    intervals, out_of_bounds = segment_intervals(document, duration)
    merged = merge_intervals(intervals)
    gaps: list[list[float]] = []
    cursor = 0.0
    for start, end in merged:
        if start > cursor:
            gaps.append([cursor, start])
        cursor = end
    if cursor < duration:
        gaps.append([cursor, duration])
    covered = sum(end - start for start, end in merged)
    return {
        "segments": len(document["segments"]),
        "duration_s": duration,
        "covered_s": covered,
        "coverage_percent": 100.0 * covered / duration,
        "gaps_s": gaps,
        "out_of_bounds_segments": out_of_bounds,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("caption", type=Path, help="Path to one caption JSON file")
    parser.add_argument("--duration", type=float, required=True, help="Actual video duration in seconds")
    args = parser.parse_args()

    document = json.loads(args.caption.read_text(encoding="utf-8"))
    report = coverage_report(document, args.duration)
    report["clip_id"] = document.get("video_name", args.caption.stem)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
