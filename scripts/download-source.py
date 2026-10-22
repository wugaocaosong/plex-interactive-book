"""Download the pinned upstream snapshot; keep the original bytes and paths."""
import io, json, tarfile, pathlib, requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
SHA = "350f483801b2badb95180047aa82cadb825852a2"
DEST = ROOT / "content/upstream/hello-algo"
DEST.mkdir(parents=True, exist_ok=True)
response = requests.get(f"https://codeload.github.com/krahets/hello-algo/tar.gz/{SHA}", timeout=240)
response.raise_for_status()
count = 0
with tarfile.open(fileobj=io.BytesIO(response.content), mode="r:gz") as archive:
    for entry in archive:
        parts = pathlib.PurePosixPath(entry.name).parts[1:]
        if not entry.isfile() or not parts or parts[0] not in {"docs", "codes", "mkdocs.yml", "LICENSE", "README.md"}:
            continue
        if ".." in parts:
            raise ValueError("Unsafe archive path")
        target = DEST.joinpath(*parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.extractfile(entry).read())
        count += 1
(DEST.parent / "source.json").write_text(json.dumps({"repository": "krahets/hello-algo", "commit": SHA, "files": count}, indent=2) + "\n", encoding="utf8")
print(f"Saved {count} original files at {SHA}")
