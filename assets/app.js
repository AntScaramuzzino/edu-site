// EduSite — app.js (vanilla JS)
const $ = (sel) => document.querySelector(sel);

function escapeHtml(str){
  return (str ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

// super-minimal markdown-ish: **bold**, newlines, lists starting with "- "
function miniMd(md){
  const lines = (md ?? "").split("\n");
  let html = "";
  let inList = false;

  const flushList = () => {
    if(inList){ html += "</ul>"; inList = false; }
  };

  for(const raw of lines){
    const line = raw.trimEnd();
    if(line.trim().startsWith("- ")){
      if(!inList){ html += "<ul>"; inList = true; }
      const li = line.trim().slice(2);
      html += `<li>${formatInline(li)}</li>`;
    }else if(line.trim() === ""){
      flushList();
      html += "<p></p>";
    }else{
      flushList();
      html += `<p>${formatInline(line)}</p>`;
    }
  }
  flushList();
  return html;

  function formatInline(s){
    // **bold**
    let out = escapeHtml(s);
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return out;
  }
}

async function loadJson(path){
  const res = await fetch(path, {cache:"no-store"});
  if(!res.ok) throw new Error(`Impossibile caricare ${path}`);
  return res.json();
}

function setYear(){
  const y = new Date().getFullYear();
  document.querySelectorAll("#year").forEach(el => el.textContent = y);
}

function getParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function setParam(name, value){
  const url = new URL(window.location.href);
  if(value === null || value === undefined) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  history.replaceState({}, "", url);
}

// LESSONS PAGE
async function initLessons(){
  const listEl = $("#lessonList");
  const viewEl = $("#lessonView");
  const contentEl = $("#lessonContent");
  const searchEl = $("#lessonSearch");
  const backBtn = $("#backToList");
  const goQuiz = $("#goQuiz");

  if(!listEl) return;

  const lessons = await loadJson("./data/lessons.json");

  function renderList(filter=""){
    const q = filter.trim().toLowerCase();
    const items = lessons.filter(l => {
      const hay = [l.title, l.course, l.level, (l.tags||[]).join(" "), l.body].join(" ").toLowerCase();
      return hay.includes(q);
    });

    listEl.innerHTML = items.map(l => `
      <article class="card item">
        <div class="item__title">
          <h3>${escapeHtml(l.title)}</h3>
          <span class="item__meta">${escapeHtml(l.minutes)} min</span>
        </div>
        <div class="item__meta">${escapeHtml(l.course)} • ${escapeHtml(l.level)}</div>
        <div style="margin-top:.5rem">
          ${(l.tags||[]).map(t=>`<span class="pill">${escapeHtml(t)}</span>`).join("")}
        </div>
        <button class="btn" data-open="${escapeHtml(l.id)}">Apri lezione</button>
      </article>
    `).join("");

    listEl.querySelectorAll("[data-open]").forEach(btn=>{
      btn.addEventListener("click", () => openLesson(btn.getAttribute("data-open")));
    });

    if(items.length === 0){
      listEl.innerHTML = `<div class="card wide"><p>Nessun risultato. Prova un’altra parola.</p></div>`;
    }
  }

  function openLesson(id){
    const lesson = lessons.find(l => l.id === id);
    if(!lesson) return;

    $("#lessonList").hidden = true;
    $("#lessonView").hidden = false;

    contentEl.innerHTML = `
      <h2 style="margin:.2rem 0 .35rem">${escapeHtml(lesson.title)}</h2>
      <div class="muted">${escapeHtml(lesson.course)} • ${escapeHtml(lesson.level)} • ${escapeHtml(lesson.minutes)} min</div>
      <div style="margin-top:.6rem">${(lesson.tags||[]).map(t=>`<span class="pill">${escapeHtml(t)}</span>`).join("")}</div>
      <hr/>
      <div>${miniMd(lesson.body)}</div>
    `;

    // link quiz by lessonId if exists
    goQuiz.href = `./quiz.html?lesson=${encodeURIComponent(lesson.id)}`;
    setParam("lesson", lesson.id);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  backBtn?.addEventListener("click", () => {
    $("#lessonView").hidden = true;
    $("#lessonList").hidden = false;
    setParam("lesson", null);
    window.scrollTo({top:0, behavior:"smooth"});
  });

  searchEl?.addEventListener("input", (e) => renderList(e.target.value));

  renderList("");

  // open lesson if in URL
  const lessonId = getParam("lesson");
  if(lessonId) openLesson(lessonId);
}

// QUIZ PAGE
async function initQuiz(){
  const listEl = $("#quizList");
  const viewEl = $("#quizView");
  const contentEl = $("#quizContent");
  const searchEl = $("#quizSearch");
  const backBtn = $("#backToQuizList");

  if(!listEl) return;

  const quizzes = await loadJson("./data/quizzes.json");

  function renderQuizList(filter=""){
    const q = filter.trim().toLowerCase();
    const items = quizzes.filter(z => {
      const hay = [z.title, z.id, z.lessonId].join(" ").toLowerCase();
      return hay.includes(q);
    });

    listEl.innerHTML = items.map(z => `
      <article class="card item">
        <div class="item__title">
          <h3>${escapeHtml(z.title)}</h3>
          <span class="item__meta">${escapeHtml(z.questions?.length ?? 0)} domande</span>
        </div>
        <div class="item__meta">Collegato a lezione: <code>${escapeHtml(z.lessonId || "-")}</code></div>
        <button class="btn" data-open="${escapeHtml(z.id)}">Avvia quiz</button>
      </article>
    `).join("");

    listEl.querySelectorAll("[data-open]").forEach(btn=>{
      btn.addEventListener("click", () => openQuiz(btn.getAttribute("data-open")));
    });

    if(items.length === 0){
      listEl.innerHTML = `<div class="card wide"><p>Nessun quiz trovato.</p></div>`;
    }
  }

  function openQuiz(id){
    const quiz = quizzes.find(z => z.id === id);
    if(!quiz) return;

    listEl.hidden = true;
    viewEl.hidden = false;

    const total = quiz.questions.length;
    contentEl.innerHTML = `
      <h2 style="margin:.2rem 0 .35rem">${escapeHtml(quiz.title)}</h2>
      <div class="muted">Rispondi e poi clicca “Correggi”.</div>
      <form id="quizForm" style="margin-top:1rem">
        ${quiz.questions.map((qq, idx) => `
          <div class="quiz-q">
            <div><strong>${idx+1}.</strong> ${escapeHtml(qq.q)}</div>
            <div class="choices">
              ${qq.choices.map((c, ci) => `
                <label class="choice">
                  <input type="radio" name="q${idx}" value="${ci}" />
                  <span>${escapeHtml(c)}</span>
                </label>
              `).join("")}
            </div>
            <div class="feedback" id="fb${idx}" hidden></div>
          </div>
        `).join("")}
        <button class="btn" type="submit">Correggi</button>
      </form>
      <div class="feedback" id="scoreBox" hidden></div>
    `;

    const form = $("#quizForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let score = 0;

      quiz.questions.forEach((qq, idx) => {
        const sel = form.querySelector(`input[name="q${idx}"]:checked`);
        const chosen = sel ? Number(sel.value) : null;
        const ok = (chosen === qq.answer);

        if(ok) score++;

        const fb = $(`#fb${idx}`);
        fb.hidden = false;
        fb.innerHTML = ok
          ? `✅ Corretto. ${escapeHtml(qq.explain || "")}`
          : `❌ Non proprio. Risposta corretta: <strong>${escapeHtml(qq.choices[qq.answer])}</strong>. ${escapeHtml(qq.explain || "")}`;
      });

      const box = $("#scoreBox");
      box.hidden = false;
      box.innerHTML = `<strong>Punteggio:</strong> ${score}/${total}. ${
        score === total ? "Perfetto! 👑" :
        score >= Math.ceil(total*0.7) ? "Ottimo, ci sei quasi." :
        "Riguarda la lezione e riprova: l'errore è un ottimo segnale."
      }`;
      window.scrollTo({top:0, behavior:"smooth"});
    });

    setParam("quiz", quiz.id);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  backBtn?.addEventListener("click", () => {
    viewEl.hidden = true;
    listEl.hidden = false;
    setParam("quiz", null);
    window.scrollTo({top:0, behavior:"smooth"});
  });

  searchEl?.addEventListener("input", (e) => renderQuizList(e.target.value));

  renderQuizList("");

  // deep link: if quiz in URL OR lesson param to auto-pick a related quiz
  const quizId = getParam("quiz");
  const lessonId = getParam("lesson");
  if(quizId) openQuiz(quizId);
  else if(lessonId){
    const qz = quizzes.find(z => z.lessonId === lessonId);
    if(qz) openQuiz(qz.id);
  }
}

setYear();
initLessons().catch(console.error);
initQuiz().catch(console.error);
