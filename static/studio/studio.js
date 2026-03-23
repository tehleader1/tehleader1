const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

let currentSessionId = localStorage.getItem("studioSessionId") || "";
let placements = [];
let isRecording = false;
const timelineDurationSec = 120;
let placementAudioFiles = [];
let lastRenderedMixBlob = null;
let lastRenderedMixName = "";

async function applyStudioMicProfile() {
  const out = qs("#transportStatus");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (out) out.textContent = "Studio mic profile: browser mic API unavailable.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      }
    });
    stream.getTracks().forEach((t) => t.stop());
    localStorage.setItem("studio_mic_profile", "audiology-fast");
    if (out) out.textContent = "Studio mic profile applied (audiology-fast).";
  } catch {
    if (out) out.textContent = "Studio mic profile pending: allow microphone permission.";
  }
}

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
      ? placements.map((p) => `<option value="${p.id}">#${p.id} · ${p.wave.toUpperCase()} · ${p.timeSec.toFixed(1)}s${p.audioName ? " · " + p.audioName : ""}</option>`).join("")
      : "<option value=''>No placements</option>";
  }
  if (status) status.textContent = placements.length ? `${placements.length} placement(s) active.` : "No placements yet.";
}

function renderPlacementAudioOptions() {
  const audioSelect = qs("#placementAudioSelect");
  if (!audioSelect) return;
  audioSelect.innerHTML = placementAudioFiles.length
    ? placementAudioFiles.map((a) => `<option value="${a.id}">${a.name}</option>`).join("")
    : "<option value=''>No audio uploaded</option>";
}

function audioBufferToWavBlob(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const samples = buffer.length;
  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const wavSize = 44 + dataSize;
  const ab = new ArrayBuffer(wavSize);
  const view = new DataView(ab);

  let offset = 0;
  const writeString = (s) => { for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i)); offset += s.length; };
  const writeUint32 = (v) => { view.setUint32(offset, v, true); offset += 4; };
  const writeUint16 = (v) => { view.setUint16(offset, v, true); offset += 2; };

  writeString("RIFF");
  writeUint32(wavSize - 8);
  writeString("WAVE");
  writeString("fmt ");
  writeUint32(16);
  writeUint16(format);
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(bitDepth);
  writeString("data");
  writeUint32(dataSize);

  const channels = [];
  for (let c = 0; c < numChannels; c += 1) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < samples; i += 1) {
    for (let c = 0; c < numChannels; c += 1) {
      const sample = Math.max(-1, Math.min(1, channels[c][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

function setupStudioRadio() {
  const prevBtn = qs("#studioRadioPrev");
  const playBtn = qs("#studioRadioPlay");
  const stopBtn = qs("#studioRadioStop");
  const nextBtn = qs("#studioRadioNext");
  const track = qs("#studioRadioTrack");
  const status = qs("#studioRadioStatus");
  if (!prevBtn || !playBtn || !stopBtn || !nextBtn || !track || !status) return;

  const playlist = [{ title: "Clout - AgentAnthony.wav", src: "/static/audio/clout-agentanthony.wav" }];
  let idx = 0;
  const audio = new Audio();
  audio.preload = "auto";
  const load = (i) => {
    idx = (i + playlist.length) % playlist.length;
    audio.src = playlist[idx].src;
    track.textContent = `Track: ${playlist[idx].title}`;
    status.textContent = "Ready.";
  };
  const play = async () => {
    try {
      if (!audio.src) load(idx);
      await audio.play();
      playBtn.textContent = "Pause";
      status.textContent = `Now playing: ${playlist[idx].title}`;
    } catch {
      status.textContent = "Tap Play to allow audio.";
    }
  };
  playBtn.addEventListener("click", async () => {
    if (audio.paused) await play();
    else {
      audio.pause();
      playBtn.textContent = "Play";
      status.textContent = "Paused.";
    }
  });
  stopBtn.addEventListener("click", () => {
    audio.pause();
    audio.currentTime = 0;
    playBtn.textContent = "Play";
    status.textContent = "Stopped.";
  });
  prevBtn.addEventListener("click", async () => { load(idx - 1); await play(); });
  nextBtn.addEventListener("click", async () => { load(idx + 1); await play(); });
  audio.addEventListener("ended", async () => { await play(); });
  load(0);
  setTimeout(() => { play(); }, 180);
}

async function buildConstructedMix() {
  const out = qs("#mixExportStatus");
  const active = placements.filter((p) => p.audioId && Number.isFinite(Number(p.timeSec)));
  if (!active.length) {
    if (out) out.textContent = "No placements with attached audio found.";
    return null;
  }
  if (out) out.textContent = "Building full mix...";

  const sourceCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decodedById = new Map();

  try {
    for (const p of active) {
      const audio = placementAudioFiles.find((a) => a.id === p.audioId);
      if (!audio) continue;
      if (decodedById.has(audio.id)) continue;
      const arr = await fetch(audio.url).then((r) => r.arrayBuffer());
      const decoded = await sourceCtx.decodeAudioData(arr.slice(0));
      decodedById.set(audio.id, decoded);
    }
  } finally {
    sourceCtx.close();
  }

  if (!decodedById.size) {
    if (out) out.textContent = "No decodable audio found for placements.";
    return null;
  }

  let durationSec = 0;
  active.forEach((p) => {
    const b = decodedById.get(p.audioId);
    if (!b) return;
    durationSec = Math.max(durationSec, Number(p.timeSec) + b.duration + 0.25);
  });
  durationSec = Math.max(1, durationSec);

  const sampleRate = 44100;
  const offline = new OfflineAudioContext(2, Math.ceil(durationSec * sampleRate), sampleRate);

  active.forEach((p) => {
    const b = decodedById.get(p.audioId);
    if (!b) return;
    const src = offline.createBufferSource();
    src.buffer = b;
    const gain = offline.createGain();
    const baseGain = 0.9 + (Number(qs("#fxBass")?.value || 0) / 100) * 0.1;
    gain.gain.value = Math.max(0.1, Math.min(1.2, baseGain));
    src.connect(gain);
    gain.connect(offline.destination);
    src.start(Math.max(0, Number(p.timeSec)));
  });

  const rendered = await offline.startRendering();
  const blob = audioBufferToWavBlob(rendered);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `supportrd-constructed-mix-${stamp}.wav`;
  lastRenderedMixBlob = blob;
  lastRenderedMixName = fileName;
  if (out) out.textContent = `Mix ready: ${fileName}`;
  return { blob, fileName };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
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
  const audioUpload = qs("#placementAudioUpload");
  const audioSelect = qs("#placementAudioSelect");
  const attachAudioBtn = qs("#attachAudioToPlacementBtn");
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
  audioUpload?.addEventListener("change", () => {
    const files = Array.from(audioUpload.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const name = String(file.name || "").toLowerCase();
      const ok = name.endsWith(".mp3") || name.endsWith(".m4a") || (file.type || "").startsWith("audio/");
      if (!ok) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const url = URL.createObjectURL(file);
      placementAudioFiles.push({ id, name: file.name, url, type: file.type || "audio/*" });
    });
    renderPlacementAudioOptions();
    out.textContent = `${placementAudioFiles.length} audio file(s) ready for placement.`;
    audioUpload.value = "";
  });
  attachAudioBtn?.addEventListener("click", () => {
    const placementId = Number(select?.value || 0);
    const audioId = Number(audioSelect?.value || 0);
    if (!placementId || !audioId) {
      out.textContent = "Pick a placement and an uploaded MP3/M4A first.";
      return;
    }
    const audio = placementAudioFiles.find((a) => a.id === audioId);
    const idx = placements.findIndex((p) => p.id === placementId);
    if (!audio || idx < 0) return;
    placements[idx].audioId = audio.id;
    placements[idx].audioName = audio.name;
    renderPlacements();
    out.textContent = `Attached ${audio.name} to placement #${placementId}.`;
  });
  recBtn?.addEventListener("click", () => {
    isRecording = !isRecording;
    recBtn.classList.toggle("is-recording", isRecording);
    out.textContent = isRecording ? "Recording ON · red dot active." : "Recording OFF.";
  });

  renderPlacements();
  renderPlacementAudioOptions();
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
    placementAudioFiles = [];
    renderPlacementAudioOptions();
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
  setupStudioRadio();
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
  qs("#buildMixBtn")?.addEventListener("click", async () => {
    try {
      await buildConstructedMix();
    } catch {
      const out = qs("#mixExportStatus");
      if (out) out.textContent = "Mix build failed. Check attached audio files.";
    }
  });
  qs("#exportMixBtn")?.addEventListener("click", async () => {
    const out = qs("#mixExportStatus");
    try {
      if (!lastRenderedMixBlob) {
        const built = await buildConstructedMix();
        if (!built) return;
      }
      downloadBlob(lastRenderedMixBlob, lastRenderedMixName || "supportrd-constructed-mix.wav");
      if (out) out.textContent = `Exported: ${lastRenderedMixName || "supportrd-constructed-mix.wav"}`;
    } catch {
      if (out) out.textContent = "Export failed.";
    }
  });
  applyStudioMicProfile();
});

window.addEventListener("message", (event) => {
  const data = event && event.data;
  if (!data || data.type !== "studio-enter") return;
  applyStudioMicProfile();
});
