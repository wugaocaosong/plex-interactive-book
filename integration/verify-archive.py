"""Verify a release manifest and extract into a new, empty directory (stdlib only)."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    archive = args.archive.resolve()
    destination = args.destination.resolve()
    if destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
        raise SystemExit("Destination must be a new or empty directory.")
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    expected = archive.with_suffix(".zip.sha256").read_text(encoding="utf-8").split()[0]
    if digest != expected:
        raise SystemExit("Archive SHA-256 mismatch.")
    prefix = "plex-interactive-book/"
    with zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        if len(names) != len(set(names)):
            raise SystemExit("Duplicate archive entries.")
        for name in names:
            parts = PurePosixPath(name).parts
            if (not name.startswith(prefix) or ".." in parts or "\\" in name
                    or ":" in name or not (destination / name).resolve().is_relative_to(destination)):
                raise SystemExit("Unsafe archive entry.")
        manifest = json.loads(bundle.read(prefix + "PACKAGE-MANIFEST.json"))
        if set(names) != {prefix + name for name in manifest["files"]} | {prefix + "PACKAGE-MANIFEST.json"}:
            raise SystemExit("Manifest inventory does not match archive.")
        for name, info in manifest["files"].items():
            data = bundle.read(prefix + name)
            if len(data) != info["bytes"] or hashlib.sha256(data).hexdigest() != info["sha256"]:
                raise SystemExit("Manifest mismatch: " + name)
        bundle.extractall(destination)
    root = destination / "plex-interactive-book"
    for name, info in manifest["files"].items():
        if hashlib.sha256((root / name).read_bytes()).hexdigest() != info["sha256"]:
            raise SystemExit("Extracted file mismatch: " + name)
    print(json.dumps({"status": "passed", "archive": archive.name, "sha256": digest,
                      "applicationCommit": manifest["applicationCommit"],
                      "verifiedFiles": len(manifest["files"]), "extractedRoot": str(root)}, indent=2))


if __name__ == "__main__":
    main()
