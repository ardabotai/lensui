import { createStageRuntime } from "./index";

export { createStageRuntime } from "./index";

function boot() {
  const mounts = Array.from(document.querySelectorAll<HTMLElement>("#lens-stage-mount, [data-lens-stage]"));
  const targets = mounts.length ? mounts : [document.body];
  targets.forEach((mount) => {
    if (mount.dataset.lensBooted === "1") return;
    mount.dataset.lensBooted = "1";
    createStageRuntime(mount);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
