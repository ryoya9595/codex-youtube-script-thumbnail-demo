const statusLabel = document.querySelector("#status");
const form = document.querySelector("#youtubeForm");
const scriptOutput = document.querySelector("#scriptOutput");
const thumbnailOutput = document.querySelector("#thumbnailOutput");

function renderYoutube() {
  const data = Object.fromEntries(new FormData(form).entries());
  const points = String(data.points || "")
    .split("\n")
    .map((point) => point.trim())
    .filter(Boolean);

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
        <div><strong>問題提起</strong><p>${data.audience}がつまずく「何をAIに任せればいいか」を先に整理。</p></div>
      </div>
      <div class="timeline-item">
        <div class="time">6:00</div>
        <div><strong>実演</strong><p>${points.slice(0, 4).join("、")}を順番に見せる。</p></div>
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
      <span class="badge">${data.tone}</span>
    </div>
    <div class="thumb-grid">
      <div class="thumb-card"><strong>課金者の9割 損してます</strong><span>ChatGPTだけはもったいない</span></div>
      <div class="thumb-card"><strong>Codexで仕事が終わる</strong><span>AI副業の作業を丸投げ</span></div>
      <div class="thumb-card"><strong>月20ドルでここまで!?</strong><span>画像・資料・操作まで実演</span></div>
      <div class="thumb-card"><strong>初心者こそCodex</strong><span>設定と安全な使い方を解説</span></div>
    </div>
  `;
  statusLabel.textContent = "GENERATED";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderYoutube();
});

renderYoutube();
