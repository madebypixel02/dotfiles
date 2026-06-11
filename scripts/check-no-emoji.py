"""Reject source files that contain Unicode emoji characters.

Checks files passed as command-line arguments for characters in the
standard emoji Unicode ranges. Exits with a non-zero status and prints
offending lines if any emoji are found.

Emoji ranges checked:
  U+1F300-U+1FAFF  Miscellaneous Symbols and Pictographs through
                   Supplemental Symbols and Pictographs
  U+2600-U+26FF    Miscellaneous Symbols (weather, chess, recycling, etc.)
  U+2700-U+27BF    Dingbats

Characters explicitly excluded (legitimate punctuation):
  U+2014  em dash  (---)
  U+2022  bullet   (*)
  U+2026  ellipsis (...)
  U+2500-U+257F  Box Drawing characters used in ASCII diagrams
"""

import re
import sys

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000026FF"
    "\U00002700-\U000027BF"
    "]"
)

EXCLUDED_CODEPOINTS = frozenset(
    [
        0x2014,
        0x2022,
        0x2026,
        *range(0x2500, 0x2580),
    ]
)


def contains_emoji(text: str) -> list[tuple[int, str]]:
    """Return a list of (line_number, line) pairs that contain emoji characters."""
    results = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        for char in line:
            cp = ord(char)
            if EMOJI_PATTERN.match(char) and cp not in EXCLUDED_CODEPOINTS:
                results.append((lineno, line))
                break
    return results


def main() -> int:
    """Check each file argument for emoji characters.

    Returns 1 if any emoji are found, 0 otherwise.
    """
    exit_code = 0
    for path in sys.argv[1:]:
        try:
            content = open(path, encoding="utf-8", errors="replace").read()
        except OSError as exc:
            print(f"{path}: cannot read: {exc}", file=sys.stderr)
            exit_code = 1
            continue

        hits = contains_emoji(content)
        for lineno, line in hits:
            print(f"{path}:{lineno}: {line.rstrip()}")
            exit_code = 1

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
