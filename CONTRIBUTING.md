# Contributing

LensUI is a provider-agnostic lightcode runtime for generating compact,
portable interfaces.

## Local Setup

```sh
pnpm install
pnpm build
pnpm test
pnpm e2e
```

If Playwright browsers are missing:

```sh
pnpm e2e:install
```

## Project Boundaries

Keep LensUI host-neutral. It should not include proprietary host app behavior,
account flows, provider SDKs, billing logic, private app themes, or application
prompts. Hosts can inject their own saved components, themes, tools, auth,
billing, and inference adapters around the open runtime.
