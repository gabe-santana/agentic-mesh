"""Lightweight recursive text splitter (no external dependency).

Tries to split on progressively finer separators (paragraphs, lines,
sentences, words) so chunks break on natural boundaries where possible,
falling back to a hard character cut only when a segment has no smaller
separator to split on.
"""

SEPARATORS = ["\n\n", "\n", ". ", " "]


def _split_on(text: str, separator: str) -> list[str]:
    if separator == "":
        return list(text)
    return text.split(separator)


def _recursive_split(text: str, separators: list[str], chunk_size: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text] if text else []

    if not separators:
        return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

    separator, *rest = separators
    parts = _split_on(text, separator)

    chunks: list[str] = []
    current = ""
    for part in parts:
        candidate = current + (separator if current else "") + part
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(part) > chunk_size:
                chunks.extend(_recursive_split(part, rest, chunk_size))
                current = ""
            else:
                current = part
    if current:
        chunks.append(current)
    return chunks


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """Split `text` into overlapping chunks of at most `chunk_size` characters."""
    text = text.strip()
    if not text:
        return []

    raw_chunks = _recursive_split(text, SEPARATORS, chunk_size)

    if overlap <= 0 or len(raw_chunks) <= 1:
        return [c.strip() for c in raw_chunks if c.strip()]

    overlapped: list[str] = []
    for i, chunk in enumerate(raw_chunks):
        if i == 0:
            overlapped.append(chunk)
            continue
        prev_tail = raw_chunks[i - 1][-overlap:]
        overlapped.append(prev_tail + chunk)

    return [c.strip() for c in overlapped if c.strip()]
