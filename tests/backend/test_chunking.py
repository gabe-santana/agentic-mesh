from app.utils.chunking import chunk_text


def test_empty_text_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_short_text_returns_single_chunk():
    text = "Hello world, this is a short document."
    chunks = chunk_text(text, chunk_size=800, overlap=100)
    assert chunks == [text]


def test_long_text_is_split_and_respects_chunk_size():
    paragraph = "AgenticMesh orchestrates autonomous AI agents. " * 40
    chunks = chunk_text(paragraph, chunk_size=200, overlap=20)
    assert len(chunks) > 1
    assert all(len(c) <= 260 for c in chunks)  # allow room for the overlap prefix


def test_overlap_makes_consecutive_chunks_share_content():
    paragraph = ("Sentence one. " * 5) + ("Sentence two. " * 5) + ("Sentence three. " * 5)
    chunks = chunk_text(paragraph, chunk_size=100, overlap=30)
    assert len(chunks) > 1

    no_overlap_chunks = chunk_text(paragraph, chunk_size=100, overlap=0)
    assert len(chunks) >= len(no_overlap_chunks)
