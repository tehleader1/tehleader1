const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

let currentSessionId = localStorage.getItem("studioSessionId") || "";
let placements = [];
let isRecording = false;
const timelineDurationSec = 120;
let placementAudioFiles = [];
let lastRenderedMixBlob = null;
let lastRenderedMixName = "";
let selectedTimelineAudioId = 0;
let selectedPlacementId = 0;
let mediaRecorder = null;
let recordingChunks = [];
let recordingTick = null;
let currentRecordingPlacementId = 0;
let trackState = [
  { id: "mp3-1", type: "mp3", title: "MP3 Lane 1" },
  { id: "recorded-1", type: "recorded", title: "Recorded Lane 1" },
  { id: "instrument-1", type: "instrument", title: "Instrument Lane 1" }
];

function ensureTrack(type) {
  const existing = [...trackState].reverse().find((t) => t.type === type);
  if (existing) return existing.id;
  const count = trackState.filter((t) => t.type === type).length + 1;
  const lane = { id: `${type}-${count}`, type, title: `${type.charAt(0).toUpperCase() + type.slice(1)} Lane ${count}` };
  trackState.push(lane);
  return lane.id;
}

function addTrack(type) {
  const count = trackState.filter((t) => t.type === type).length + 1;
  trackState.push({ id: `${type}-${count}`, type, title: `${type.charAt(0).toUpperCase() + type.slice(1)} Lane ${count}` });
  renderPlacements();
}

function buildWaveMarkup(seedText = "", emphasis = 1) {
  const chars = String(seedText || "support");
  const bars = Array.from({ length: 24 }).map((_, idx) => {
    const code = chars.charCodeAt(idx % chars.length) || 80;
    const height = 18 + ((code + idx * 7) % 32) * emphasis;
    return `<span class="wave-bar" style="height:${Math.min(64, height)}%"></span>`;
  }).join("");
  return `<div class="timeline-waveform">${bars}</div>`;
}

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
  const tracksWrap = qs("#timelineTracks");
  const select = qs("#placementSelect");
  const status = qs("#placementStatus");
  if (!tracksWrap) return;
  const lanesHtml = trackState.map((track) => {
    const clips = placements
      .filter((p) => p.trackId === track.id)
      .map((p) => {
        const left = Math.max(0, Math.min(100, (p.timeSec / timelineDurationSec) * 100));
        const width = Math.max(10, Math.min(42, ((p.durationSec || 8) / timelineDurationSec) * 100));
        const label = p.audioName || `${p.kind.toUpperCase()} · ${p.wave.toUpperCase()}`;
        const selected = p.id === selectedPlacementId ? " selected" : "";
        return `<button class="timeline-clip ${p.kind}${selected}" type="button" data-placement-id="${p.id}" style="left:${left}%;width:${width}%;" title="${label}">
          ${buildWaveMarkup(label, p.live ? 1.4 : 1)}
          <span class="timeline-clip-label">${label}</span>
        </button>`;
      }).join("");
    return `<div class="timeline-track">
      <div class="timeline-track-head">
        <div class="timeline-track-title">${track.title}</div>
        <div class="timeline-track-type">${track.type.toUpperCase()}</div>
      </div>
      <div class="timeline-track-body">${clips}</div>
    </div>`;
  }).join("");
  tracksWrap.innerHTML = lanesHtml;
  qsa("#timelineTracks [data-placement-id]").forEach((node) => {
    node.addEventListener("click", () => {
      selectedPlacementId = Number(node.getAttribute("data-placement-id") || 0);
      if (select) select.value = String(selectedPlacementId);
      renderPlacements();
      if (status) status.textContent = `Placement #${selectedPlacementId} selected. Delete Selected will remove it.`;
    });
  });
  if (select) {
    select.innerHTML = placements.length
      ? placements.map((p) => `<option value="${p.id}">#${p.id} · ${p.kind.toUpperCase()} · ${p.wave.toUpperCase()} · ${p.timeSec.toFixed(1)}s${p.audioName ? " · " + p.audioName : ""}</option>`).join("")
      : "<option value=''>No placements</option>";
    if (selectedPlacementId) select.value = String(selectedPlacementId);
  }
  if (status) status.textContent = placements.length ? `${placements.length} placement(s) active.` : "No placements yet.";
}

function renderPlacementAudioOptions() {
  const bank = qs("#timelineClipBank");
  if (!bank) return;
  if (!placementAudioFiles.length) {
    selectedTimelineAudioId = 0;
    bank.innerHTML = "<button class=\"clip-chip empty\" type=\"button\">Import a track to begin</button>";
    return;
  }
  if (!placementAudioFiles.some((a) => a.id === selectedTimelineAudioId)) {
    selectedTimelineAudioId = placementAudioFiles[0].id;
  }
  bank.innerHTML = placementAudioFiles.map((a) => {
    const selected = a.id === selectedTimelineAudioId ? " selected" : "";
    return `<button class="clip-chip${selected}" type="button" data-audio-id="${a.id}">${a.name}</button>`;
  }).join("");
  qsa("#timelineClipBank [data-audio-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTimelineAudioId = Number(btn.dataset.audioId || 0);
      renderPlacementAudioOptions();
      const out = qs("#placementStatus");
      if (out) out.textContent = `Clip armed: ${btn.textContent}`;
    });
  });
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
  window.__studioRadio = {
    play,
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
      playBtn.textContent = "Play";
      status.textContent = "Stopped.";
    },
    pause: () => {
      audio.pause();
      playBtn.textContent = "Play";
      status.textContent = "Paused.";
    }
  };
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

function createPlacement(out, kind = "mp3") {
  const timeInput = qs("#placementTime");
  const waveInput = qs("#placementWave");
  const timeInput2 = qs("#timelinePlacementTime");
  const waveInput2 = qs("#timelinePlacementWave");
  if (timeInput && timeInput2 && timeInput2.value !== "") timeInput.value = timeInput2.value;
  if (waveInput && waveInput2 && waveInput2.value) waveInput.value = waveInput2.value;
  const timeSec = Math.max(0, Number(timeInput?.value || 0));
  const wave = String(waveInput?.value || "echo");
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const next = { id, timeSec, wave, kind, durationSec: kind === "recorded" ? 6 : kind === "instrument" ? 10 : 8 };
  next.trackId = ensureTrack(kind);
  const armedAudio = placementAudioFiles.find((a) => a.id === selectedTimelineAudioId);
  if (kind === "mp3" && armedAudio) {
    next.audioId = armedAudio.id;
    next.audioName = armedAudio.name;
    next.durationSec = armedAudio.durationSec || 8;
  }
  if (kind === "instrument") {
    next.audioName = "Instrument Layer";
  }
  if (kind === "recorded") {
    next.audioName = "Recorded Layer";
  }
  placements.push(next);
  renderPlacements();
  if (out) out.textContent = next.audioName
    ? `${kind.toUpperCase()} placement created · ${wave.toUpperCase()} @ ${timeSec.toFixed(1)}s · ${next.audioName}`
    : `${kind.toUpperCase()} placement created · ${wave.toUpperCase()} @ ${timeSec.toFixed(1)}s`;
  return next;
}

function deleteLastPlacement(out) {
  if (!placements.length) {
    if (out) out.textContent = "No placement to delete.";
    return;
  }
  const last = placements.pop();
  if (last?.id === selectedPlacementId) selectedPlacementId = 0;
  renderPlacements();
  if (out) out.textContent = `Deleted last placement #${last.id}.`;
}

function setupTransport() {
  const out = qs("#transportStatus");
  const createBtn = qs("#createPlacementBtn");
  const createMp3Btn = qs("#createMp3PlacementBtn");
  const createRecordedBtn = qs("#createRecordedPlacementBtn");
  const createInstrumentBtn = qs("#createInstrumentPlacementBtn");
  const deleteLastBtn = qs("#deleteLastPlacementBtn");
  const deleteSelectedBtn = qs("#deletePlacementBtn");
  const select = qs("#placementSelect");
  const audioUpload = qs("#placementAudioUpload");
  const attachAudioBtn = qs("#attachAudioToPlacementBtn");
  const recBtn = qs("#recordMainBtn");
  const timelineRecordBtn = qs("#timelineRecordBtn");
  const addMp3LaneBtn = qs("#addMp3LaneBtn");
  const addRecordedLaneBtn = qs("#addRecordedLaneBtn");
  const addInstrumentLaneBtn = qs("#addInstrumentLaneBtn");
  const timelineTime = qs("#timelinePlacementTime");
  const timelineWave = qs("#timelinePlacementWave");
  const placementTime = qs("#placementTime");
  const placementWave = qs("#placementWave");

  const syncInputs = () => {
    if (placementTime && timelineTime && timelineTime.value !== "") placementTime.value = timelineTime.value;
    if (placementWave && timelineWave && timelineWave.value) placementWave.value = timelineWave.value;
  };
  timelineTime?.addEventListener("input", syncInputs);
  timelineWave?.addEventListener("change", syncInputs);
  syncInputs();

  createBtn?.addEventListener("click", () => createPlacement(out, "mp3"));
  createMp3Btn?.addEventListener("click", () => createPlacement(out, "mp3"));
  createRecordedBtn?.addEventListener("click", () => createPlacement(out, "recorded"));
  createInstrumentBtn?.addEventListener("click", () => createPlacement(out, "instrument"));
  deleteLastBtn?.addEventListener("click", () => deleteLastPlacement(out));
  addMp3LaneBtn?.addEventListener("click", () => { addTrack("mp3"); out.textContent = "Added MP3 lane."; });
  addRecordedLaneBtn?.addEventListener("click", () => { addTrack("recorded"); out.textContent = "Added recorded lane."; });
  addInstrumentLaneBtn?.addEventListener("click", () => { addTrack("instrument"); out.textContent = "Added instrument lane."; });
  deleteSelectedBtn?.addEventListener("click", () => {
    const id = Number(select?.value || selectedPlacementId || 0);
    if (!id) return;
    placements = placements.filter((p) => p.id !== id);
    if (selectedPlacementId === id) selectedPlacementId = 0;
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
      placementAudioFiles.push({ id, name: file.name, url, type: file.type || "audio/*", durationSec: 8 });
      try {
        const probe = new Audio(url);
        probe.addEventListener("loadedmetadata", () => {
          const found = placementAudioFiles.find((a) => a.id === id);
          if (found && Number.isFinite(probe.duration) && probe.duration > 0) found.durationSec = probe.duration;
        }, { once: true });
      } catch {}
    });
    renderPlacementAudioOptions();
    renderPlacements();
    out.textContent = `${placementAudioFiles.length} audio file(s) ready for placement.`;
    audioUpload.value = "";
  });
  attachAudioBtn?.addEventListener("click", () => {
    const placementId = Number(select?.value || selectedPlacementId || 0);
    const audioId = Number(selectedTimelineAudioId || 0);
    if (!placementId || !audioId) {
      out.textContent = "Pick a placement and arm a clip from the imported track bank first.";
      return;
    }
    const audio = placementAudioFiles.find((a) => a.id === audioId);
    const idx = placements.findIndex((p) => p.id === placementId);
    if (!audio || idx < 0) return;
    placements[idx].audioId = audio.id;
    placements[idx].audioName = audio.name;
    placements[idx].durationSec = audio.durationSec || placements[idx].durationSec || 8;
    selectedPlacementId = placementId;
    renderPlacements();
    out.textContent = `Attached ${audio.name} to placement #${placementId}.`;
  });
  const stopRecordingVisuals = () => {
    isRecording = false;
    recBtn?.classList.toggle("is-recording", false);
    timelineRecordBtn?.classList.toggle("is-recording", false);
    if (recordingTick) {
      clearInterval(recordingTick);
      recordingTick = null;
    }
  };
  const stopRecording = async () => {
    if (!isRecording) return;
    stopRecordingVisuals();
    try {
      mediaRecorder?.stop();
    } catch {}
    out.textContent = "Recording saved to recorded lane.";
  };
  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) recordingChunks.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || "audio/webm" });
        const placement = placements.find((p) => p.id === currentRecordingPlacementId);
        if (placement) {
          const audioId = Date.now() + Math.floor(Math.random() * 1000);
          const url = URL.createObjectURL(blob);
          placementAudioFiles.push({
            id: audioId,
            name: `Recorded-${new Date().toISOString().slice(11,19).replace(/:/g,"-")}.webm`,
            url,
            type: blob.type || "audio/webm",
            durationSec: placement.durationSec || 6
          });
          placement.audioId = audioId;
          placement.audioName = "Recorded Layer";
          placement.live = false;
          renderPlacementAudioOptions();
          renderPlacements();
        }
        stream.getTracks().forEach((t) => t.stop());
        mediaRecorder = null;
        currentRecordingPlacementId = 0;
      };
      addTrack("recorded");
      const placement = createPlacement(out, "recorded");
      if (placement) {
        placement.trackId = ensureTrack("recorded");
        placement.live = true;
        placement.audioName = "Live Recording";
        placement.durationSec = 2;
        currentRecordingPlacementId = placement.id;
        renderPlacements();
      }
      mediaRecorder.start(250);
      isRecording = true;
      recBtn?.classList.toggle("is-recording", true);
      timelineRecordBtn?.classList.toggle("is-recording", true);
      recordingTick = setInterval(() => {
        const livePlacement = placements.find((p) => p.id === currentRecordingPlacementId);
        if (!livePlacement) return;
        livePlacement.durationSec = Math.min(30, (livePlacement.durationSec || 2) + 0.35);
        renderPlacements();
      }, 300);
      out.textContent = "Recording ON · live wave is growing on recorded lane.";
    } catch {
      out.textContent = "Recording needs microphone permission.";
    }
  };
  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }
    await startRecording();
  };
  recBtn?.addEventListener("click", toggleRecording);
  timelineRecordBtn?.addEventListener("click", toggleRecording);

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
        createPlacement(out, "mp3");
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
  qs("#studioJakeOrb")?.addEventListener("click", () => {
    const out = qs("#botStatus");
    if (out) out.textContent = "Pro Jake orb active. Booth focus locked on studio creation.";
  });
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
  qs("#exportFullMp3Btn")?.addEventListener("click", async () => {
    const out = qs("#mixExportStatus");
    try {
      if (!lastRenderedMixBlob) {
        const built = await buildConstructedMix();
        if (!built) return;
      }
      const mp3Name = (lastRenderedMixName || "supportrd-constructed-mix.wav").replace(/\.wav$/i, ".mp3");
      downloadBlob(lastRenderedMixBlob, mp3Name);
      if (out) out.textContent = `Exported MP3 button file: ${mp3Name} (wav-core mix).`;
    } catch {
      if (out) out.textContent = "Export MP3 failed.";
    }
  });
  applyStudioMicProfile();
});

window.addEventListener("message", (event) => {
  const data = event && event.data;
  if (!data || !data.type) return;
  if (data.type === "studio-enter") {
    applyStudioMicProfile();
    if (data.autoplay) {
      setTimeout(() => {
        try { window.__studioRadio?.play?.(); } catch {}
      }, 180);
    }
    return;
  }
  if (data.type === "studio-leave") {
    try { window.__studioRadio?.stop?.(); } catch {}
  }
});
