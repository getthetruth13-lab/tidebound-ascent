// ui/screens/frame.js: shared pieces of the title-flow screens (painted backdrop, ornate iron-and-parchment frame).
export const bgHTML=()=>`<div class="tb-bg"><div class="tb-sea"></div><div class="tb-fog f1"></div><div class="tb-fog f2"></div><div class="tb-shim"></div></div><div class="tb-vig"></div>`;
// Corner rivets + inner rule come from CSS (.tb-frame); this wraps the inside of a framed panel.
export const frameOpen=()=>`<i class="tb-orn tl"></i><i class="tb-orn tr"></i><i class="tb-orn bl"></i><i class="tb-orn br"></i><div class="tb-inner">`;
export const frameClose=()=>`</div>`;
