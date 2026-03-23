const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

let currentSessionId = localStorage.getItem("studioSessionId") || "";
let placements = [];
let isRecording = false;
const timelineDurationSec = 120;

async function loadPlan() {
  const badge = qs("#planBadge");
  try {
    const r = await fetch("/api/studio/plan");
    const d = await r.json();
    if (!d || !d.ok) throw new Error("plan_error");
    badge.textContent = `Plan: ${d.tier} · Public Beta`;
    qs("#techBotBtn").disabled = d.tier !== "pro500";
  } catch {
    badge.textContent = "Plan: free · Public Beta";
  }
}

async function loadExtensions() {
  const list = qs("#extList");
  if (!list) return;
  try {
    const r = await fetch("/studioaria/extensions");
    const d = await r.json();
    if (!(d && d.ok && Array.isArray(d.formats))) throw new Error("ext_error");
    list.innerHTML = d.formats.map((f) => `<li>.${f}</li>`).join("");
  } catch {
    list.innerHTML = "<li>mp4</li><li>m4a</li><li>wav</li><li>mp3</li>";
  }
}

function playIntroVoice() {
  const line = "Introducing SupportRD Studio. This will get the job done, even if you are throwing a dembow party or just an occasional get together.";
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(line);
    u.rate = 0.95;
    u.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return;
  }
  alert(line);
}

function renderPlacements() {
  const timeline = qs("#timeline");
  const select = qs("#placementSelect");
  const status = qs("#placementStatus");
  if (!timeline) return;
  qsa("#timeline .marker").forEach((n) => n.remove());
  placements.forEach((p) => {
    const marker = document.createElement("div");
    marker.className = "marker";
    marker.style.left = `${Math.max(0, Math.min(100, (p.timeSec / timelineDurationSec) * 100))}%`;
    marker.title = `${p.wave.toUpperCase()} @ ${p.timeSec.toFixed(1)}s`;
    timeline.appendChild(marker);
  });
  if (select) {
    select.innerHTML = placements.length
      ? placements.map((p) => `<option value="${p.id}">#${p.id} · ${p.wave.toUpperCase()} · ${p.timeSec.toFixed(1)}s</option>`).join("")
      : "<option value=''>No placements</option>";
  }
  if (status) status.textContent = placements.length ? `${placements.length} placement(s) active.` : "No placements yet.";
}

function createPlacement(out) {
  const timeInput = qs("#placementTime");
  const waveInput = qs("#placementWave");
  const timeSec = Math.max(0, Number(timeInput?.value || 0));
  const wave = String(waveInput?.value || "echo");
  const id = Date.now() + Math.floor(Math.random() * 1000);
  placements.push({ id, timeSec, wave });
  renderPlacements();
  if (out) out.textContent = `Placement created · ${wave.toUpperCase()} @ ${timeSec.toFixed(1)}s`;
}

function deleteLastPlacement(out) {
  if (!placements.length) {
    if (out) out.textContent = "No placement to delete.";
    return;
  }
  const last = placements.pop();
  renderPlacements();
  if (out) out.textContent = `Deleted last placement #${last.id}.`;
}

function setupTransport() {
  const out = qs("#transportStatus");
  const createBtn = qs("#createPlacementBtn");
  const deleteLastBtn = qs("#deleteLastPlacementBtn");
  const deleteSelectedBtn = qs("#deletePlacementBtn");
  const select = qs("#placementSelect");
  const recBtn = qs("#recordMainBtn");

  createBtn?.addEventListener("click", () => createPlacement(out));
  deleteLastBtn?.addEventListener("click", () => deleteLastPlacement(out));
  deleteSelectedBtn?.addEventListener("click", () => {
    const id = Number(select?.value || 0);
    if (!id) return;
    placements = placements.filter((p) => p.id !== id);
    renderPlacements();
    out.textContent = `Deleted placement #${id}.`;
  });
  recBtn?.addEventListener("click", () => {
    isRecording = !isRecording;
    recBtn.classList.toggle("is-recording", isRecording);
    out.textContent = isRecording ? "Recording ON · red dot active." : "Recording OFF.";
  });

  renderPlacements();
  qsa("[data-transport]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.transport;
      if (cmd === "back") {
        deleteLastPlacement(out);
        return;
      }
      if (cmd === "placeonce") {
        createPlacement(out);
        out.textContent = `${out.textContent} · place once ready.`;
        return;
      }
      out.textContent = `Transport: ${cmd}`;
    });
  });
}

function setupFx() {
  const ids = ["fxReverb", "fxEcho", "fxBass", "fxSlow", "fxSpeed", "fxRewind"];
  const out = qs("#fxStatus");
  ids.forEach((id) => {
    const el = qs(`#${id}`);
    if (!el) return;
    el.addEventListener("input", () => {
      out.textContent = `FX updated · Reverb ${qs("#fxReverb").value}% · Echo ${qs("#fxEcho").value}% · Bass ${qs("#fxBass").value}%`;
    });
  });
}

function setupFxBoard() {
  const power = qs("#fxBoardPower");
  const input = qs("#fxBoardInput");
  const glue = qs("#fxBoardGlue");
  const meter = qs("#fxBoardMeter");
  const out = qs("#fxBoardStatus");
  if (!power || !input || !glue || !meter || !out) return;
  let t = 0;
  let raf = 0;
  const render = () => {
    t += 0.08;
    const level = power.value === "off" ? 2 : Math.max(8, Math.min(100, (Number(glue.value) * 0.72) + (Math.sin(t) * 18 + 20)));
    meter.style.width = `${level}%`;
    meter.style.opacity = power.value === "standby" ? "0.55" : "1";
    raf = requestAnimationFrame(render);
  };
  const update = () => {
    out.textContent = `FX board ${power.value.toUpperCase()} · ${input.value.toUpperCase()} · Master Glue ${glue.value}%`;
  };
  [power, input, glue].forEach((el) => el.addEventListener("input", update));
  update();
  cancelAnimationFrame(raf);
  render();
}

async function runEchoPlacement() {
  const t = (qs("#echoTranscript")?.value || "").trim();
  const results = qs("#echoResults");
  results.innerHTML = "";
  try {
    const r = await fetch("/api/studio/echo/place", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ transcript: t, duration_sec: 75, style: "auto" }),
    });
    const d = await r.json();
    if (!(d && d.ok && Array.isArray(d.suggestions))) throw new Error("echo_error");
    d.suggestions.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = `${s.mode.toUpperCase()} @ ${s.time_sec}s · feedback ${s.feedback} · mix ${s.mix}`;
      results.appendChild(li);
    });
  } catch {
    results.innerHTML = "<li>Echo suggestions unavailable.</li>";
  }
}

async function saveSession() {
  const payload = {
    lyrics: qs("#lyricsInput")?.value || "",
    fx: {
      reverb: Number(qs("#fxReverb")?.value || 0),
      echo: Number(qs("#fxEcho")?.value || 0),
      bass: Number(qs("#fxBass")?.value || 0),
    },
    placements,
    updated_at: new Date().toISOString(),
  };
  const out = qs("#lyricsStatus");
  try {
    const r = await fetch("/api/studio/session/save", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ session_id: currentSessionId, payload }),
    });
    const d = await r.json();
    if (!(d && d.ok)) throw new Error("save_error");
    currentSessionId = d.session_id;
    localStorage.setItem("studioSessionId", currentSessionId);
    out.textContent = `Saved: ${currentSessionId}`;
  } catch {
    out.textContent = "Save failed.";
  }
}

async function loadSession() {
  const out = qs("#lyricsStatus");
  if (!currentSessionId) {
    out.textContent = "No session id yet.";
    return;
  }
  try {
    const r = await fetch(`/api/studio/session/load?session_id=${encodeURIComponent(currentSessionId)}`);
    const d = await r.json();
    if (!(d && d.ok && d.payload)) throw new Error("load_error");
    qs("#lyricsInput").value = d.payload.lyrics || "";
    placements = Array.isArray(d.payload.placements) ? d.payload.placements : [];
    renderPlacements();
    out.textContent = `Loaded: ${currentSessionId}`;
  } catch {
    out.textContent = "Load failed.";
  }
}

function setupBots() {
  const out = qs("#botStatus");
  qs("#editBotBtn")?.addEventListener("click", () => {
    out.textContent = "Edit Bot: tighten your hook entry by 120ms and double the ad-lib tail.";
  });
  qs("#techBotBtn")?.addEventListener("click", () => {
    out.textContent = "Technical Bot: set input gain -12dB peak, monitor latency under 8ms.";
  });
}

function setupRecordingMath() {
  const ids = ["mathSampleRate", "mathBufferSize", "mathSampleIndex", "mathTargetSeconds"];
  const out = qs("#mathOutput");
  if (!out) return;
  const calc = () => {
    const sr = Math.max(1, Number(qs("#mathSampleRate")?.value || 48000));
    const buf = Math.max(1, Number(qs("#mathBufferSize")?.value || 512));
    const idx = Math.max(0, Number(qs("#mathSampleIndex")?.value || 0));
    const tgtSec = Math.max(0, Number(qs("#mathTargetSeconds")?.value || 0));
    const currentSec = idx / sr;
    const targetSamples = tgtSec * sr;
    const bufferMs = (buf / sr) * 1000;
    const framesPerSec = sr / buf;
    out.textContent =
      `currentSec = ${idx} / ${sr} = ${currentSec.toFixed(6)}s · ` +
      `targetSamples = ${sr} x ${tgtSec.toFixed(3)} = ${Math.round(targetSamples)} samples · ` +
      `bufferDuration = (${buf}/${sr}) x 1000 = ${bufferMs.toFixed(3)}ms · ` +
      `framesPerSecond = ${framesPerSec.toFixed(3)}`;
  };
  ids.forEach((id) => qs(`#${id}`)?.addEventListener("input", calc));
  calc();
}

window.addEventListener("DOMContentLoaded", () => {
  loadPlan();
  loadExtensions();
  setupTransport();
  setupFx();
  setupFxBoard();
  setupBots();
  setupRecordingMath();
  qs("#voiceIntroBtn")?.addEventListener("click", playIntroVoice);
  qs("#backMainBtn")?.addEventListener("click", () => {
    if (window.parent && window.parent !== window && typeof window.parent.closeStudioMode === "function") {
      window.parent.closeStudioMode();
      return;
    }
    window.location.href = "/";
  });
  qs("#runEchoPlacementBtn")?.addEventListener("click", runEchoPlacement);
  qs("#saveSessionBtn")?.addEventListener("click", saveSession);
  qs("#loadSessionBtn")?.addEventListener("click", loadSession);
});
