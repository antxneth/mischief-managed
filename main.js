/* Main JS — polished interactive site */

/* helpers */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* Audio toggle + fade-in */
const audio = $('#bg-audio');
const audioToggle = $('#audio-toggle');
if (audioToggle) {
  audioToggle.addEventListener('click', () => {
    if (!audio) return;
    if (audio.paused || audio.muted) {
      audio.muted = false;
      audio.play().catch(()=>{});
      fadeInAudio(900);
      audioToggle.setAttribute('aria-pressed','true');
      audioToggle.textContent = '🔊';
    } else {
      audio.pause();
      audioToggle.setAttribute('aria-pressed','false');
      audioToggle.textContent = '🔈';
    }
  });
}
function fadeInAudio(duration=1000){
  if (!audio) return;
  audio.volume = 0;
  audio.muted = false;
  const steps = 20;
  let i = 0;
  const step = duration/steps;
  const id = setInterval(()=>{
    i++; audio.volume = Math.min(1, i/steps);
    if (i>=steps) clearInterval(id);
  }, step);
}

/* Modal open/close */
const sortingModal = $('#sorting-modal');
const btnStartQuiz = $('#btn-start-quiz');
const btnSkip = $('#btn-skip-quiz');
const closeSortingBtn = $('#close-sorting');

btnStartQuiz && btnStartQuiz.addEventListener('click', () => {
  fadeInAudio(800);
  openSorting();
});
btnSkip && btnSkip.addEventListener('click', ()=> {
  document.getElementById('main').scrollIntoView({behavior:'smooth'});
});
closeSortingBtn && closeSortingBtn.addEventListener('click', closeSorting);
$('#sorting-cancel') && $('#sorting-cancel').addEventListener('click', closeSorting);

function openSorting(){
  if (!sortingModal) return;
  sortingModal.setAttribute('aria-hidden','false');
  sortingModal.style.display = 'flex';
  // focus first radio for accessibility
  const first = sortingModal.querySelector('input[type="radio"]');
  if (first) first.focus();
}
function closeSorting(){
  if (!sortingModal) return;
  sortingModal.setAttribute('aria-hidden','true');
  sortingModal.style.display = 'none';
}

/* Sorting quiz logic: scoring -> path -> house mapping */
const pathToHouse = {
  web: 'Ravenclaw',
  data: 'Ravenclaw',
  sec: 'Gryffindor',
  sys: 'Slytherin',
  devops: 'Slytherin',
  team: 'Hufflepuff',
  iot: 'Slytherin'
};

$('#submit-sorting') && $('#submit-sorting').addEventListener('click', () => {
  const form = $('#sorting-form');
  if (!form) return;
  const answers = {
    q1: form.q1?.value || '',
    q2: form.q2?.value || '',
    q3: form.q3?.value || '',
    q4: form.q4?.value || '',
    q5: form.q5?.value || ''
  };

  const score = { web:0, data:0, sec:0, sys:0, devops:0, team:0, iot:0 };

  if (answers.q1 === 'web') score.web++;
  if (answers.q1 === 'data') score.data++;
  if (answers.q1 === 'sec') score.sec++;
  if (answers.q1 === 'sys') score.sys++;
  if (answers.q1 === 'devops') score.devops++;

  if (answers.q2 === 'bravery') score.sec++;
  if (answers.q2 === 'wisdom') score.data++;
  if (answers.q2 === 'loyalty') score.team++;
  if (answers.q2 === 'ambition') score.sys++;

  if (answers.q3 === 'editor') score.web++;
  if (answers.q3 === 'notebook') score.data++;
  if (answers.q3 === 'terminal') score.sys++;
  if (answers.q3 === 'network') score.devops++;

  if (answers.q4 === 'web') score.web++;
  if (answers.q4 === 'ai') score.data++;
  if (answers.q4 === 'ctf') score.sec++;
  if (answers.q4 === 'iot') score.iot++;

  if (answers.q5 === 'impact') score.web++;
  if (answers.q5 === 'insight') score.data++;
  if (answers.q5 === 'defense') score.sec++;
  if (answers.q5 === 'scale') score.devops++;

  // choose highest score
  let best = Object.keys(score).reduce((a,b) => score[a] >= score[b] ? a : b);
  if (!best) best = 'web';

  const house = pathToHouse[best] || 'Ravenclaw';
  const pathLabel = {
    web:'Web Wizardry (Frontend & UX)',
    data:'Data Divination (AI & Data Science)',
    sec:'Cyber Charms (Cybersecurity)',
    sys:'Systems Sorcery (Systems & Compilers)',
    devops:'Cloud Conjurors (DevOps & Infra)',
    team:'Software Guild (Engineering & Teamwork)',
    iot:'Hardware Hexes (IoT & Robotics)'
  }[best] || 'Web Wizardry';

  // render result (styled)
  const res = $('#sorting-result');
  res.innerHTML = `
    <div class="result-card" role="status">
      <h3>Your House: <strong>${house}</strong></h3>
      <p class="result-path">Recommended Path: <em>${pathLabel}</em></p>
      <div class="result-actions">
        <button id="enter-site" class="btn primary">Enter</button>
      </div>
    </div>
  `;
  // save to local storage (resume prefilling)
  localStorage.setItem('codecraft_profile', JSON.stringify({house, path:best, label:pathLabel}));

  $('#enter-site')?.addEventListener('click', () => { closeSorting(); document.getElementById('main').scrollIntoView({behavior:'smooth'}); });
  $('#view-path')?.addEventListener('click', () => {
    if (best === 'web') location.hash = '#spellbook';
    else if (best === 'data') location.hash = '#divination-data';
    else if (best === 'sec') location.hash = '#dark-hacks';
    else location.hash = '#potions-lab';
  });
});

/* Playground */
$('#pg-run')?.addEventListener('click', () => {
  const html = $('#pg-html').value;
  const css = $('#pg-css').value;
  const output = $('#pg-output');
  const doc = output.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
  doc.close();
});
$('#pg-reset')?.addEventListener('click', () => {
  $('#pg-html').value = `<div class="card-sample"><h3>Spellbook Widget</h3><p>Welcome apprentice!</p></div>`;
  $('#pg-css').value = `.card-sample{padding:12px;border-radius:8px;background:#fff;color:#04121a}`;
  $('#pg-run')?.click();
});

/* Terminal simulation */
$('#term-run')?.addEventListener('click', () => {
  $('#term-output').textContent = '> Building potion...\n> Installing ingredients...\n> Running unit tests...\n> Packaging container...\n> Deploying to staging...\n> ✅ Potion deployed (simulated).';
});
$('#term-reset')?.addEventListener('click', () => {
  $('#term-output').textContent = '> Welcome to the Potions Lab terminal. Press Run to simulate building a potion (project).';
});

/* Divination quiz */
$('#dq-check')?.addEventListener('click', () => {
  const val = (document.querySelector('input[name="dq"]:checked')||{}).value;
  const el = $('#dq-result');
  if (!val) { el.textContent = 'Pick an answer.'; return; }
  if (val === 'f1' || val === 'auc') el.textContent = 'Correct — for imbalanced classes prefer F1 or AUC (context matters).';
  else el.textContent = 'Not ideal — accuracy can be misleading for imbalanced datasets.';
});

/* Micro-CTF */
$('#ctf-check')?.addEventListener('click', () => {
  const v = $('#ctf-input')?.value.trim();
  const res = $('#ctf-result');
  const secret = 'alohomora-2025';
  if (v === secret) res.textContent = 'Correct! You found the token — nice forensic thinking.';
  else res.textContent = 'Incorrect token. Look for clues and try again.';
});

/* Resume generation */
$('#download-resume')?.addEventListener('click', () => {
  const profile = JSON.parse(localStorage.getItem('codecraft_profile') || 'null') || {house:'Not sorted', path:'Undeclared', label:'Undeclared'};
  const content = `Name: [Your Name]\nHouse: ${profile.house}\nRecommended Path: ${profile.label}\n\nExperience:\n[Project 1]\n[Project 2]\n\nSkills:\n- JavaScript, Python\n- Git, Docker\n`;
  const blob = new Blob([content], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Resume_Codecraft.txt'; a.click();
  URL.revokeObjectURL(url);
});

/* Cheat pack download */
$('#download-cheats')?.addEventListener('click', () => {
  const cheats = `-- Codecraft Cheat Pack --\nHTML: semantic tags\nCSS: flexbox/grid cheats\nJS: common patterns\nAlgorithms: Big-O cheats\nSecurity: input validation checklist\n\n`;
  const blob = new Blob([cheats], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'codecraft_cheatpack.txt';
  a.click();
  URL.revokeObjectURL(a.href);
});

/* Initial playground run */
window.addEventListener('load', ()=> { $('#pg-reset')?.click(); });

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.main-nav ul');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// Spellbook flip on click (mobile + desktop)
$$('.spell-card').forEach(card => {
  card.addEventListener('click', () => {
    card.classList.toggle('flipped');
  });
});
