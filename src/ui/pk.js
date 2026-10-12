// ui/pk.js: the ONE layout shared by every pick / reward / shop / camp screen (Task 45).
// engraved title -> one line of prompt -> body (fills the room, sized by container units, scrolls inside if it must) -> foot.
// The foot is always the same strip at the bottom of the safe frame: secondary buttons on the left of the primary, the primary
// (Continue / Proceed / Leave) always in the same bottom-right spot, like Slay the Spire.
import {glyph} from './glyphs.js';
export const pkBtn=(label,onclick,o={})=>`<button class="btn pkbtn${o.pri?' pri':''}"${o.id?` id="${o.id}"`:''} onclick="${onclick}"${o.dis?' disabled':''}>${o.icon?glyph(o.icon):''}<span>${label}</span></button>`;
export function pkScreen({cls='',title,sub='',body='',left='',right='',after=''}){
 return `<div class="pk ${cls}"><h2 class="etitle">${title}</h2><div class="pk-sub" id="pksub">${sub}</div><div class="pk-body">${body}</div><div class="pk-foot"><div class="pk-l">${left}</div><div class="pk-r">${right}</div></div></div>${after}`}
