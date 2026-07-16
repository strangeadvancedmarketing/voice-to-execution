#!/usr/bin/env python3
# transcribe.py — local, free voice-note transcription (faster-whisper, small model, CPU).
"""
Transcribe an inbound voice note locally and print the transcript to stdout.

Usage:
    python tools/transcribe.py <audio-file> [--words]

Free, private, and fast — audio never leaves the machine (never ship a human's
audio to a paid API for this). Whisper has NO custom-vocabulary file; you steer
recognition toward the human's proper nouns (business names, clients, products)
with `initial_prompt` and `hotwords`. Both nudge the decoder; neither is a
dictionary you load. Edit VOCAB_TERMS below with your own terms.

See docs/connectors/local-ai.md for the full rationale.

Requires: pip install faster-whisper
"""

import sys

# Bias the decoder toward your proper nouns so they aren't mangled.
# Replace these examples with the human's actual business/client/product terms.
VOCAB_TERMS = [
    "{{PRIMARY_BUSINESS}}",
    "{{OPERATOR_NAME}}",
    # add more terms here, e.g. "Acme Roofing", "Riverside Dental", "Webflow"
]


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--words"]
    want_words = "--words" in sys.argv[1:]
    if not args:
        print("usage: python transcribe.py <audio-file> [--words]", file=sys.stderr)
        return 2

    audio_path = args[0]

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper is not installed. Run: pip install faster-whisper",
              file=sys.stderr)
        return 1

    # small model on CPU with int8 — free, no GPU required.
    model = WhisperModel("small", device="cpu", compute_type="int8")

    # Terms actually filled in (drop unresolved {{...}} placeholders).
    terms = [t for t in VOCAB_TERMS if t and not t.startswith("{{")]
    initial_prompt = ("Terms: " + ", ".join(terms) + ".") if terms else None
    hotwords = " ".join(terms) if terms else None

    segments, _info = model.transcribe(
        audio_path,
        initial_prompt=initial_prompt,   # prepended as context to bias recognition
        hotwords=hotwords,               # additional biasing toward the same terms
        word_timestamps=want_words,
    )

    if want_words:
        for seg in segments:
            for w in (seg.words or []):
                print(f"{w.start:.2f}\t{w.end:.2f}\t{w.word}")
    else:
        print(" ".join(seg.text.strip() for seg in segments).strip())

    return 0


if __name__ == "__main__":
    sys.exit(main())
