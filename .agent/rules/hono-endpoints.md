---
trigger: manual
---

All Hono web server endpoints must make appropriate use of zod validators.  In particular:

- Every endpoint that has a JSON body must use a `zValidator("json", schema)`, where `schema` is the zod schema for the JSON body
- Every endpoint that has URL parameters must use a `zValidator("param", schema), where `schema` is the zod schema for the parameter strucutre.
