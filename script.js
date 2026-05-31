const statusLabel = document.querySelector("#status");
const form = document.querySelector("#youtubeForm");
const titleOutput = document.querySelector("#titleOutput");
const scriptOutput = document.querySelector("#scriptOutput");
const thumbnailOutput = document.querySelector("#thumbnailOutput");
const copyPlanButton = document.querySelector("#copyPlanButton");
const downloadButton = document.querySelector("#downloadButton");

let latestPlan = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderYoutube() {
  const data = Object.fromEntries(new FormData(form).entries());
  const points = String(data.points || "")
    .split("\n")
    .map((point) => point.trim())
    .filter(Boolean);

  const titles = [
    "ChatGPT課金者の9割が知らないCodexの使い方",
    "月20ドルでここまでできる。Codex完全入門",
    "AI副業の作業が終わるCodex活用術",
    "初心者こそCodexを使うべき理由",
    "Codexで資料・リサーチ・ツール制作まで実演",
  ];

  const opening = `ChatGPTに課金してるのに、まだチャットだけで使ってませんか？実は月20ドルのプランに入っている人は、Codexという「作業を終わらせるAI」まで使えます。今日は${data.audience}向けに、${points.slice(0, 3).join("、")}まで実演します。`;

  titleOutput.innerHTML = `
    <div class="section-head">
      <h2>タイトル案</h2>
      <span class="badge">5 ideas</span>
    </div>
    <div class="title-list">
      ${titles.map((title) => `<div class="title-item">${escapeHtml(title)}</div>`).join("")}
    </div>
    <div class="opening-box">
      <strong>冒頭30秒トーク</strong>
      <p>${escapeHtml(opening)}</p>
    </div>
  `;

  scriptOutput.innerHTML = `
    <div class="section-head">
      <h2>動画構成</h2>
      <span class="badge">5 blocks</span>
    </div>
    <div class="timeline">
      <div class="timeline-item">
        <div class="time">0:00</div>
        <div><strong>冒頭フック</strong><p>ChatGPTに課金してるのにCodexを使ってない人、かなり損してます。</p></div>
      </div>
      <div class="timeline-item">
        <div class="time">2:00</div>
        <div><strong>問題提起</strong><p>${escapeHtml(data.audience)}がつまずく「何をAIに任せればいいか」を先に整理。</p></div>
      </div>
      <div class="timeline-item">
        <div class="time">6:00</div>
        <div><strong>実演</strong><p>${escapeHtml(points.slice(0, 4).join("、"))}を順番に見せる。</p></div>
      </div>
      <div class="timeline-item">
        <div class="time">18:00</div>
        <div><strong>クライマックス</strong><p>テーマ入力だけでYouTube台本とサムネ案が出る瞬間を見せる。</p></div>
      </div>
      <div class="timeline-item">
        <div class="time">24:00</div>
        <div><strong>CTA</strong><p>セットアップマニュアルとセキュリティ設定特典へ誘導。</p></div>
      </div>
    </div>
  `;

  thumbnailOutput.innerHTML = `
    <div class="section-head">
      <h2>サムネ案</h2>
      <span class="badge">${escapeHtml(data.tone)}</span>
    </div>
    <div class="thumb-grid">
      <div class="thumb-card"><strong>課金者の9割 損してます</strong><span>ChatGPTだけはもったいない</span></div>
      <div class="thumb-card"><strong>Codexで仕事が終わる</strong><span>AI副業の作業を丸投げ</span></div>
      <div class="thumb-card"><strong>月20ドルでここまで!?</strong><span>画像・資料・操作まで実演</span></div>
      <div class="thumb-card"><strong>初心者こそCodex</strong><span>設定と安全な使い方を解説</span></div>
    </div>
  `;
  latestPlan = [
    `# ${data.theme}`,
    "",
    "## タイトル案",
    ...titles.map((title) => `- ${title}`),
    "",
    "## 冒頭30秒",
    opening,
    "",
    "## 動画構成",
    "- 0:00 冒頭フック",
    "- 2:00 問題提起",
    `- 6:00 実演: ${points.slice(0, 4).join("、")}`,
    "- 18:00 クライマックス",
    "- 24:00 CTA",
    "",
    "## サムネ案",
    "- 課金者の9割 損してます / ChatGPTだけはもったいない",
    "- Codexで仕事が終わる / AI副業の作業を丸投げ",
    "- 月20ドルでここまで!? / 画像・資料・操作まで実演",
    "- 初心者こそCodex / 設定と安全な使い方を解説",
  ].join("\n");
  localStorage.setItem("codex-youtube-plan-demo-v2", JSON.stringify(Object.fromEntries(new FormData(form).entries())));
  statusLabel.textContent = "GENERATED";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderYoutube();
});

renderYoutube();

const saved = localStorage.getItem("codex-youtube-plan-demo-v2");
if (saved) {
  try {
    const data = JSON.parse(saved);
    Object.entries(data).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
    renderYoutube();
  } catch {
    localStorage.removeItem("codex-youtube-plan-demo-v2");
  }
}

copyPlanButton.addEventListener("click", () => {
  navigator.clipboard?.writeText(latestPlan);
  statusLabel.textContent = "COPIED";
});

downloadButton.addEventListener("click", () => {
  const blob = new Blob([latestPlan], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "youtube-plan.md";
  a.click();
  URL.revokeObjectURL(url);
  statusLabel.textContent = "SAVED";
});
