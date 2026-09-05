// Deterministic, original vector artwork. Run manually; kept outside Hexo's scripts/ loader.
const fs = require('node:fs');
const path = require('node:path');
let seed = 9217;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const f = n => n.toFixed(1);
const branches = [], leaves = [];
function grow(x, y, angle, length, width, depth) {
  const bend = (random() - .5) * .4;
  const ex = x + Math.cos(angle + bend) * length;
  const ey = y + Math.sin(angle + bend) * length;
  branches.push(`<path d="M${f(x)} ${f(y)}Q${f(x + Math.cos(angle) * length * .58)} ${f(y + Math.sin(angle) * length * .58)} ${f(ex)} ${f(ey)}" stroke-width="${f(width)}"/>`);
  if (depth < 2) {
    for (let i = 0; i < 4; i++) {
      const lx = ex + (random() - .5) * 35, ly = ey + (random() - .5) * 21;
      leaves.push(`<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="${f(5 + random() * 11)}" ry="${f(2 + random() * 4)}" transform="rotate(${f((random() - .5) * 85)} ${f(lx)} ${f(ly)})" opacity="${f(.3 + random() * .6)}"/>`);
    }
  }
  if (!depth) return;
  grow(ex, ey, angle - .34 - random() * .31, length * .72, width * .62, depth - 1);
  grow(ex, ey, angle + .31 + random() * .36, length * .73, width * .61, depth - 1);
}
grow(600, 352, -2.28, 111, 17, 5);
grow(599, 348, -.82, 110, 18, 5);
grow(593, 300, -1.76, 82, 12, 5);
const trees = (count, y, scale) => Array.from({length:count}, (_, i) => {
  const x = i * 1200 / (count - 1) + (random() - .5) * 18;
  const s = scale * (.6 + random() * .5);
  return `<use href="#ash-pine" transform="translate(${f(x)} ${f(y + random()*26)}) scale(${f(s)})"/>`;
}).join('');
const stars = Array.from({length:37}, () => `<circle cx="${f(95 + random()*1010)}" cy="${f(40+random()*270)}" r="${f(.4+random())}" opacity="${f(.2+random()*.5)}"/>`).join('');
const stones = [[185,492],[272,470],[369,453],[472,463],[600,514],[728,463],[831,453],[928,470],[1015,492]];
const stoneMarkup = stones.map(([x,y],i) => `<g class="ash-stone" style="--realm:${i}" transform="translate(${x} ${y})"><path class="ash-stone-body" d="M-13 5-16-29-9-45 8-48 16-34 13 5Z"/><path class="ash-stone-edge" d="M-13 1-13-28-7-41 7-44"/><path class="ash-stone-mark" d="M0-34V-7m0-21 7 6-7 6m0 0-6-5"/><ellipse class="ash-stone-light" cy="8" rx="23" ry="3"/></g>`).join('');
const rootPaths = stones.map(([x,y]) => `<path d="M600 438C${f(600+(x-600)*.22)} 459 ${f(x+35)} ${y-4} ${x} ${y}"/>`).join('');
const svg = `<svg class="ash-art" viewBox="0 0 1200 660" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="ash-sky" x2="0" y2="1"><stop stop-color="#0b1718"/><stop offset=".66" stop-color="#29433b"/><stop offset="1" stop-color="#0d211b"/></linearGradient>
    <linearGradient id="ash-leaves" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#849781"/><stop offset=".38" stop-color="#466750"/><stop offset="1" stop-color="#1a352a"/></linearGradient>
    <linearGradient id="ash-wood" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#17271f"/><stop offset=".48" stop-color="#617562"/><stop offset=".65" stop-color="#283e2d"/><stop offset="1" stop-color="#101e19"/></linearGradient>
    <linearGradient id="ash-lake" x2="0" y2="1"><stop stop-color="#243f35"/><stop offset="1" stop-color="#081413"/></linearGradient>
    <linearGradient id="ash-reflect-fade" x2="0" y2="1"><stop stop-color="white" stop-opacity=".27"/><stop offset="1" stop-color="black"/></linearGradient>
    <radialGradient id="ash-moon-haze"><stop stop-color="#c2d3b0" stop-opacity=".19"/><stop offset="1" stop-color="#c2d3b0" stop-opacity="0"/></radialGradient>
    <radialGradient id="ash-heart-glow"><stop stop-color="#e4cf94" stop-opacity=".25"/><stop offset="1" stop-color="#a6ca9e" stop-opacity="0"/></radialGradient>
    <mask id="ash-reflection-mask"><rect x="0" y="468" width="1200" height="192" fill="url(#ash-reflect-fade)"/></mask>
    <path id="ash-pine" d="M0 0-9 22-5 21-17 43-10 41-23 63-11 60-29 81-3 77-3 94H3V77L29 81 11 60 23 63 10 41 17 43 5 21 9 22Z"/>
    <g id="ash-tree-form">
      <g class="ash-leaf-mass" fill="url(#ash-leaves)">${leaves.join('')}</g>
      <g stroke="#38533e" stroke-linecap="round">${branches.join('')}</g>
      <path fill="url(#ash-wood)" d="M543 454C574 424 583 394 585 361 588 331 579 321 587 293L592 269 601 279C591 314 612 329 612 355 610 392 617 425 655 454L627 462 599 445 569 465Z"/>
      <g stroke="#8b9c76" stroke-opacity=".38" stroke-linecap="round"><path d="M581 444C607 413 587 382 600 354s-13-36-6-69"/><path d="M609 370c-8 26 1 50 19 73M577 431c13-35 9-49 12-66"/></g>
      <path d="M569 452C547 439 517 446 485 455L416 472M619 449C651 436 677 447 711 455L781 472" stroke="#344e38" stroke-width="8" stroke-linecap="round"/>
    </g>
  </defs>
  <rect width="1200" height="660" fill="url(#ash-sky)"/>
  <g data-ash-layer="far">
    <g class="ash-stars" fill="#c1d3b5">${stars}</g>
    <g class="ash-moon"><circle cx="869" cy="133" r="112" fill="url(#ash-moon-haze)"/><circle cx="869" cy="133" r="33" fill="#bfd0b3" fill-opacity=".65"/><circle cx="881" cy="124" r="31" fill="#1c302d"/><circle cx="869" cy="133" r="43" stroke="#b3c9a7" stroke-opacity=".15"/></g>
    <g class="ash-sky-ring" stroke="#abc39f" stroke-width=".6"><circle cx="600" cy="260" r="216"/><circle cx="600" cy="260" r="227" stroke-dasharray="1 13"/><path d="M600 20v14m0 452v14M360 260h14m452 0h14"/></g>
    <path fill="#2b423b" d="M-30 339 44 300 102 311 205 232 243 272 299 248 388 335 459 299 566 353 663 318 749 331 831 257 874 277 962 218 1022 280 1071 264 1230 338V500H-30Z"/>
    <path fill="#1a332d" d="M-30 396 98 327 164 366 240 321 361 405 474 354 606 394 741 362 848 399 987 317 1102 361 1230 310V510H-30Z"/>
    <g fill="#18332a" opacity=".84">${trees(45,340,.66)}</g>
  </g>
  <ellipse class="ash-awake-halo" cx="600" cy="322" rx="320" ry="256" fill="url(#ash-heart-glow)"/>
  <g data-ash-layer="tree">
    <use href="#ash-tree-form"/>
    <g class="ash-sap" stroke="#d5c28b" stroke-width="1.7" stroke-linecap="round"><path d="M600 446C613 404 587 382 600 351S583 311 595 279M599 352C557 297 509 291 466 246L388 222M601 347C648 285 696 294 746 244L819 216M593 301C562 251 578 216 551 180"/></g>
    <path d="m600 364 5 8-5 8-5-8Z" fill="#cad8ae"/>
  </g>
  <path fill="url(#ash-lake)" d="M0 467Q340 446 600 465T1200 462V660H0Z"/>
  <g mask="url(#ash-reflection-mask)"><use href="#ash-tree-form" transform="translate(0 791) scale(1 -.72)"/></g>
  <g class="ash-water-light" stroke="#b9c89e" stroke-linecap="round" opacity=".2"><path d="M502 484h170m-200 13h235m-171 13h124m-155 15h192m-224 16h255m-180 15h106m-151 21h199"/><path d="M190 538h130m595-18h97M338 596h152m246-12h140" opacity=".4"/></g>
  <g data-ash-layer="near">
    <path fill="#10251e" d="M0 420Q130 422 225 450L393 459 465 481 339 506 168 513 72 536 0 532ZM1200 414Q1065 429 975 450L807 459 735 481 861 506 1032 513 1128 536 1200 532Z"/>
    <path d="M0 430 170 452 240 465 393 469M1200 430 1030 452 960 465 807 469" stroke="#687c58" stroke-opacity=".36" stroke-width="2"/>
    <g class="ash-roots" stroke="#7b9165" stroke-width="1.2">${rootPaths}</g>
    ${stoneMarkup}
    <g fill="#0b1c16"><use href="#ash-pine" transform="translate(67 302) scale(1.6)"/><use href="#ash-pine" transform="translate(14 266) scale(2.2)"/><use href="#ash-pine" transform="translate(1142 291) scale(1.8)"/><use href="#ash-pine" transform="translate(1200 248) scale(2.4)"/></g>
    <path fill="#091813" d="M0 542 70 551 119 576 237 582 320 620 414 660H0ZM1200 542 1130 551 1081 576 963 582 880 620 786 660h414Z"/>
    <g stroke="#536947" stroke-opacity=".6"><path d="M119 592l-5-34m5 34 12-25m-12 25-17-16M1090 588l-8-39m8 39 14-30m-14 30-20-18M266 637l-4-34m4 34 12-23"/></g>
  </g>
  <g class="ash-fireflies" fill="#c7d2a1">${Array.from({length:12},(_,i)=>`<circle cx="${f(280+random()*640)}" cy="${f(330+random()*210)}" r="${f(.7+random())}" style="--fly:${i}"/>`).join('')}</g>
</svg>`;
const target = path.join(__dirname,'../themes/garden/layout/_partial/yggdrasil-art.njk');
fs.writeFileSync(target, '{# Original vector landscape; generated by tools/build-yggdrasil-art.cjs. #}\n' + svg + '\n');
console.log('Generated original Yggdrasil vector landscape ('+Buffer.byteLength(svg)+' bytes)');
