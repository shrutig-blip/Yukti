"""
check_false_positives.py

Run this from your backend/ folder (or wherever document_integrity.py
lives) against your REAL sample certificates before the demo, to make
sure genuine documents don't get flagged.

Usage:
    python check_false_positives.py
"""

from document_integrity import get_document_integrity

# Your actual sample certificates (from Get-ChildItem output)
SAMPLE_PATHS = [
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00001_gst_certificate.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00001_pan_certificate.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00002_epfo_certificate.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00002_pan_certificate_mismatch.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00002_udyam_certificate.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00003_epfo_certificate_mismatch.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00003_gst_certificate.pdf",
]

if __name__ == "__main__":
    any_failed = False
    for path in SAMPLE_PATHS:
        try:
            result = get_document_integrity(path)
        except Exception as e:
            print(f"[ERROR] {path}: could not process — {e}")
            any_failed = True
            continue

        status = "OK" if result["score"] == 100 else "FALSE POSITIVE?"
        print(f"[{status}] {path} -> score={result['score']} flags={result['flags']}")
        if result["score"] != 100:
            any_failed = True

    print()
    if any_failed:
        print("⚠️  At least one genuine sample was flagged or errored — "
              "tune thresholds in document_integrity.py before the demo, "
              "or confirm the flag is a real anomaly in that sample file.")
    else:
        print("✅ All genuine samples scored 100 — safe to demo as-is.")