---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Hooks

> NOTE: imported starter-pack rule; extends a rules/common/ dir not present — scoped to *.py.


## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **black/ruff**: Auto-format `.py` files after edit
- **mypy/pyright**: Run type checking after editing `.py` files

## Warnings

- Warn about `print()` statements in edited files (use `logging` module instead)
