# Invoicing — branded invoices and receipts with a pay link

Turn a JSON spec into a pixel-faithful, clickable PDF invoice or receipt carrying your own logo, then attach a Stripe Payment Link and let a watcher ping you the moment it's paid. One locked design, one command, no hand-drawn HTML.

The generator ships in this repository at [`.claude/skills/invoice/generate_invoice.py`](../../.claude/skills/invoice/generate_invoice.py) with its [`SKILL.md`](../../.claude/skills/invoice/SKILL.md). The Stripe pieces (pay-link creator, payment watcher) are small and business-specific, so they are given here as complete rebuild patterns you drop next to the generator.

## What it produces

- A branded **invoice** (status `DUE` / `DEPOSIT DUE`) — orange status, navy amount box, and a green **Pay** button plus paste-able link when a Stripe URL is supplied.
- A branded **receipt** (status `PAID`) — green PAID pill, green amount-paid box, the deposit shown as a credit, and a "Payment Received" block.
- Both as `<out>.html` + `<out>.pdf`, with clickable link annotations preserved in the PDF.

Business identity (name, entity, location, email, website) is read from the spec — nothing is hardcoded. The design is fixed; you only vary the spec.

## Prerequisites

| Requirement | For |
|-------------|-----|
| **Python 3.10+** | Running the generator and the Stripe scripts. |
| **Google Chrome** | Headless PDF render (the generator finds it automatically on Windows paths; adjust `CHROME_CANDIDATES` for macOS/Linux). |
| **`pip install pymupdf`** | Optional — enables the link-verification check and PNG eyeball. |
| **`pip install stripe`** | Optional — only if you add a Stripe pay link and watcher. |
| **A Stripe account** | Optional — only for pay links. Keys come from your own `.env`, never the repo. |

## Step 1 — Drop in your logo

The generator embeds `assets/logo.png` (a transparent PNG) as a data URI so every document carries the correct brand automatically. Until you add one, it falls back to a 1×1 transparent pixel so a fresh checkout never crashes.

```bash
# Put a transparent-background PNG here (a monogram or full lockup, ~92px tall renders well):
cp /path/to/your-logo.png .claude/skills/invoice/assets/logo.png
```

Never hand-draw a logo in CSS or rebuild the HTML — that is exactly what this generator exists to prevent.

## Step 2 — Write a spec JSON

Save the spec next to where the PDF should live (e.g. `clients/{{CLIENT_A}}/invoice_1001_spec.json`). Currency strings are **pre-formatted** — the script does no math, it places exactly what you give it.

Minimal unpaid invoice with a deposit and a pay link:

```json
{
  "business_name": "{{PRIMARY_BUSINESS}}",
  "business_entity": "{{PRIMARY_BUSINESS}} LLC",
  "business_location": "{{OPERATOR_LOCATION}}",
  "business_email": "{{ENV:BUSINESS_EMAIL}}",
  "business_website": "example.com",

  "status": "DEPOSIT DUE",
  "heading": "INVOICE",
  "service_tagline": "Advertising & Marketing Services",
  "invoice_no": "1001",
  "date": "2026-07-15",
  "due": "Upon receipt",

  "bill_to_name": "{{CLIENT_A}}",
  "bill_to_biz": "{{CLIENT_A}} Business Name",

  "items": [
    {
      "title": "AI marketing system — setup",
      "sub": "One-time build",
      "qty": 1,
      "rate": "$1,000.00",
      "amount": "$1,000.00",
      "desc_lines": [
        "AI marketing agent + lead-response automation",
        "AI-search (GEO/AEO) optimization",
        "Website rebuild, local listings + FAQ"
      ]
    }
  ],

  "subtotal": "$1,000.00",
  "deposit_label": "Deposit Due Now (50%)",
  "deposit_amount": "$500.00",
  "balance_label": "Balance Due on Completion (50%)",
  "balance_amount": "$500.00",

  "amount_box_label": "DEPOSIT DUE",
  "amount_box_value": "$500.00",
  "amount_box_color": "navy",

  "pay_link": "https://buy.stripe.com/REPLACE_WITH_YOUR_LINK",
  "pay_section_title": "Pay Your Deposit",
  "pay_btn_label": "Pay Deposit"
}
```

For a **receipt**, set `"status": "PAID"`, add `"paid_on"` and a `"payment_received": {"date": "...", "method": "...", "ref": "..."}` block; the amount box turns green automatically and the deposit row renders as a credit.

Field reference:

- **Required:** `status`, `invoice_no`, `date`, `bill_to_name`, `items[]`, `subtotal`, `deposit_label`, `deposit_amount`, `amount_box_label`, `amount_box_value`.
- **`status`** drives everything. `DUE` / `DEPOSIT DUE` → unpaid, orange status, navy box, `pay_link` renders the Pay button. `PAID` → receipt, green throughout.
- **`items[]`:** `{title, sub?, qty?, rate, amount, desc_lines: [...]}` — `desc_lines` render as `- ` bullets.
- **`terms`:** array of strings (numbered automatically). Omit to use the built-in advertising-and-marketing defaults, or supply your own.
- **Optional:** `balance_label` + `balance_amount`, `balance_note`, `amount_box_color` (`navy` default / `green`), `heading`, `service_tagline`, `bill_to_biz`.

## Step 3 — Generate the PDF

```bash
python .claude/skills/invoice/generate_invoice.py <spec.json> <out.pdf>
# HTML-only (skip the Chrome render, useful for quick styling checks):
python .claude/skills/invoice/generate_invoice.py <spec.json> <out.pdf> --html-only
```

The script writes `<out>.html` and `<out>.pdf`, prints the byte size, and — when `pay_link` is set — prints the clickable links it found in the PDF so you can confirm the Stripe URL survived the render. If it prints `NONE`, the link did not embed; re-render.

**Render gotcha (already handled in the script, worth knowing):** Chrome resolves `--print-to-pdf` against its own working directory, so the generator hands it absolute paths and spins up an isolated throwaway profile — otherwise an already-running Chrome can silently no-op and leave a stale PDF. If you ever see "did not produce a PDF," close Chrome and rerun, or just retry.

## Step 4 — Eyeball page 1 before sending

```bash
python -c "import fitz; fitz.open(r'out.pdf')[0].get_pixmap(dpi=110).save(r'check.png')"
```

Open `check.png` and confirm: logo present, numbers right, status color right (orange = due, green = paid).

## Step 5 — Add a Stripe Payment Link

Keys live in your own gitignored `.env`, never in the repo or any chat:

```
# .env  (path outside the repo, e.g. ~/.stripe_keys/.env)
STRIPE_RESTRICTED_KEY=rk_live_...      # a restricted key for automations
STRIPE_PUBLISHABLE_KEY=pk_live_...     # public by design, safe in front-end
```

> SECURITY: A live **secret** key (`sk_live_...`) or **restricted** key (`rk_live_...`) must never be pasted into a messaging channel or any chat — terminal and `.env` only. Only the publishable key (`pk_live_...`) is safe to share. Grant the restricted key **write** on *Payment Links*, *Products*, and *Prices* to create links; **read** on *Checkout Sessions* is all the watcher needs.

Create a link with this small script (`make_payment_link.py`, dropped next to the generator):

```python
#!/usr/bin/env python3
"""Create a Stripe Payment Link. Usage: python make_payment_link.py <amount_cents> "<label>" """
import os, sys, stripe

stripe.api_key = os.environ["STRIPE_RESTRICTED_KEY"]  # sourced from your .env; never hardcode
amount_cents = int(sys.argv[1])
label = sys.argv[2]

product = stripe.Product.create(name=label)
price = stripe.Price.create(product=product.id, unit_amount=amount_cents, currency="usd")
link = stripe.PaymentLink.create(
    line_items=[{"price": price.id, "quantity": 1}],
)
print(link.id)   # plink_...  (keep this — the watcher polls it)
print(link.url)  # https://buy.stripe.com/...  (paste into the spec's pay_link)
```

```bash
# Load your .env, then create a $500.00 deposit link:
set -a && . ~/.stripe_keys/.env && set +a
python make_payment_link.py 50000 "{{CLIENT_A}} — Deposit (Invoice 1001)"
```

Put the printed `buy.stripe.com/...` URL into the spec's `pay_link` and re-run Step 3. Keep the `plink_...` id for the watcher.

**Card-surcharge note:** Stripe Payment Links can't selectively surcharge card-only. Handle it by making the link the card option (fee baked into the amount) while the invoice `terms` list fee-free methods (Zelle/Venmo/check/cash) separately.

## Step 6 — Watch for payment and ping when paid

The watcher polls the Payment Link's checkout sessions, pings your messaging channel once when a paid session appears, and is idempotent — it records the paid state and never pings twice. (Stripe also emails your account on a successful payment by default, so this is belt-and-suspenders.)

```python
#!/usr/bin/env python3
"""Poll a Stripe Payment Link; ping once when paid. Idempotent via a state file.
Usage: python invoice_payment_watcher.py <plink_id> [state.json]"""
import json, os, pathlib, sys, stripe

stripe.api_key = os.environ["STRIPE_RESTRICTED_KEY"]  # read on Checkout Sessions is enough
plink = sys.argv[1]
state = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "watcher_state.json")
seen = json.loads(state.read_text()) if state.exists() else {}

if seen.get(plink) == "paid":
    sys.exit(0)  # already notified — nothing to do

sessions = stripe.checkout.Session.list(payment_link=plink, limit=100)
paid = next((s for s in sessions.auto_paging_iter() if s.payment_status == "paid"), None)

if paid:
    amount = paid.amount_total / 100
    notify(f"Invoice paid: {plink} — {amount:,.2f} {paid.currency.upper()}")  # wire to your channel
    seen[plink] = "paid"
    state.write_text(json.dumps(seen))
```

`notify(...)` is the one line you wire to your own messaging channel — in this framework that is the Telegram voice loop; a Telegram send is a single `POST https://api.telegram.org/bot<token>/sendMessage` with `chat_id` and `text`. See [`docs/connectors/telegram-voice-loop.md`](../../docs/connectors/telegram-voice-loop.md).

Run it on a schedule (every ~4h is plenty) using your OS scheduler or cron, silently. For a new invoice, copy the watcher invocation and swap the `plink_...` id and state file. Manual status check for any link:

```bash
# payment_status is "paid" | "unpaid" | "no_payment_required"
python -c "import os,stripe; stripe.api_key=os.environ['STRIPE_RESTRICTED_KEY']; \
print([(s.id,s.payment_status) for s in stripe.checkout.Session.list(payment_link='plink_XXX').auto_paging_iter()])"
```

Scheduling patterns (OS scheduler / cron, running scripts silently) are documented in [`docs/connectors/scheduled-tasks-and-hooks.md`](../../docs/connectors/scheduled-tasks-and-hooks.md).

## Step 7 — Deliver it

Client invoices and receipts are approval-gated: show the operator the rendered PDF through the messaging channel, get a yes, then send from the business email. With the `gog` CLI (see [`docs/connectors/google-suite.md`](../../docs/connectors/google-suite.md)):

```bash
gog gmail send --account {{ENV:BUSINESS_EMAIL}} --to "<client-email>" \
  --subject "Invoice 1001 — {{PRIMARY_BUSINESS}}" \
  --body "Attached is your invoice. The green button in the PDF is a secure card payment link." \
  --attach "<out.pdf>"
```

## Rules and gotchas

- **The script does no math.** Every currency string in the spec is placed verbatim. Reconcile amounts against the deal in the client's record before generating.
- **Verify the link embedded.** After render, confirm the printed clickable-links list contains your `buy.stripe.com` URL. A link that didn't survive the render is a silently broken invoice.
- **Confirm a watcher exists** after sending any deposit invoice, so a payment can't land unnoticed.
- **Keys are yours, not the repo's.** The repo ships the generator and these patterns; you supply the logo and the Stripe keys from your own account. Nothing here contains a credential.
- **Approval before every client send.** Draft, show, then send — never auto-email a client an invoice.
