import { createStageRuntime } from "./index";

export { createPersistentStageRuntime, createStageRuntime } from "./index";

function boot() {
  const mounts = Array.from(document.querySelectorAll<HTMLElement>("#lens-stage-mount, [data-lens-stage]"));
  const targets = mounts.length ? mounts : [document.body];
  targets.forEach((mount) => {
    if (mount.dataset.lensBooted === "1") return;
    mount.dataset.lensBooted = "1";
    createStageRuntime(mount, {
      persistence: truthy(mount.dataset.lensPersist) ? { key: mount.dataset.lensPersistKey } : false
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

function truthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}
