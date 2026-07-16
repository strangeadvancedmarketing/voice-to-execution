---
name: invoice
description: Generate brand-branded invoices and paid receipts as pixel-faithful PDFs with your real logo and a clickable Stripe pay link. Use whenever the operator says "make an invoice / receipt / bill" for a client.
---

# Invoice / Receipt Generator

One locked design, one real logo, one command. **Never hand-draw a logo or rebuild the HTML from scratch again** — drive everything from a JSON spec.

> NOTE: This ships the generator logic only. The real brand logo binary is NOT included — the original skill embeds `assets/{{LOGO_FILE}}` (a transparent PNG monogram) and `assets/{{LOGO_FILE_ORIGINAL}}`. Drop your own logo PNG at `assets/logo.png` before use. The Stripe pay link is sourced from your own account per-invoice via the spec's `pay_link` field.

## Why this exists
Your real logo should be baked into the generator (`assets/logo.png`, transparent) so every invoice carries the correct brand automatically. Earlier invoices used a CSS-drawn placeholder — that was WRONG and embarrassing. This skill guarantees the real brand every time.

## How to use

1. Write a spec JSON (see shape below). Put it next to where the PDF should live (e.g. `clients/<client>/<name>_spec.json`).
2. Run:
   ```bash
   python {{HOME}}\.claude\skills\invoice\generate_invoice.py <spec.json> <out.pdf>
   ```
3. The script writes `<out>.html` + `<out>.pdf`, and prints the clickable links found in the PDF (verify the Stripe link survived when `pay_link` is set).
4. **Render page 1 to PNG and eyeball it** before sending (logo present, numbers right, status color right):
   ```bash
   python -c "import fitz; fitz.open(r'out.pdf')[0].get_pixmap(dpi=110).save(r'tmp\check.png')"
   ```
5. Client invoices/receipts are approval-gated — show the operator via {{PRIMARY_CHANNEL}}, then email from the business Gmail:
   ```bash
   {{GOOGLE_CLI}} gmail send --account {{ENV:BUSINESS_EMAIL}} --to "<client>" \
     --subject "..." --body "..." --attach "<out.pdf>" --json
   ```

## Spec shape

Required: `status`, `invoice_no`, `date`, `bill_to_name`, `items[]`, `subtotal`, `deposit_label`, `deposit_amount`, `amount_box_label`, `amount_box_value`.

`status` drives everything:
- **"DEPOSIT DUE" / "DUE"** → unpaid invoice. Orange status. Navy AMOUNT box. Add `pay_link` (Stripe) → renders a green Pay button + paste-link. Optional `due`, `pay_section_title`, `pay_btn_label`.
- **"PAID"** → receipt. Green PAID pill + status. Green AMOUNT PAID box. Deposit row shows as a green −$ credit. Add `paid_on` and `payment_received: {date, method, ref}`.

Other fields:
- `heading` (default "INVOICE"), `service_tagline` (e.g. "Advertising & Marketing Services" — for the client's bookkeeping), `bill_to_biz`.
- `items[]`: `{title, sub?, qty?, rate, amount, desc_lines: [..]}` — `desc_lines` render as "- " bullets.
- `balance_label` + `balance_amount` (e.g. "Balance Due on Completion (50%)").
- `balance_note` (small line under the amount box).
- `amount_box_color`: "navy" (default for due) or "green" (auto for paid).
- `terms`: array of strings (numbered automatically). Omit to use the default advertising-&-marketing terms.

## Rules
- Currency strings are pre-formatted ("$1,000.00") — the script does no math, it places exactly what you give it.
- For Stripe links, make the payment link first (from your Stripe account), then put the `buy.stripe.com/...` URL in `pay_link`.
- Keep amounts consistent with the deal in the client's record before generating.
- After sending, if it's a deposit, confirm a payment watcher exists.

## Brand source of truth
Real logo + colors live in your brand-assets reference. Drop the transparent logo PNG at this skill's `assets/logo.png` before first use.
