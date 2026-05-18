# Security

LensUI is a client-side rendering framework. It should not be used as the security boundary for provider keys, billing enforcement, account permissions, or host tool authorization.

## Supported Model

- Keep provider keys and production inference in a host, server, or gateway.
- Use LensUI core and HTML packages only for lightcode parsing, command stream application, component registration, rendering, and live source updates.
- Treat saved `html`, `react`, and remote/imported components as higher risk than built-ins.
- Never serialize provider tokens, session cookies, payment details, or user secrets into lightcode, command streams, component definitions, screenshots, or logs.

## Reporting Issues

For now, report security issues privately to the project maintainers before public disclosure. Include:

- affected package or component
- reproduction steps
- expected and actual behavior
- whether secrets, cross-session routing, or remote code execution are involved

## Out Of Scope For LensUI Core

LensUI does not implement:

- auth
- billing
- model routing
- usage metering
- memory
- voice
- host filesystem access
- shell access
- browser or OS permissions

Those responsibilities belong to the embedding host application.
