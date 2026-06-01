// 台本・タイトル案 自動生成ツール（OpenAI連携・自分のAPIキー使用）
const LS = {
  key: "codex-yt-openai-key",
  ytKey: "codex-yt-youtube-key",
  model: "codex-yt-text-model",
  channels: "codex-yt-channels",
  refs: "codex-yt-refs",
  script: "codex-yt-script",
  meta: "codex-yt-meta",
};

const $ = (id) => document.getElementById(id);

const keyStatus = $("keyStatus");
const settingsModal = $("settingsModal");
const apiKeyInput = $("apiKey");
const ytKeyInput = $("ytKey");
const textModelSelect = $("textModel");
const chanStatus = $("chanStatus");
const refList = $("refList");
const chanTabs = $("chanTabs");
const scriptOutput = $("scriptOutput");
const refSummaries = $("refSummaries");
const titlesOutput = $("titlesOutput");
const thumbOutput = $("thumbOutput");
const scriptStatus = $("scriptStatus");
const titlesStatus = $("titlesStatus");
const thumbStatus = $("thumbStatus");

let channels = [];
let refs = [
  { label: "", transcript: "" },
  { label: "", transcript: "" },
  { label: "", transcript: "" },
];

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function flashButton(btn, text) {
  if (!btn) return;
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = text;
  btn.classList.add("flashed");
  setTimeout(() => {
    btn.textContent = btn.dataset.label;
    btn.classList.remove("flashed");
  }, 1600);
}

function setStatus(el, text, kind) {
  el.textContent = text || "";
  el.className = "status-line" + (kind ? " " + kind : "");
}

// ===== 設定（APIキー） =====
function getKey() {
  return (localStorage.getItem(LS.key) || "").trim();
}
function getYtKey() {
  return (localStorage.getItem(LS.ytKey) || "").trim();
}
function getModel() {
  return localStorage.getItem(LS.model) || "gpt-4o-mini";
}
function refreshKeyStatus() {
  if (!keyStatus) return;
  keyStatus.textContent = getKey() ? "APIキー: 設定済み ✓" : "APIキー: 未設定";
  keyStatus.classList.toggle("set", !!getKey());
}
function openSettings() {
  apiKeyInput.value = getKey();
  if (ytKeyInput) ytKeyInput.value = getYtKey();
  textModelSelect.value = getModel();
  settingsModal.classList.remove("is-hidden");
}
function closeSettings() {
  settingsModal.classList.add("is-hidden");
}
function requireKey(statusEl) {
  if (statusEl) setStatus(statusEl, "先に設定からAPIキーを登録してください", "err");
  openSettings();
}

// ===== OpenAI 呼び出し =====
async function openaiChat(messages, temperature = 0.8) {
  const key = getKey();
  if (!key) throw new Error("APIキーが未設定です");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model: getModel(),
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("OpenAIエラー (" + res.status + "): " + t.slice(0, 280));
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

// ===== 参考動画 =====
function renderRefs() {
  refList.innerHTML = refs
    .map(
      (r, i) => `
      <div class="ref-item">
        <input class="ref-label" data-i="${i}" placeholder="参考${i + 1}のタイトル/メモ（任意）" value="${escapeHtml(r.label)}" />
        <textarea class="ref-transcript" data-i="${i}" rows="3" placeholder="参考${i + 1}の文字起こしを貼り付け">${escapeHtml(r.transcript)}</textarea>
      </div>`,
    )
    .join("");
}
function readRefsFromDom() {
  refList.querySelectorAll(".ref-label").forEach((el) => {
    refs[Number(el.dataset.i)].label = el.value;
  });
  refList.querySelectorAll(".ref-transcript").forEach((el) => {
    refs[Number(el.dataset.i)].transcript = el.value;
  });
}
function persistRefs() {
  localStorage.setItem(LS.refs, JSON.stringify(refs));
}

// ===== 参考チャンネル =====
function renderChannels() {
  chanTabs.innerHTML = channels.length
    ? channels
        .map(
          (c) => `
        <span class="chan-tab">
          <span class="chan-name">${escapeHtml(c.name)}</span>
          <button type="button" class="chan-del" data-del="${escapeHtml(c.id)}" aria-label="削除">×</button>
        </span>`,
        )
        .join("")
    : `<span class="muted small">まだ登録なし（最大3つ）</span>`;
}
function persistChannels() {
  localStorage.setItem(LS.channels, JSON.stringify(channels));
}

// ===== YouTube Data API（URLからタイトル取得） =====
async function ytApi(path, params) {
  const key = getYtKey();
  if (!key) throw new Error("YouTube APIキーが未設定です（⚙設定）");
  const url = new URL("https://www.googleapis.com/youtube/v3/" + path);
  Object.entries({ ...params, key }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("YouTube APIエラー (" + res.status + "): " + ((data.error && data.error.message) || "").slice(0, 200));
  return data;
}

function parseChannelInput(input) {
  const s = input.trim();
  let u = null;
  try {
    u = new URL(s);
  } catch {
    if (s.startsWith("@")) return { handle: s };
    return { search: s };
  }
  const parts = u.pathname.split("/").filter(Boolean);
  const ci = parts.indexOf("channel");
  if (ci >= 0 && parts[ci + 1]) return { channelId: parts[ci + 1] };
  const handlePart = parts.find((p) => p.startsWith("@"));
  if (handlePart) return { handle: handlePart };
  const ui = parts.indexOf("user");
  if (ui >= 0 && parts[ui + 1]) return { username: parts[ui + 1] };
  const cc = parts.indexOf("c");
  if (cc >= 0 && parts[cc + 1]) return { search: decodeURIComponent(parts[cc + 1]) };
  if (parts[0]) return { search: decodeURIComponent(parts[0]) };
  return { search: s };
}

async function resolveChannel(ref) {
  let chan;
  if (ref.channelId) chan = await ytApi("channels", { part: "snippet,contentDetails", id: ref.channelId });
  else if (ref.handle) chan = await ytApi("channels", { part: "snippet,contentDetails", forHandle: ref.handle });
  else if (ref.username) chan = await ytApi("channels", { part: "snippet,contentDetails", forUsername: ref.username });
  else if (ref.search) {
    const sr = await ytApi("search", { part: "snippet", q: ref.search, type: "channel", maxResults: "1" });
    const id = sr.items?.[0]?.id?.channelId || sr.items?.[0]?.snippet?.channelId;
    if (!id) throw new Error("チャンネルが見つかりませんでした");
    chan = await ytApi("channels", { part: "snippet,contentDetails", id });
  }
  const item = chan?.items?.[0];
  if (!item) throw new Error("チャンネルが見つかりませんでした");
  return { title: item.snippet.title, uploads: item.contentDetails.relatedPlaylists.uploads };
}

async function fetchChannelTitles(url) {
  const ref = parseChannelInput(url);
  const { title, uploads } = await resolveChannel(ref);
  const pl = await ytApi("playlistItems", { part: "snippet", playlistId: uploads, maxResults: "10" });
  const titles = (pl.items || []).map((it) => it.snippet?.title).filter(Boolean);
  return { title, titles };
}

// ===== メタ（テーマ等） =====
function getMeta() {
  return { theme: $("theme").value, audience: $("audience").value, tone: $("tone").value };
}
function persistMeta() {
  localStorage.setItem(LS.meta, JSON.stringify(getMeta()));
}

// ===== 生成：台本 =====
async function generateScript() {
  if (!getKey()) return requireKey(scriptStatus);
  readRefsFromDom();
  persistRefs();
  const { theme, audience, tone } = getMeta();
  const usedRefs = refs.filter((r) => r.transcript.trim());
  // TPM上限対策：各文字起こしを上限でカット（gpt-4oの毎分トークン制限超え対策）
  const MAX_TRANSCRIPT = 4500;
  const clip = (t) => (t.length > MAX_TRANSCRIPT ? t.slice(0, MAX_TRANSCRIPT) + "\n（…以下省略）" : t);
  const refsText = usedRefs.length
    ? usedRefs.map((r, i) => `【参考${i + 1}${r.label ? "：" + r.label : ""}】\n${clip(r.transcript)}`).join("\n\n")
    : "（参考動画なし）";
  const sys =
    "あなたは登録者を伸ばしているYouTube専門の構成作家です。視聴維持率を最優先に、テンポの良い『話し言葉』の台本を日本語で書きます。次の原則を必ず守ります。\n" +
    "- 冒頭は『こんにちは、〜の皆さん。今日は〜』のような定番の挨拶で始めない。最初の数秒で『結論・得する事・強い問い・意外な事実』のどれかをぶつけてフックする。\n" +
    "- 『便利です』『効率化できます』だけの抽象論は禁止。具体例・数字・固有名詞・Before/After・実際のセリフを入れて映像が浮かぶように書く。\n" +
    "- オープンループ（後で回収する伏線）や小さな問いかけで『この先を見たい』を作る。視聴者の具体的な悩みにピンポイントで刺す。\n" +
    "- 1文を短く、間延びさせない。当たり前の説明や前置きは削る。テンポ重視。\n" +
    "- 参考動画があれば、その『つかみ方・構成の運び・言い回しの良さ』を抽出して活かす（丸写し・コピペは厳禁）。\n" +
    "- 製品・サービス名は正式表記（例：Codex はカタカナ『コデックス』にしない）。\n" +
    "- 各ブロックは、必要なら【ナレーション】と【画面/テロップ】を分けて書いてよい。最後にCTAを1つだけ自然に。";
  const user =
    `テーマ: ${theme || "（未入力）"}\n視聴者: ${audience}\nトーン: ${tone}\n\n参考動画の文字起こし:\n${refsText}\n\n` +
    `上記をもとに、最後まで見られる台本を作ってください。出力はJSONのみ：\n` +
    `{"script":"フック→共感/問題提起→本編（具体例つきの見出し）→クライマックス→自然なCTA まで。話し言葉でテンポよく。","references":[{"label":"参考1の名前","structure":"その参考動画の構成・つかみ・良かった点の要約（2〜4行）"}]}\n` +
    `referencesは渡された参考動画の数だけ。参考が無ければ空配列。定番の挨拶始まりは避けること。`;
  setStatus(scriptStatus, "生成中…", "loading");
  try {
    const out = await openaiChat([{ role: "system", content: sys }, { role: "user", content: user }]);
    scriptOutput.value = out.script || "";
    localStorage.setItem(LS.script, scriptOutput.value);
    renderRefSummaries(Array.isArray(out.references) ? out.references : []);
    setStatus(scriptStatus, "生成しました ✓", "ok");
  } catch (e) {
    setStatus(scriptStatus, e.message, "err");
  }
}

function renderRefSummaries(items) {
  if (!items.length) {
    refSummaries.innerHTML = `<p class="muted">参考動画はありませんでした。</p>`;
    return;
  }
  refSummaries.innerHTML = "";
  items.forEach((it, i) => {
    const card = document.createElement("div");
    card.className = "ref-summary";
    const h = document.createElement("strong");
    h.textContent = it.label || "参考" + (i + 1);
    const p = document.createElement("p");
    p.textContent = it.structure || "";
    card.append(h, p);
    refSummaries.appendChild(card);
  });
}

// ===== 生成：タイトル10個 =====
async function generateTitles() {
  if (!getKey()) return requireKey(titlesStatus);
  const { theme } = getMeta();
  const script = scriptOutput.value.trim();
  const base = script ? "台本:\n" + script : "テーマ: " + (theme || "（未入力）");
  const chanText = channels.length
    ? channels.map((c) => `- ${c.name}${c.samples ? "（例: " + c.samples.replace(/\n+/g, " / ") + "）" : ""}`).join("\n")
    : "（参考チャンネルなし）";
  const sys = "あなたはYouTubeのタイトル設計の専門家です。クリック率と内容一致を両立した日本語タイトルを作ります。";
  const user =
    `次の内容に合うタイトル案を必ず10個。\n\n${base}\n\n` +
    `参考チャンネル（このトーン・型・言い回しの方向性を参考にする。ただし丸パクリ・コピペ感は厳禁で、表現は必ず自分の言葉に変える）:\n${chanText}\n\n` +
    `出力はJSONのみ：{"titles":["...","...（10個）"]}`;
  setStatus(titlesStatus, "生成中…", "loading");
  try {
    const out = await openaiChat([{ role: "system", content: sys }, { role: "user", content: user }], 0.9);
    renderTitles(Array.isArray(out.titles) ? out.titles.slice(0, 10) : []);
    setStatus(titlesStatus, "生成しました ✓", "ok");
  } catch (e) {
    setStatus(titlesStatus, e.message, "err");
  }
}

function renderTitles(titles) {
  titlesOutput.innerHTML = "";
  titles.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    titlesOutput.appendChild(li);
  });
}

// ===== 生成：サムネ画像 =====
async function generateThumbnails() {
  const key = getKey();
  if (!key) return requireKey(thumbStatus);
  const { theme } = getMeta();
  const prompt =
    `YouTubeサムネイル用の高品質な画像。テーマ「${theme || "AI活用・副業"}」。` +
    `日本のYouTube視聴者向けで、サムネとして視認性が高くクリックしたくなる構図。大きく目を引く主役、明快で力強い配色、` +
    `中央〜右に被写体、左側に文字を載せられる余白。セミリアルでプロっぽい仕上がり。画像内に文字は入れない。`;
  setStatus(thumbStatus, "生成中…（画像は時間がかかります）", "loading");
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1536x1024", n: 2 }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error("画像エラー (" + res.status + "): " + t.slice(0, 280));
    }
    const data = await res.json();
    renderThumbs(Array.isArray(data.data) ? data.data : []);
    setStatus(thumbStatus, "生成しました ✓（画像内に文字は入りません。文字は別途のせてください）", "ok");
  } catch (e) {
    setStatus(thumbStatus, e.message, "err");
  }
}

function renderThumbs(items) {
  thumbOutput.innerHTML = "";
  items.forEach((d) => {
    if (!d.b64_json) return;
    const img = document.createElement("img");
    img.src = "data:image/png;base64," + d.b64_json;
    img.alt = "サムネ案";
    img.className = "thumb-img";
    thumbOutput.appendChild(img);
  });
  if (!thumbOutput.children.length) {
    thumbOutput.innerHTML = `<p class="muted">画像を取得できませんでした。</p>`;
  }
}

// ===== 初期化 =====
function init() {
  // restore meta
  try {
    const m = JSON.parse(localStorage.getItem(LS.meta) || "null");
    if (m) {
      if (m.theme) $("theme").value = m.theme;
      if (m.audience) $("audience").value = m.audience;
      if (m.tone) $("tone").value = m.tone;
    }
  } catch {}
  // restore refs
  try {
    const r = JSON.parse(localStorage.getItem(LS.refs) || "null");
    if (Array.isArray(r) && r.length === 3) refs = r;
  } catch {}
  renderRefs();
  // restore channels
  try {
    const c = JSON.parse(localStorage.getItem(LS.channels) || "[]");
    if (Array.isArray(c)) channels = c;
  } catch {}
  renderChannels();
  // restore script
  const s = localStorage.getItem(LS.script);
  if (s) scriptOutput.value = s;
  refreshKeyStatus();
}

// ===== イベント =====
$("openSettings").addEventListener("click", openSettings);
$("closeSettings").addEventListener("click", closeSettings);
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettings();
});
$("toggleKey").addEventListener("click", () => {
  const t = apiKeyInput.type === "password";
  apiKeyInput.type = t ? "text" : "password";
  $("toggleKey").textContent = t ? "隠す" : "表示";
});
$("toggleYtKey").addEventListener("click", () => {
  const t = ytKeyInput.type === "password";
  ytKeyInput.type = t ? "text" : "password";
  $("toggleYtKey").textContent = t ? "隠す" : "表示";
});
$("saveKey").addEventListener("click", () => {
  localStorage.setItem(LS.key, apiKeyInput.value.trim());
  localStorage.setItem(LS.ytKey, ytKeyInput.value.trim());
  localStorage.setItem(LS.model, textModelSelect.value);
  refreshKeyStatus();
  flashButton($("saveKey"), "保存しました ✓");
  setTimeout(closeSettings, 700);
});
$("clearKey").addEventListener("click", () => {
  localStorage.removeItem(LS.key);
  localStorage.removeItem(LS.ytKey);
  apiKeyInput.value = "";
  ytKeyInput.value = "";
  refreshKeyStatus();
  flashButton($("clearKey"), "削除しました");
});

$("fetchChanButton").addEventListener("click", async () => {
  if (channels.length >= 3) return setStatus(chanStatus, "登録は最大3つです", "err");
  const url = $("chanUrl").value.trim();
  if (!url) return setStatus(chanStatus, "チャンネルURLを入力してください", "err");
  if (!getYtKey()) {
    setStatus(chanStatus, "⚙設定にYouTube APIキーを登録してください", "err");
    openSettings();
    return;
  }
  const btn = $("fetchChanButton");
  btn.disabled = true;
  setStatus(chanStatus, "取得中…", "loading");
  try {
    const { title, titles } = await fetchChannelTitles(url);
    if (!titles.length) throw new Error("タイトルを取得できませんでした");
    channels.push({ id: "ch" + Date.now(), name: title, samples: titles.join("\n"), url });
    persistChannels();
    renderChannels();
    $("chanUrl").value = "";
    setStatus(chanStatus, `「${title}」を登録（タイトル${titles.length}件取得）`, "ok");
  } catch (e) {
    setStatus(chanStatus, e.message, "err");
  } finally {
    btn.disabled = false;
  }
});

refList.addEventListener("input", (e) => {
  const i = Number(e.target.dataset.i);
  if (Number.isNaN(i)) return;
  if (e.target.classList.contains("ref-label")) refs[i].label = e.target.value;
  else if (e.target.classList.contains("ref-transcript")) refs[i].transcript = e.target.value;
  persistRefs();
});

["theme", "audience", "tone"].forEach((id) => $(id).addEventListener("input", persistMeta));

$("addChanButton").addEventListener("click", () => {
  const name = $("chanName").value.trim();
  if (!name) return flashButton($("addChanButton"), "チャンネル名を入力");
  if (channels.length >= 3) return flashButton($("addChanButton"), "登録は最大3つ");
  channels.push({ id: "ch" + Date.now(), name, samples: $("chanSamples").value.trim() });
  persistChannels();
  renderChannels();
  $("chanName").value = "";
  $("chanSamples").value = "";
  flashButton($("addChanButton"), "登録しました ✓");
});
chanTabs.addEventListener("click", (e) => {
  const del = e.target.dataset.del;
  if (del) {
    channels = channels.filter((c) => c.id !== del);
    persistChannels();
    renderChannels();
  }
});

$("genScriptButton").addEventListener("click", generateScript);
$("genTitlesButton").addEventListener("click", generateTitles);
$("genThumbButton").addEventListener("click", generateThumbnails);

scriptOutput.addEventListener("input", () => localStorage.setItem(LS.script, scriptOutput.value));
$("saveScriptButton").addEventListener("click", () => {
  localStorage.setItem(LS.script, scriptOutput.value);
  flashButton($("saveScriptButton"), "保存しました ✓");
});
$("copyScriptButton").addEventListener("click", () => {
  navigator.clipboard?.writeText(scriptOutput.value);
  flashButton($("copyScriptButton"), "コピー ✓");
});
$("copyTitlesButton").addEventListener("click", () => {
  const text = [...titlesOutput.querySelectorAll("li")].map((li, i) => `${i + 1}. ${li.textContent}`).join("\n");
  navigator.clipboard?.writeText(text);
  flashButton($("copyTitlesButton"), "コピー ✓");
});

init();
