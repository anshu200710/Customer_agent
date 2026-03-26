# 📁 Paths
import os
import json
import subprocess
import sys

# 🚀 FIX: Prevent OpenMP conflict error on Windows
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("❌ faster-whisper not installed. Installing now...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faster-whisper"])
    from faster_whisper import WhisperModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
OUTPUT_FILE = os.path.join(BASE_DIR, "dataset.json")

# ⚡ Load model (tiny = fastest, small = better, base = balanced)
# Using device="cpu" as most users don't have CUDA set up correctly for faster-whisper on Windows
print("⏳ Initializing Whisper Model (small)...", flush=True)
model = WhisperModel("small", device="cpu", compute_type="int8")  # 👈 faster on CPU
print("✅ Whisper Model loaded successfully!", flush=True)

def transcribe_file(file_path):
    segments, _ = model.transcribe(
        file_path,
        beam_size=3,          # speed vs accuracy balance
        language=None,        # auto-detect Hindi/English
        vad_filter=True       # ignore silence
    )

    text = []
    for seg in segments:
        clean = seg.text.strip()

        # ❌ remove garbage tokens
        if clean and clean not in ["TK", "●"]:
            text.append(clean)

    return " ".join(text)


def load_existing():
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except Exception as e:
            print(f"⚠️ Error loading {OUTPUT_FILE}: {e}")
            return []
    return []


def save_data(data):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def run():
    if not os.path.exists(RECORDINGS_DIR):
        print(f"❌ Folder not found: {RECORDINGS_DIR}")
        return

    files = [f for f in os.listdir(RECORDINGS_DIR) if f.endswith(".wav")]

    if not files:
        print("❌ No audio files found")
        return

    print(f"📂 Found {len(files)} files", flush=True)

    results = load_existing()
    processed_files = {item["file"] for item in results}

    for file in files:
        if file in processed_files:
            print(f"⏭️ Skipping (already done): {file}", flush=True)
            continue

        file_path = os.path.join(RECORDINGS_DIR, file)
        print(f"\n🎤 Processing: {file}", flush=True)

        try:
            text = transcribe_file(file_path)

            print(f"📝 {text[:100]}...", flush=True)  # preview

            results.append({
                "file": file,
                "transcript": text
            })

            # 💾 save after each file (safe)
            save_data(results)

            print(f"✅ Done: {file}")

        except Exception as e:
            print(f"❌ Failed: {file}")
            print("Error:", str(e))

    print("\n🔥 ALL DONE")
    print("📄 Saved at:", OUTPUT_FILE)


if __name__ == "__main__":
    run()

    # pip install faster-whisper