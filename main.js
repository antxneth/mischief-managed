/* === Main JS — polished interactive site + sorting quiz (clean, modular) === */

/* helpers */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* -------------------------------------------------------------------------- */
/* Audio toggle + fade-in (existing feature preserved)                        */
/* -------------------------------------------------------------------------- */
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
function fadeInAudio(duration = 1000) {
  if (!audio) return;
  audio.volume = 0;
  audio.muted = false;
  const steps = 20;
  let i = 0;
  const step = Math.max(1, Math.floor(duration / steps));
  const id = setInterval(() => {
    i++;
    audio.volume = Math.min(1, i / steps);
    if (i >= steps) clearInterval(id);
  }, step);
}

/* -------------------------------------------------------------------------- */
/* Modal + Sorting Quiz module                                                 */
/* - single source of truth for modal + quiz state                             */
/* - fixes: double-listener jump, progress math, persistent display, a11y      */
/* -------------------------------------------------------------------------- */
const SortingQuiz = (() => {
  // DOM
  const overlay = $('#sorting-modal'); // expects modal-overlay container (aria-hidden toggled)
  const modalInner = overlay?.querySelector('.modal') || null;
  const startBtn = $('#btn-start-quiz');
  const skipBtn = $('#btn-skip-quiz');
  const closeBtn = $('#close-sorting');
  const form = $('#sorting-form');
  const questions = form ? $$('#sorting-form .q') : [];
  const progressFill = $('.progress-fill');
  const resultContainer = $('#sorting-result');

  // state
  let currentIndex = 0;
  let isOpen = false;

  // sanity checks
  if (!overlay || !form || questions.length === 0) {
    // If the quiz isn't present, expose graceful no-op methods.
    return {
      open: () => {},
      close: () => {}
    };
  }

  /* Helpers */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function updateProgress(index) {
    // map 0..(n-1) to 0..100 where final index (n-1) => 100
    const n = questions.length;
    const denom = Math.max(1, (n - 1));
    const pct = Math.round((index / denom) * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
  }
  function showQuestion(index) {
    index = clamp(index, 0, questions.length - 1);
    currentIndex = index;
    questions.forEach((q, i) => {
      q.classList.toggle('active', i === index);
      // ensure display is restored if it was hidden by result state
      q.style.display = '';
    });
      // Add subheading for Question 1 only ---
  if (index === 0) {
    let sub = questions[0].querySelector('.subheading');
    if (!sub) {
      sub = document.createElement('p');
      sub.className = 'subheading';
      sub.textContent = "Every great wizard begins with a spark — tell us where yours lies.";
      questions[0].insertBefore(sub, questions[0].querySelector('h3')?.nextSibling || questions[0].firstChild);
    }
    sub.style.display = '';
  }
  else {
    // Hide/remove subheading for other questions
    const sub = questions[0].querySelector('.subheading');
    if (sub) sub.style.display = 'none';
  }
    // hide result which may have been shown previously
    if (resultContainer) resultContainer.style.display = 'none';
    updateProgress(index);
    // focus first input in the question for keyboard users
    const firstRadio = questions[index].querySelector('input[type="radio"]');
    if (firstRadio) firstRadio.focus();
  }

  function bindQuestionListeners() {
    // attach a single listener per form, use event delegation to avoid duplicates
    form.addEventListener('change', (ev) => {
      const target = ev.target;
      if (!target || target.type !== 'radio') return;
      // find the question index that contains this radio
      const qEl = target.closest('.q');
      const idx = questions.indexOf(qEl);
      if (idx === -1) return;
      // auto-advance: wait a hair for better UX (so the highlight / checked state shows)
      setTimeout(() => {
        if (idx < questions.length - 1) {
          showQuestion(idx + 1);
        } else {
          // last question answered
          computeAndShowResult();
        }
      }, 170); // ~170ms gives a small comfortable delay without feeling laggy
    });
  }

  function computeAndShowResult() {
    // collect selections in order
    const checked = Array.from(form.querySelectorAll('input[type="radio"]:checked')).map(i => i.value);
    // if user somehow didn't answer all questions, show what they have and still compute
    // compute tally
    const tally = checked.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
    // choose winner by count; tie-break deterministic by lexical order of keys (stable)
    const keys = Object.keys(tally);
    let winner = keys.length ? keys.reduce((a,b) => (tally[a] >= tally[b] ? a : b)) : 'web';
    // mapping to houses & labels (preserve your mapping)
    const pathToHouse = { web:'Ravenclaw', data:'Ravenclaw', sec:'Gryffindor', sys:'Slytherin', devops:'Slytherin', team:'Hufflepuff', iot:'Slytherin' };
    const pathLabelMap = {
      web:'Web Wizardry (Frontend & UX)',
      data:'Data Divination (AI & Data Science)',
      sec:'Cyber Charms (Cybersecurity)',
      sys:'Systems Sorcery (Systems & Infra)',
      devops:'Cloud Conjurors (DevOps & Infra)',
      team:'Software Guild (Engineering & Teamwork)',
      iot:'Hardware Hexes (IoT & Robotics)'
    };
    const house = pathToHouse[winner] || 'Ravenclaw';
    const label = pathLabelMap[winner] || 'Web Wizardry';

    // show result area (styled)
    if (resultContainer) {
      resultContainer.style.display = '';
      resultContainer.innerHTML = `
        <div class="result-card" role="status" aria-live="polite">
          <h3>Your House: <strong>${escapeHtml(house)}</strong></h3>
          <p class="result-path">Recommended Path: <em>${escapeHtml(label)}</em></p>
          <p class="result-choices">Selections: ${escapeHtml(checked.join(', ') || '—')}</p>
          <div class="result-actions">
            <button id="enter-site" class="btn primary">Enter</button>
            <button id="restart-quiz" class="btn ghost">Retake</button>
          </div>
        </div>
      `;
      updateProgress(questions.length - 1); // fill
      // hide questions (but keep display state restorable)
      questions.forEach(q => q.style.display = 'none');
      // persist
      localStorage.setItem('codecraft_profile', JSON.stringify({ house, path: winner, label }));
      // wire action buttons (enter + restart)
      $('#enter-site')?.addEventListener('click', () => {
        close();
        $('#main')?.scrollIntoView({ behavior: 'smooth' });
      });
      $('#restart-quiz')?.addEventListener('click', () => {
        restart();
      });
    }
  }

  function restart() {
    // reset UI & state
    document.querySelectorAll('#sorting-form input').forEach(i => i.checked = false);
    questions.forEach(q => { q.style.display = ''; q.classList.remove('active'); });
    currentIndex = 0;
    showQuestion(0);
    if (resultContainer) resultContainer.style.display = 'none';
  }

  function open() {
    if (isOpen) return;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    isOpen = true;
    // ensure the questions & progress are reset correctly
    restart();
    // trap focus briefly by focusing first radio
    const first = form.querySelector('input[type="radio"]');
    if (first) first.focus();
    // keyboard escape to close
    document.addEventListener('keydown', onKeyDown);
  }

  function close() {
    if (!isOpen) return;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    isOpen = false;
    // restore questions so they are visible again in case user reopens
    questions.forEach(q => { q.style.display = ''; q.classList.remove('active'); });
    resultContainer && (resultContainer.style.display = 'none');
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
  }

  // small HTML sanitizer for inserted text (defensive)
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  /* initialization */
  (function init() {
    // attach external controls
    startBtn?.addEventListener('click', () => { fadeInAudio(800); open(); });
    skipBtn?.addEventListener('click', () => { $('#main')?.scrollIntoView({ behavior: 'smooth' }); });
    closeBtn?.addEventListener('click', close);

    // click outside modal to close
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) close();
    });

    // bind radio change via delegation once
    bindQuestionListeners();

    // initial UI state
    updateProgress(0);
    questions.forEach(q => q.classList.remove('active'));
    questions[0]?.classList.add('active');

    // restore saved profile (optional UI use later)
    try {
      const saved = JSON.parse(localStorage.getItem('codecraft_profile') || 'null');
      if (saved && saved.house && saved.label) {
        // we keep it quiet, but it's available for resume downloads.
      }
    } catch (e) { /* ignore parse errors */ }
  })();

  // public API
  return {
    open,
    close,
    restart
  };
})();

/* ----------------------------------------------------------------------------------- */
/* Why CS?, Playground, Terminal, Quizzes, CTF, Resume, Cheat downloads, Nav & flips   */
/* ----------------------------------------------------------------------------------- */

/* Why CS */
function typeWriter(el, text) {
  let i = 0;
  el.textContent = ""; // clear before typing

  function type() {
    if (i <= text.length) {
      el.textContent = text.substring(0, i);
      i++;
      setTimeout(type, 70);
    }
  }

  type();
}

document.addEventListener("DOMContentLoaded", () => {
  const el = document.querySelector(".typewrite");
  if (!el) return;

  const text = JSON.parse(el.getAttribute("data-text"))[0];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        typeWriter(el, text);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(document.querySelector("#why-cs"));
});


// --- SPELLBOOK --- //
const spellCards = document.querySelectorAll('.spell-card');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

spellCards.forEach(card => observer.observe(card));

// Tap flip for mobile
spellCards.forEach(card => {
  card.addEventListener('click', () => {
    card.querySelector('.spell-inner').classList.toggle('active');
  });
});

// --- POTIONS LAB --- //
document.addEventListener('DOMContentLoaded', () => {
  const terminalOutput = document.getElementById('term-output');
  const runBtn = document.getElementById('term-run');
  const resetBtn = document.getElementById('term-reset');

  const potionSteps = [
    "> Adding mystical server base... 🧪",
    "> Mixing routes and endpoints... ✨",
    "> Adding magical data validation... 🔮",
    "> Containers are bubbling... 🐉",
    "> CI/CD pipeline activated... ⚡",
    "> Potion brewed successfully! 🍵"
  ];

  let isBrewing = false;

   // Typing effect function
  function typeLine(line, callback) {
    let index = 0;
    const speed = 25; // typing speed

    function type() {
      terminalOutput.textContent += line[index];
      index++;
      terminalOutput.scrollTop = terminalOutput.scrollHeight;

      if (index < line.length) {
        requestAnimationFrame(type);
      } else {
        terminalOutput.textContent += "\n";
        callback();
      }
    }
    type();
  }

  // Auto-run all steps in order
  function brewPotion() {
    let step = 0;
    isBrewing = true;
    runBtn.disabled = true;

    function nextStep() {
      if (step < potionSteps.length) {
        typeLine(potionSteps[step], () => {
          step++;
          setTimeout(nextStep, 350); // little magical pause
        });
      } else {
        isBrewing = false;
        runBtn.disabled = false;
      }
    }

    nextStep();
  }

  runBtn.addEventListener('click', () => {
    if (isBrewing) return;
    terminalOutput.textContent = "> Brewing potion... 🍯\n\n";
    brewPotion();
  });

  resetBtn.addEventListener('click', () => {
    terminalOutput.textContent = "> Welcome to the Potions Lab. Press Run to brew a potion...";
    isBrewing = false;
    runBtn.disabled = false;
  });
});

/* === DIVINATION === */
document.addEventListener('DOMContentLoaded', () => {
  // Orb insights
  const orbs = document.querySelectorAll('.orb');
  const insightBox = document.getElementById('orb-insight');

  orbs.forEach(orb => {
    orb.addEventListener('mouseenter', () => {
      insightBox.textContent = orb.dataset.insight;
    });
    orb.addEventListener('click', () => {
      insightBox.textContent = orb.dataset.insight;
    });
  });

  // Quiz logic
  const checkBtn = document.getElementById('dq-check');
  const result = document.getElementById('dq-result');

  checkBtn.addEventListener('click', () => {
    const selected = document.querySelector('input[name="dq"]:checked');
    if (!selected) {
      result.textContent = "Please select an answer!";
      result.style.color = "#ffcc00";
      return;
    }
    if (selected.value === 'f1') {
      result.textContent = "Correct! F1-score is best for imbalanced datasets.";
      result.style.color = "#00ff99";
    } else {
      result.textContent = "Not quite — try thinking about precision and recall balance.";
      result.style.color = "#ff5555";
    }
  });
});

/* === DEFENSE ===  */
document.addEventListener('DOMContentLoaded', () => {
  const ctfInput = document.getElementById('ctf-input');
  const ctfBtn = document.getElementById('ctf-check');
  const ctfResult = document.getElementById('ctf-result');

  // Predefined token (hidden in page source)
  const SECRET_TOKEN = 'witches2025';

  // Typing effect
  function typeWriter(element, text, speed = 40) {
    element.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;
      if(i >= text.length) clearInterval(interval);
    }, speed);
  }

  ctfBtn.addEventListener('click', () => {
    const answer = ctfInput.value.trim();

    if (!answer) return;

    if(answer === SECRET_TOKEN) {
      typeWriter(ctfResult, '> Correct! The firewall stands strong 🛡️');
    } else {
      typeWriter(ctfResult, '> Incorrect! Check your hints and try again 🔒');
    }

    ctfInput.value = '';
  });
});


/* === MINISTRY === */


/* Cheat pack download */
$('#download-cheats')?.addEventListener('click', () => {
  const cheats = `-- Codecraft Cheat Pack --\nHTML: semantic tags\nCSS: flexbox/grid cheats\nJS: common patterns\nAlgorithms: Big-O cheats\nSecurity: input validation checklist\n\n`;
  const blob = new Blob([cheats], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'codecraft_cheatpack.txt';
  a.click();
  URL.revokeObjectURL(a.href);
});

/* Mobile nav toggle */
const navToggle = $('.nav-toggle');
const navMenu = $('.main-nav ul');
navToggle?.addEventListener('click', () => navMenu.classList.toggle('active'));

/* Spellbook flip on click */
$$('.spell-card').forEach(card => card.addEventListener('click', () => card.classList.toggle('flipped')));

/* initial runs */
window.addEventListener('load', () => { $('#pg-reset')?.click(); });

/* End of main.js */
