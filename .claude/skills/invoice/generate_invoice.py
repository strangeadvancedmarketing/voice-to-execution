"""Invoice / Receipt generator.

Single source of truth for branded invoices & paid receipts. Bakes in your logo
(assets/logo.png) and a locked navy/green design. Produces a pixel-faithful,
clickable PDF.

Usage:
    python generate_invoice.py spec.json out.pdf
    python generate_invoice.py spec.json out.pdf --html-only   # write .html next to pdf, skip render

The spec.json shape is documented in SKILL.md.

Design is fixed; you only vary the spec. Business identity (name, entity, location,
email, website) is read from the spec so nothing is hardcoded — set them once in your
spec template. Drop your transparent logo at assets/logo.png. NEVER hand-draw a logo.
"""
import base64, json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, "assets", "logo.png")

# 1x1 transparent PNG — fallback so the script still renders if no brand logo is present yet.
_PLACEHOLDER_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
]


def find_chrome() -> str:
    for c in CHROME_CANDIDATES:
        if os.path.isfile(c):
            return c
    raise FileNotFoundError("Chrome not found for PDF render")


def logo_data_uri() -> str:
    # Use the real brand logo if present; otherwise fall back to a transparent placeholder
    # so the generator never crashes on a fresh checkout.
    if os.path.isfile(LOGO):
        with open(LOGO, "rb") as f:
            data = f.read()
    else:
        data = _PLACEHOLDER_PNG
    b64 = base64.b64encode(data).decode()
    return f"data:image/png;base64,{b64}"


CSS = """
  @page { margin: 40px 50px; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; margin: 0; padding: 50px; max-width: 800px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .brand-logo { height: 92px; width: auto; }
  .company-info { text-align: right; }
  .company-info h1 { font-size: 28px; font-weight: 700; margin: 0 0 6px 0; color: #1a1a1a; display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
  .paid-pill { background: #16a34a; color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; }
  .company-info p { margin: 2px 0; color: #555; font-size: 12px; }
  .svc-line { font-size: 12px; color: #2d5aa0; font-weight: 600; margin-top: 4px; }
  .meta-box { background: #f7f8fa; border-radius: 6px; padding: 14px 20px; margin-bottom: 24px; }
  .meta-row { display: flex; gap: 22px; align-items: center; flex-wrap: wrap; }
  .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; }
  .meta-value { font-size: 13px; font-weight: 600; }
  .meta-value.inv-num { color: #2d5aa0; font-size: 14px; }
  .meta-value.status-due { color: #d97706; font-size: 13px; font-weight: 700; }
  .meta-value.status-paid { color: #16a34a; font-size: 13px; font-weight: 700; }
  .bill-to { margin-bottom: 28px; }
  .bill-to .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
  .bill-to .name { font-size: 18px; font-weight: 700; }
  .bill-to .biz { font-size: 14px; color: #555; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.items th { background: #2d5aa0; color: white; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  table.items th.r { text-align: right; }
  table.items td { padding: 12px 14px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
  table.items td.r { text-align: right; }
  .item-title { font-weight: 700; font-size: 14px; }
  .item-sub { font-weight: 600; font-size: 12px; color: #2d5aa0; margin-top: 2px; }
  .item-desc { color: #555; font-size: 12px; margin-top: 6px; line-height: 1.6; }
  .totals { width: 380px; margin-left: auto; margin-bottom: 24px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals td { padding: 5px 0; font-size: 13px; }
  .totals td.r { text-align: right; }
  .totals td.b { font-weight: 700; }
  .totals td.paid { color: #16a34a; font-weight: 700; }
  .amt-box { color: white; padding: 13px 18px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; margin-top: 8px; }
  .amt-box.navy { background: #2d3748; }
  .amt-box.green { background: #16a34a; }
  .amt-box .bl { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
  .amt-box .ba { font-size: 22px; font-weight: 700; }
  .bal-note { text-align: right; font-size: 12px; color: #555; margin-top: 8px; }
  .section-title { font-size: 15px; font-weight: 700; margin: 22px 0 8px 0; }
  .pay-btn { display: inline-block; background: #16a34a; color: #fff !important; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 30px; border-radius: 8px; margin: 6px 0 4px 0; }
  .payment-info p { margin: 3px 0; font-size: 13px; }
  .pay-recv { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px 18px; }
  .pay-recv p { margin: 3px 0; font-size: 13px; }
  .pay-recv .ref { font-size: 11px; color: #777; font-family: 'Consolas', monospace; }
  hr.divider { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
  .terms h3 { font-size: 14px; margin-bottom: 8px; }
  .terms p { font-size: 11px; color: #555; margin: 5px 0; line-height: 1.5; }
  .consent { text-align: center; font-size: 11px; color: #888; font-style: italic; margin: 26px 0 10px 0; }
  .footer { text-align: center; font-size: 11px; color: #888; font-style: italic; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e0e0e0; }
"""

DEFAULT_TERMS = [
    "PAYMENT TERMS: A 50% deposit is required to schedule the build. The remaining 50% is due upon completion of the setup.",
    "SCOPE OF SERVICE: This invoice covers advertising & marketing services — the AI-powered marketing system setup, including your AI marketing agent, lead-response automation, AI-search (GEO/AEO) optimization, website rebuild, local listings/citations + FAQ, and social-media marketing wiring.",
    "ONGOING SERVICE: Beginning Month 2, the monthly advertising & marketing service fee is billed separately. Client is responsible for their own third-party subscriptions (Claude account, citation add-ons, social-posting tools).",
    "CLIENT RESPONSIBILITIES: Client provides necessary account access and is available via video/screen-share during the build session.",
    "LIMITATION OF LIABILITY: The provider supplies AI marketing tools and configuration services. We do not guarantee specific business outcomes or revenue results.",
    "DATA & PRIVACY: Client credentials and business data are stored securely and used solely to configure and maintain the agreed-upon services. We do not share client data with third parties.",
]

# Business identity — override any of these in the spec JSON (business_name, business_entity,
# business_location, business_email, business_website). Defaults are generic placeholders.
DEFAULT_IDENTITY = {
    "business_name": "Your Business Name",
    "business_entity": "Your Entity LLC",
    "business_location": "City, ST",
    "business_email": "you@example.com",
    "business_website": "example.com",
}


def esc(s: str) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def build_html(spec: dict) -> str:
    ident = {k: spec.get(k, v) for k, v in DEFAULT_IDENTITY.items()}
    is_paid = spec.get("status", "").upper() == "PAID"
    status_cls = "status-paid" if is_paid else "status-due"
    paid_pill = ' <span class="paid-pill">Paid</span>' if is_paid else ""
    heading = esc(spec.get("heading", "INVOICE"))

    svc = spec.get("service_tagline")
    svc_html = f'<p class="svc-line">{esc(svc)}</p>' if svc else ""

    # meta row
    meta_cells = [
        ("Invoice No.", f'<span class="meta-value inv-num">{esc(spec["invoice_no"])}</span>'),
        ("Invoice Date", f'<span class="meta-value">{esc(spec["date"])}</span>'),
    ]
    if is_paid and spec.get("paid_on"):
        meta_cells.append(("Paid On", f'<span class="meta-value">{esc(spec["paid_on"])}</span>'))
    elif spec.get("due"):
        meta_cells.append(("Due", f'<span class="meta-value">{esc(spec["due"])}</span>'))
    meta_cells.append(("Status", f'<span class="meta-value {status_cls}">{esc(spec["status"])}</span>'))
    meta_html = "".join(
        f'<div><div class="meta-label">{lbl}</div><div>{val}</div></div>' for lbl, val in meta_cells
    )

    # items
    rows = ""
    for it in spec["items"]:
        sub = f'<div class="item-sub">{esc(it["sub"])}</div>' if it.get("sub") else ""
        desc = "<br>\n".join("- " + esc(l) for l in it.get("desc_lines", []))
        desc_html = f'<div class="item-desc">{desc}</div>' if desc else ""
        rows += (
            f'<tr><td><div class="item-title">{esc(it["title"])}</div>{sub}{desc_html}</td>'
            f'<td>{esc(it.get("qty", 1))}</td><td class="r">{esc(it["rate"])}</td>'
            f'<td class="r">{esc(it["amount"])}</td></tr>\n'
        )

    # totals
    dep_cls = "paid" if is_paid else "b"
    dep_amt = ("&minus;" + esc(spec["deposit_amount"])) if is_paid else esc(spec["deposit_amount"])
    totals_rows = f'<tr><td>Subtotal</td><td class="r">{esc(spec["subtotal"])}</td></tr>'
    totals_rows += f'<tr><td class="{dep_cls}">{esc(spec["deposit_label"])}</td><td class="r {dep_cls}">{dep_amt}</td></tr>'
    if spec.get("balance_label"):
        totals_rows += f'<tr><td>{esc(spec["balance_label"])}</td><td class="r">{esc(spec["balance_amount"])}</td></tr>'
    box_color = "green" if is_paid else spec.get("amount_box_color", "navy")
    bal_note = f'<div class="bal-note">{esc(spec["balance_note"])}</div>' if spec.get("balance_note") else ""

    # payment block
    if is_paid:
        pr = spec["payment_received"]
        pay_block = (
            '<div class="section-title">Payment Received</div>\n'
            '<div class="pay-recv">\n'
            f'<p>&#10004; Thank you &mdash; your {esc(spec["amount_box_value"])} payment has been received.</p>\n'
            f'<p><strong>Date:</strong> {esc(pr["date"])} &nbsp;&middot;&nbsp; <strong>Method:</strong> {esc(pr["method"])}</p>\n'
            + (f'<p class="ref">Payment Reference: {esc(pr["ref"])}</p>\n' if pr.get("ref") else "")
            + "</div>"
        )
    elif spec.get("pay_link"):
        link = esc(spec["pay_link"])
        btn_label = esc(spec.get("pay_btn_label", "Pay Now"))
        pay_block = (
            f'<div class="section-title">{esc(spec.get("pay_section_title", "Pay Your Deposit"))}</div>\n'
            '<div class="payment-info">\n'
            f'<a class="pay-btn" href="{link}">{btn_label} &rarr;</a>\n'
            f'<p>Or paste this link in your browser: {link}</p>\n'
            '<p>Secure card payment via Stripe.</p>\n</div>'
        )
    else:
        pay_block = ""

    # terms
    terms = spec.get("terms", DEFAULT_TERMS)
    terms_html = "".join(f"<p>{i+1}. {esc(t)}</p>\n" for i, t in enumerate(terms))
    consent = "" if is_paid else '<p class="consent"><em>By submitting payment, you agree to the terms and conditions outlined above.</em></p>'

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="header">
  <img class="brand-logo" src="{logo_data_uri()}" alt="{esc(ident['business_name'])}">
  <div class="company-info">
    <h1>{heading}{paid_pill}</h1>
    <p>{esc(ident['business_name'])}</p>
    <p>{esc(ident['business_entity'])}</p>
    <p>{esc(ident['business_location'])}</p>
    <p>{esc(ident['business_email'])}</p>
    {svc_html}
  </div>
</div>
<div class="meta-box"><div class="meta-row">{meta_html}</div></div>
<div class="bill-to">
  <div class="label">Bill To</div>
  <div class="name">{esc(spec["bill_to_name"])}</div>
  <div class="biz">{esc(spec.get("bill_to_biz", ""))}</div>
</div>
<table class="items">
  <tr><th>Description</th><th>Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
  {rows}
</table>
<div class="totals">
  <table>{totals_rows}</table>
  <div class="amt-box {box_color}"><span class="bl">{esc(spec["amount_box_label"])}</span><span class="ba">{esc(spec["amount_box_value"])}</span></div>
  {bal_note}
</div>
{pay_block}
<hr class="divider">
<div class="terms"><h3>Terms &amp; Conditions</h3>{terms_html}</div>
{consent}
<div class="footer">{esc(ident['business_name'])} | {esc(ident['business_entity'])}<br>{esc(ident['business_location'])} | {esc(ident['business_website'])}</div>
</body></html>"""


def render_pdf(html_path: str, pdf_path: str):
    chrome = find_chrome()
    # Chrome resolves --print-to-pdf and the file:/// input against ITS OWN working dir,
    # not Python's. A RELATIVE path silently fails -> no PDF written, or a stale old PDF
    # left in place. Always hand Chrome ABSOLUTE paths.
    html_path = os.path.abspath(html_path)
    pdf_path = os.path.abspath(pdf_path)
    # Isolated, throwaway profile so headless Chrome never attaches to an already-running
    # Chrome instance (belt-and-suspenders alongside the absolute-path fix).
    profile = tempfile.mkdtemp(prefix="invoice_chrome_")
    try:
        subprocess.run([
            chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
            f"--user-data-dir={profile}", "--no-first-run", "--no-default-browser-check",
            f"--print-to-pdf={pdf_path}", "file:///" + html_path.replace("\\", "/"),
        ], check=True, creationflags=0x08000000 if sys.platform == "win32" else 0)
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    # Fail loudly instead of leaving/returning a stale PDF.
    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
        raise RuntimeError(
            f"Chrome did not produce a PDF at {pdf_path}. The isolated --user-data-dir "
            "should prevent the 'Chrome already running' no-op; retry, or close Chrome and rerun."
        )


def verify_link(pdf_path: str) -> list:
    try:
        import fitz
    except ImportError:
        return []
    d = fitz.open(pdf_path)
    return [l.get("uri") for p in d for l in p.get_links() if l.get("uri")]


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    spec_path, out_pdf = sys.argv[1], sys.argv[2]
    html_only = "--html-only" in sys.argv
    spec = json.load(open(spec_path, encoding="utf-8"))
    html = build_html(spec)
    html_path = os.path.splitext(out_pdf)[0] + ".html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("HTML:", html_path)
    if html_only:
        return
    render_pdf(html_path, out_pdf)
    print("PDF:", out_pdf, f"({os.path.getsize(out_pdf)} bytes)")
    links = verify_link(out_pdf)
    if spec.get("pay_link"):
        print("Clickable links in PDF:", links or "NONE — check render!")


if __name__ == "__main__":
    main()
