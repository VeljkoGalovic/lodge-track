import { LOCALE_COOKIE } from "@/lib/i18n/server"
import { THEME_COOKIE } from "@/lib/theme"

/**
 * Stamps the member's saved theme and language onto `<html>` before first paint.
 *
 * A blocking script in `<head>`, deliberately. The alternative is reading both
 * cookies on the server, which would opt every route into dynamic rendering —
 * the statically prerendered marketing page included — for the sake of a class
 * name and a two-letter attribute. Running in the browser costs a few hundred
 * microseconds and cannot flicker, because no body content has been drawn yet
 * when this executes.
 *
 * Four things it sets, and each has a reason:
 *   - `class="dark"` / `class="light"` — what the token layer in globals.css and
 *     every `dark:` variant key off.
 *   - `data-theme` — a stable hook for CSS that needs to distinguish an explicit
 *     choice from the default, without re-deriving it.
 *   - `lang` — the document language a screen reader announces in. The server
 *     renders `en` because it cannot know the choice without going dynamic; this
 *     corrects it before anything is read aloud. A screen reader does not begin
 *     announcing before the document is parsed, so there is no window in which
 *     the wrong language is spoken.
 *   - `color-scheme` — tells the browser to draw native widgets (date pickers,
 *     scrollbars, form controls) in the matching palette. Without it a light
 *     dashboard keeps dark date pickers.
 *
 * Wrapped in try/catch because a browser with cookies disabled throws on access,
 * and a cosmetic preference is never worth an error that halts the document.
 */
const BOOT_SCRIPT = `(function(){var r=document.documentElement;try{
var c=document.cookie;
var m=c.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]+)/);
var p=m?decodeURIComponent(m[1]):"SYSTEM";
var d=p==="DARK"||(p==="SYSTEM"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
r.classList.toggle("dark",d);
r.classList.toggle("light",!d);
r.dataset.theme=d?"dark":"light";
r.style.colorScheme=d?"dark":"light";
var l=c.match(/(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)/);
if(l)r.lang=decodeURIComponent(l[1]);
}catch(e){}})()`

export function BootScript() {
  return <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
}
