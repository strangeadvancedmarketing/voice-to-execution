---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Security

> NOTE: imported starter-pack rule; extends a rules/common/ dir not present — scoped to *.py.


## Secret Management

```python
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ["OPENAI_API_KEY"]  # Raises KeyError if missing
```

## Security Scanning

- Use **bandit** for static security analysis:
  ```bash
  bandit -r src/
  ```

## Reference

See skill: `django-security` for Django-specific security guidelines (if applicable).
