const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

let currentSessionId = localStorage.getItem("studioSessionId") || "";
let placements = [];
let placementAudioFiles = [];
let trackState = [
  { id: "mp3-1", type: "mp3", title: "MP3 Motherboard 1" },
  { id: "recorded-1", type: "recorded", title: "Recorded Motherboard 1" },
  { id: "instrument-1", type: "instrument", title: "Instrument Motherboard 1" }
];
let selectedTimelineAudioId = 0;
let selectedPlacementId = 0;
let isRecording = false;
let mediaRecorder = null;
let recordingChunks = [];
let recordingTick = null;
let currentRecordingPlacementId = 0;
let currentMicStream = null;
let currentAudioContext = null;
let currentAnalyser = null;
let currentWaveProbe = null;
let mixHistory = [];
let deletedSnapshots = [];
let lastRenderedMixBlob = null;
let lastRenderedMixName = "";
let currentTheme = 0;
const THEMES = ["", "theme-signal", "theme-ember"];
const timelineDurationSec = 120;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setStatus(id, message) {
  const el = qs(id);
  if (el) el.textContent = message;
}

function summarizePlacement(p) {
  return `${p.kind.toUpperCase()} ${p.audioName || p.wave} @ ${Number(p.timeSec || 0).toFixed(1)}s`;
}

function pushUndoSnapshot(action) {
  mixHistory.unshift({
    action,
    at: new Date().toLocaleTimeString(),
    placements: deepClone(placements),
    trackState: deepClone(trackState),
    placementAudioFiles: deepClone(placementAudioFiles),
    selectedTimelineAudioId,
    selectedPlacementId
  });
  mixHistory = mixHistory.slice(0, 20);
  renderUndoHistory();
}

function restoreSnapshot(snapshot, label) {
  if (!snapshot) return;
  placements = deepClone(snapshot.placements || []);
  trackState = deepClone(snapshot.trackState || []);
  placementAudioFiles = deepClone(snapshot.placementAudioFiles || []);
  selectedTimelineAudioId = snapshot.selectedTimelineAudioId || 0;
  selectedPlacementId = snapshot.selectedPlacementId || 0;
  renderPlacementAudioOptions();
  renderPlacements();
  renderProfileStats();
  renderUndoHistory();
  setStatus("#motherboardStatus", label);
  setStatus("#placementStatus", label);
}

function undoLastAction() {
  const snapshot = mixHistory.shift();
  if (!snapshot) {
    setStatus("#motherboardStatus", "Undo is clear right now.");
    return;
  }
  deletedSnapshots.unshift(snapshot);
  restoreSnapshot(snapshot, `Undo complete: ${snapshot.action}.`);
}

function restoreDeletedAction() {
  const snapshot = deletedSnapshots.shift();
  if (!snapshot) {
    setStatus("#motherboardStatus", "Nothing is waiting in restore.");
    return;
  }
  restoreSnapshot(snapshot, `Restored: ${snapshot.action}.`);
}

function generateWaveData(seedText = "SupportRD", length = 48, mode = "steady", amplitude = 1) {
  const seed = String(seedText || "SupportRD");
  const data = [];
  for (let i = 0; i < length; i += 1) {
    const code = seed.charCodeAt(i % seed.length) || 80;
    let value = 18 + ((code + i * 11) % 52);
    if (mode === "live") value = 24 + ((code + i * 9) % 60);
    if (mode === "instrument") value = 16 + ((code + i * 15) % 64);
    if (mode === "soft") value = 10 + ((code + i * 5) % 34);
    data.push(Math.max(10, Math.min(96, Math.round(value * amplitude))));
  }
  return data;
}

function buildWaveMarkup(waveData = []) {
  const bars = (waveData.length ? waveData : generateWaveData())
    .map((height) => `<span class="wave-bar" style="height:${height}%"></span>`)
    .join("");
  return `<div class="timeline-waveform">${bars}</div>`;
}

function updateDbQuickLabel() {
  const db = Number(qs("#dbQuick")?.value || 0);
  setStatus("#motherboardStatus", `dB quick access is ${db >= 0 ? "+" : ""}${db} dB. FX board stays centered and export-ready.`);
}

function ensureTrack(type) {
  const existing = [...trackState].reverse().find((track) => track.type === type);
  if (existing) return existing.id;
  return addTrack(type, false).id;
}

function addTrack(type = "recorded", snapshot = true) {
  if (snapshot) pushUndoSnapshot(`Add ${type} motherboard`);
  const count = trackState.filter((t) => t.type === type).length + 1;
  const track = {
    id: `${type}-${count}`,
    type,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Motherboard ${count}`
  };
  trackState.push(track);
  renderPlacements();
  renderProfileStats();
  setStatus("#placementStatus", `${track.title} added.`);
  return track;
}

function removePlacement(id) {
  const idx = placements.findIndex((p) => p.id === id);
  if (idx < 0) return;
  pushUndoSnapshot(`Delete ${summarizePlacement(placements[idx])}`);
  placements.splice(idx, 1);
  if (selectedPlacementId === id) selectedPlacementId = 0;
  renderPlacements();
  renderProfileStats();
  setStatus("#placementStatus", `Deleted placement #${id}.`);
}

function createPlacement(kind = "mp3", options = {}) {
  pushUndoSnapshot(`Create ${kind} placement`);
  const time = Number(options.timeSec ?? qs("#timelinePlacementTime")?.value ?? qs("#placementTime")?.value ?? 0);
  const wave = String(options.wave ?? qs("#timelinePlacementWave")?.value ?? qs("#placementWave")?.value ?? "echo");
  const audio = options.audio || placementAudioFiles.find((item) => item.id === selectedTimelineAudioId) || null;
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const placement = {
    id,
    kind,
    timeSec: Math.max(0, time),
    wave,
    audioId: audio?.id || 0,
    audioName: options.audioName || audio?.name || (kind === "recorded" ? "Recorded Lane" : kind === "instrument" ? "Instrument Lane" : "MP3 Layer"),
    durationSec: Math.max(3, Number(options.durationSec || audio?.durationSec || (kind === "recorded" ? 6 : kind === "instrument" ? 9 : 8))),
    trackId: options.trackId || ensureTrack(kind),
    waveData: options.waveData || generateWaveData(options.audioName || audio?.name || kind, kind === "recorded" ? 56 : 48, kind === "instrument" ? "instrument" : "steady", kind === "recorded" ? 0.92 : 1),
    live: Boolean(options.live)
  };
  placements.push(placement);
  selectedPlacementId = id;
  renderPlacements();
  renderProfileStats();
  setStatus("#placementStatus", `${kind.toUpperCase()} placement added on ${placement.trackId}.`);
  return placement;
}

function renderPlacementAudioOptions() {
  const bank = qs("#timelineClipBank");
  if (!bank) return;
  if (!placementAudioFiles.length) {
    selectedTimelineAudioId = 0;
    bank.innerHTML = '<button class="clip-chip empty" type="button">Import a track to begin</button>';
    return;
  }
  if (!placementAudioFiles.some((item) => item.id === selectedTimelineAudioId)) {
    selectedTimelineAudioId = placementAudioFiles[0].id;
  }
  bank.innerHTML = placementAudioFiles.map((item) => {
    const selected = item.id === selectedTimelineAudioId ? " selected" : "";
    const label = `${item.name}${item.durationSec ? ` · ${item.durationSec.toFixed(1)}s` : ""}`;
    return `<button class="clip-chip${selected}" type="button" data-audio-id="${item.id}">${label}</button>`;
  }).join("");
  qsa("#timelineClipBank [data-audio-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTimelineAudioId = Number(btn.getAttribute("data-audio-id") || 0);
      renderPlacementAudioOptions();
      const clip = placementAudioFiles.find((item) => item.id === selectedTimelineAudioId);
      setStatus("#placementStatus", clip ? `Clip armed: ${clip.name}` : "Clip armed.");
    });
  });
}

function renderPlacements() {
  const wrap = qs("#timelineTracks");
  const select = qs("#placementSelect");
  if (!wrap) return;
  const collapseMode = qs("#boardCollapseMode")?.value || "3";
  const visibleCount = collapseMode === "all" ? Number.MAX_SAFE_INTEGER : Math.max(1, Number(collapseMode));
  wrap.innerHTML = trackState.map((track, index) => {
    const hiddenClass = index >= visibleCount ? " hidden-track" : "";
    const clips = placements.filter((placement) => placement.trackId === track.id).map((placement) => {
      const left = Math.max(0, Math.min(92, (placement.timeSec / timelineDurationSec) * 100));
      const width = Math.max(16, Math.min(84, ((placement.durationSec || 6) / timelineDurationSec) * 100));
      const selected = placement.id === selectedPlacementId ? " selected" : "";
      const waveData = Array.isArray(placement.waveData) ? placement.waveData : generateWaveData(placement.audioName || placement.wave);
      return `<button class="timeline-clip ${placement.kind}${selected}" type="button" data-placement-id="${placement.id}" style="left:${left}%;width:${width}%;">
        ${buildWaveMarkup(waveData)}
        <span class="timeline-clip-label"><span class="clip-name">${placement.audioName || placement.wave}</span><span class="clip-meta">${placement.durationSec.toFixed(1)}s</span></span>
      </button>`;
    }).join("");
    return `<div class="timeline-track${hiddenClass}" data-track-id="${track.id}">
      <div class="timeline-track-head">
        <div class="timeline-track-title">${track.title}</div>
        <div class="timeline-track-type">${track.type.toUpperCase()}</div>
      </div>
      <div class="timeline-track-body">${clips || '<div class="timeline-empty">This motherboard is ready for clips, live recording, or instruments.</div>'}</div>
    </div>`;
  }).join("");

  qsa("#timelineTracks [data-placement-id]").forEach((node) => {
    node.addEventListener("click", () => {
      selectedPlacementId = Number(node.getAttribute("data-placement-id") || 0);
      if (select) select.value = String(selectedPlacementId);
      renderPlacements();
      const placement = placements.find((item) => item.id === selectedPlacementId);
      setStatus("#placementStatus", placement ? `Selected: ${summarizePlacement(placement)}.` : "Placement selected.");
    });
  });

  if (select) {
    select.innerHTML = placements.length
      ? placements.map((placement) => `<option value="${placement.id}">#${placement.id} · ${placement.kind.toUpperCase()} · ${placement.audioName || placement.wave}</option>`).join("")
      : "<option value=''>No placements</option>";
    if (selectedPlacementId) select.value = String(selectedPlacementId);
  }
}

function renderUndoHistory() {
  const history = qs("#undoHistory");
  if (!history) return;
  if (!mixHistory.length && !deletedSnapshots.length) {
    history.innerHTML = "No previous board changes yet.";
    return;
  }
  history.innerHTML = [
    ...mixHistory.slice(0, 6).map((item) => `<div class="undo-item"><strong>Undo Ready:</strong> ${item.action} <div>${item.at}</div></div>`),
    ...deletedSnapshots.slice(0, 3).map((item) => `<div class="undo-item"><strong>Restore Ready:</strong> ${item.action} <div>${item.at}</div></div>`)
  ].join("");
}

function renderProfileStats() {
  const el = qs("#profileStats");
  if (!el) return;
  const songs = placementAudioFiles.length;
  const laneCount = trackState.length;
  const reverb = Number(qs("#fxReverb")?.value || 0);
  const rapTitle = songs >= 8 ? "Spit bars Super Star level" : songs >= 4 ? "Spit bars making 100k youtube monthly views" : "Spit bars on just mixtape level";
  const overlayTitle = laneCount >= 8 ? "Gets Jiggy With It" : laneCount >= 5 ? "Approve Boat" : "Decipher the Menu";
  const reverbRank = reverb >= 80 ? "Reverb Making money" : reverb >= 55 ? "Reverb Pro" : reverb >= 30 ? "Reverb Grunt" : "Reverb Newb";
  el.innerHTML = `
    <div class="profile-stat"><strong>${songs}</strong>Successfully created songs</div>
    <div class="profile-stat"><strong>${laneCount}</strong>Motherboards active</div>
    <div class="profile-stat"><strong>${reverbRank}</strong>Reverb achievement</div>
    <div class="profile-stat"><strong>${rapTitle}</strong>Rap path</div>
    <div class="profile-stat"><strong>${overlayTitle}</strong>Overlay achievement</div>
    <div class="profile-stat"><strong>${placements.filter((p) => p.kind === "instrument").length}</strong>Instrument logs captured</div>
  `;
}

async function applyStudioMicProfile() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      }
    });
    stream.getTracks().forEach((track) => track.stop());
    localStorage.setItem("studio_mic_profile", "normal");
    setStatus("#transportStatus", "Normal voice pickup is active by default.");
  } catch {
    setStatus("#transportStatus", "Mic profile is ready once microphone permission is allowed.");
  }
}
async function loadPlan() {
  const badge = qs("#planBadge");
  try {
    const response = await fetch("/api/studio/plan");
    const data = await response.json();
    if (!(data && data.ok)) throw new Error("plan_error");
    badge.textContent = `Plan: ${data.tier} · Public Beta`;
  } catch {
    badge.textContent = "Plan: free · Public Beta";
  }
}

async function loadExtensions() {
  const list = qs("#extList");
  if (!list) return;
  try {
    const response = await fetch("/studioaria/extensions");
    const data = await response.json();
    if (!(data && data.ok && Array.isArray(data.formats))) throw new Error("ext_error");
    list.innerHTML = data.formats.map((item) => `<li>.${item}</li>`).join("");
  } catch {
    list.innerHTML = "<li>.mp3</li><li>.m4a</li><li>.wav</li><li>.mp4</li><li>.jpeg</li><li>.png</li><li>.pdf</li>";
  }
}

function playIntroVoice() {
  const line = "Introducing SupportRD Studio. The motherboard is centered, the FX board is the brain, and Pro Jake is ready to help you build.";
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 0.94;
    utterance.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } else {
    alert(line);
  }
}

function audioBufferToWavBlob(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const bufferOut = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bufferOut);
  let offset = 0;
  const writeString = (value) => { for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i)); offset += value.length; };
  const writeUint32 = (value) => { view.setUint32(offset, value, true); offset += 4; };
  const writeUint16 = (value) => { view.setUint16(offset, value, true); offset += 2; };
  writeString("RIFF");
  writeUint32(36 + dataSize);
  writeString("WAVEfmt ");
  writeUint32(16);
  writeUint16(1);
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(bitDepth);
  writeString("data");
  writeUint32(dataSize);
  const channels = Array.from({ length: numChannels }, (_, index) => buffer.getChannelData(index));
  for (let i = 0; i < buffer.length; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bufferOut], { type: "audio/wav" });
}

async function buildConstructedMix() {
  const active = placements.filter((item) => item.audioId && Number.isFinite(Number(item.timeSec)));
  if (!active.length) {
    setStatus("#mixExportStatus", "No placements with attached audio found.");
    return null;
  }
  setStatus("#mixExportStatus", "Building full mix from all active motherboards...");
  const srcCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = new Map();
  try {
    for (const placement of active) {
      const audio = placementAudioFiles.find((item) => item.id === placement.audioId);
      if (!audio || decoded.has(audio.id)) continue;
      const arr = await fetch(audio.url).then((r) => r.arrayBuffer());
      const buffer = await srcCtx.decodeAudioData(arr.slice(0));
      decoded.set(audio.id, buffer);
    }
  } finally {
    srcCtx.close();
  }
  if (!decoded.size) {
    setStatus("#mixExportStatus", "No decodable audio found for placements.");
    return null;
  }
  let durationSec = 0;
  active.forEach((placement) => {
    const buffer = decoded.get(placement.audioId);
    if (!buffer) return;
    durationSec = Math.max(durationSec, Number(placement.timeSec) + buffer.duration + 0.3);
  });
  const sampleRate = 44100;
  const offline = new OfflineAudioContext(2, Math.ceil(durationSec * sampleRate), sampleRate);
  const dbValue = Number(qs("#dbQuick")?.value || 0);
  const fxBoost = 1 + (Number(qs("#fxEcho")?.value || 0) / 200);
  active.forEach((placement) => {
    const buffer = decoded.get(placement.audioId);
    if (!buffer) return;
    const src = offline.createBufferSource();
    src.buffer = buffer;
    const gain = offline.createGain();
    gain.gain.value = Math.max(0.05, Math.min(2, Math.pow(10, dbValue / 20) * fxBoost));
    src.connect(gain);
    gain.connect(offline.destination);
    src.start(Math.max(0, Number(placement.timeSec || 0)));
  });
  const rendered = await offline.startRendering();
  const blob = audioBufferToWavBlob(rendered);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  lastRenderedMixBlob = blob;
  lastRenderedMixName = `supportrd-constructed-mix-${stamp}.wav`;
  setStatus("#mixExportStatus", `Mix ready: ${lastRenderedMixName}`);
  return { blob, fileName: lastRenderedMixName };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function setupStudioRadio() {
  const prevBtn = qs("#studioRadioPrev");
  const playBtn = qs("#studioRadioPlay");
  const stopBtn = qs("#studioRadioStop");
  const nextBtn = qs("#studioRadioNext");
  const track = qs("#studioRadioTrack");
  const status = qs("#studioRadioStatus");
  if (!prevBtn || !playBtn || !stopBtn || !nextBtn || !track || !status) return;

  const playlist = [
    {
      title: "Clout - AgentAnthony.wav",
      src: "/static/audio/clout-agentanthony.wav"
    },
    {
      title: "Drill - Anthony.mp3",
      src: "/static/audio/drill-anthony.mp3"
    }
  ];

  let index = 0;
  const audio = new Audio();
  audio.preload = "auto";
  audio.loop = false;

  const updateTrackUi = (message) => {
    track.textContent = `Track ${index + 1}/${playlist.length}: ${playlist[index].title}`;
    status.textContent = message;
  };

  const load = (nextIndex) => {
    index = (nextIndex + playlist.length) % playlist.length;
    const current = playlist[index];
    audio.pause();
    audio.src = current.src;
    audio.currentTime = 0;
    playBtn.textContent = "Play";
    updateTrackUi(`Ready: ${current.title}`);
  };

  const play = async () => {
    try {
      if (!audio.src) load(index);
      await audio.play();
      playBtn.textContent = "Pause";
      updateTrackUi(`Now playing: ${playlist[index].title}`);
    } catch {
      updateTrackUi("Tap Play again to allow audio.");
    }
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    playBtn.textContent = "Play";
    updateTrackUi(`Stopped: ${playlist[index].title}`);
  };

  const stepTrack = async (delta) => {
    const wasPlaying = !audio.paused;
    load(index + delta);
    if (wasPlaying) {
      await play();
    }
  };

  playBtn.addEventListener("click", async () => {
    if (audio.paused) {
      await play();
    } else {
      audio.pause();
      playBtn.textContent = "Play";
      updateTrackUi(`Paused: ${playlist[index].title}`);
    }
  });

  stopBtn.addEventListener("click", stop);
  prevBtn.addEventListener("click", async () => { await stepTrack(-1); });
  nextBtn.addEventListener("click", async () => { await stepTrack(1); });
  audio.addEventListener("ended", async () => {
    await stepTrack(1);
    if (playlist.length === 1) {
      stop();
    }
  });

  load(0);
  window.__studioRadio = {
    play,
    stop,
    prev: async () => { await stepTrack(-1); },
    next: async () => { await stepTrack(1); }
  };
}

function setupFx() {
  ["fxReverb", "fxEcho", "fxBass", "fxSlow", "fxSpeed", "fxRewind"].forEach((id) => {
    qs(`#${id}`)?.addEventListener("input", () => {
      setStatus("#fxStatus", `FX board tuned · Reverb ${qs("#fxReverb")?.value || 0}% · Echo ${qs("#fxEcho")?.value || 0}% · Bass ${qs("#fxBass")?.value || 0}% · Slow ${qs("#fxSlow")?.value || 0}% · Speed ${qs("#fxSpeed")?.value || 0}%.`);
      renderProfileStats();
    });
  });
}

function setupFxBoard() {
  const power = qs("#fxBoardPower");
  const input = qs("#fxBoardInput");
  const glue = qs("#fxBoardGlue");
  const meter = qs("#fxBoardMeter");
  const update = () => {
    const level = power?.value === "off" ? 6 : Math.max(8, Math.min(100, Number(glue?.value || 46) + Math.round((Math.sin(Date.now() / 320) + 1) * 12)));
    if (meter) meter.style.width = `${level}%`;
    setStatus("#fxBoardStatus", `FX board ${String(power?.value || "on").toUpperCase()} · ${String(input?.value || "mic-a").toUpperCase()} · Master Glue ${glue?.value || 46}%`);
  };
  [power, input, glue].forEach((el) => el?.addEventListener("input", update));
  update();
  setInterval(update, 500);
}

async function runEchoPlacement() {
  const text = (qs("#echoTranscript")?.value || "").trim();
  const results = qs("#echoResults");
  if (!results) return;
  results.innerHTML = "";
  try {
    const response = await fetch("/api/studio/echo/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: text, duration_sec: 75, style: "auto" })
    });
    const data = await response.json();
    if (!(data && data.ok && Array.isArray(data.suggestions))) throw new Error("echo_error");
    results.innerHTML = data.suggestions.map((item) => `<li>${item.mode.toUpperCase()} @ ${item.time_sec}s · feedback ${item.feedback} · mix ${item.mix}</li>`).join("");
  } catch {
    results.innerHTML = "<li>Echo suggestions unavailable right now.</li>";
  }
}
async function saveSession() {
  const payload = {
    lyrics: qs("#lyricsInput")?.value || "",
    fx: {
      reverb: Number(qs("#fxReverb")?.value || 0),
      echo: Number(qs("#fxEcho")?.value || 0),
      bass: Number(qs("#fxBass")?.value || 0)
    },
    placements,
    trackState,
    updated_at: new Date().toISOString()
  };
  try {
    const response = await fetch("/api/studio/session/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: currentSessionId, payload })
    });
    const data = await response.json();
    if (!(data && data.ok)) throw new Error("save_error");
    currentSessionId = data.session_id;
    localStorage.setItem("studioSessionId", currentSessionId);
    setStatus("#lyricsStatus", `Saved: ${currentSessionId}`);
  } catch {
    setStatus("#lyricsStatus", "Save failed.");
  }
}

async function loadSession() {
  if (!currentSessionId) {
    setStatus("#lyricsStatus", "No session id yet.");
    return;
  }
  try {
    const response = await fetch(`/api/studio/session/load?session_id=${encodeURIComponent(currentSessionId)}`);
    const data = await response.json();
    if (!(data && data.ok && data.payload)) throw new Error("load_error");
    qs("#lyricsInput").value = data.payload.lyrics || "";
    placements = Array.isArray(data.payload.placements) ? data.payload.placements : [];
    trackState = Array.isArray(data.payload.trackState) && data.payload.trackState.length ? data.payload.trackState : trackState;
    renderPlacements();
    renderProfileStats();
    setStatus("#lyricsStatus", `Loaded: ${currentSessionId}`);
  } catch {
    setStatus("#lyricsStatus", "Load failed.");
  }
}

function updateLiveWaveFromMic() {
  const placement = placements.find((item) => item.id === currentRecordingPlacementId);
  if (!placement) return;
  if (currentAnalyser && currentWaveProbe) {
    currentAnalyser.getByteTimeDomainData(currentWaveProbe);
    const chunkSize = Math.max(1, Math.floor(currentWaveProbe.length / 48));
    const nextWave = [];
    for (let i = 0; i < 48; i += 1) {
      const start = i * chunkSize;
      const slice = currentWaveProbe.slice(start, start + chunkSize);
      let avg = 0;
      slice.forEach((value) => { avg += Math.abs(value - 128); });
      avg = slice.length ? avg / slice.length : 0;
      nextWave.push(Math.max(12, Math.min(96, Math.round((avg / 128) * 100) + 12)));
    }
    placement.waveData = nextWave;
  } else {
    placement.waveData = generateWaveData("Live", 48, "live", 1);
  }
  placement.durationSec = Math.min(45, (placement.durationSec || 2) + 0.25);
  renderPlacements();
}

async function startRecording() {
  if (isRecording) return;
  try {
    currentMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = currentAudioContext.createMediaStreamSource(currentMicStream);
    currentAnalyser = currentAudioContext.createAnalyser();
    currentAnalyser.fftSize = 256;
    currentWaveProbe = new Uint8Array(currentAnalyser.frequencyBinCount);
    source.connect(currentAnalyser);

    recordingChunks = [];
    mediaRecorder = new MediaRecorder(currentMicStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordingChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
      const placement = placements.find((item) => item.id === currentRecordingPlacementId);
      if (placement) {
        const audioId = Date.now() + Math.floor(Math.random() * 1000);
        const url = URL.createObjectURL(blob);
        placementAudioFiles.push({
          id: audioId,
          name: `Recorded-${new Date().toISOString().slice(11, 19).replace(/:/g, "-")}.webm`,
          url,
          type: blob.type || "audio/webm",
          durationSec: placement.durationSec || 6,
          waveData: placement.waveData || generateWaveData("Recorded", 48, "live", 1)
        });
        placement.audioId = audioId;
        placement.audioName = "Recorded Lane";
        placement.live = false;
      }
      currentMicStream?.getTracks().forEach((track) => track.stop());
      currentAudioContext?.close?.();
      currentMicStream = null;
      currentAudioContext = null;
      currentAnalyser = null;
      currentWaveProbe = null;
      renderPlacementAudioOptions();
      renderPlacements();
      renderProfileStats();
      setStatus("#placementStatus", "Recording saved to the recorded motherboard.");
    };

    addTrack("recorded");
    const targetTrack = [...trackState].reverse().find((track) => track.type === "recorded")?.id || ensureTrack("recorded");
    const placement = createPlacement("recorded", {
      trackId: targetTrack,
      live: true,
      audioName: "Live Recording",
      durationSec: 2,
      waveData: generateWaveData("Live", 48, "live", 1)
    });
    currentRecordingPlacementId = placement.id;
    mediaRecorder.start(200);
    isRecording = true;
    qs("#recordMainBtn")?.classList.add("is-recording");
    qs("#timelineRecordBtn")?.classList.add("is-recording");
    recordingTick = setInterval(updateLiveWaveFromMic, 220);
    setStatus("#placementStatus", "Recording ON · live waveform is drawing now.");
  } catch {
    setStatus("#placementStatus", "Recording needs microphone permission.");
  }
}

async function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  qs("#recordMainBtn")?.classList.remove("is-recording");
  qs("#timelineRecordBtn")?.classList.remove("is-recording");
  if (recordingTick) {
    clearInterval(recordingTick);
    recordingTick = null;
  }
  try { mediaRecorder?.stop(); } catch {}
}
function setupTransport() {
  const transportStatus = qs("#transportStatus");
  qs("#timelinePlacementTime")?.addEventListener("input", () => {
    const twin = qs("#placementTime");
    if (twin) twin.value = qs("#timelinePlacementTime").value;
  });
  qs("#timelinePlacementWave")?.addEventListener("change", () => {
    const twin = qs("#placementWave");
    if (twin) twin.value = qs("#timelinePlacementWave").value;
  });
  qs("#createPlacementBtn")?.addEventListener("click", () => createPlacement("mp3"));
  qs("#createMp3PlacementBtn")?.addEventListener("click", () => createPlacement("mp3"));
  qs("#createRecordedPlacementBtn")?.addEventListener("click", () => createPlacement("recorded"));
  qs("#createInstrumentPlacementBtn")?.addEventListener("click", () => createPlacement("instrument"));
  qs("#deleteLastPlacementBtn")?.addEventListener("click", () => {
    const last = placements[placements.length - 1];
    if (last) removePlacement(last.id);
  });
  qs("#deletePlacementBtn")?.addEventListener("click", () => {
    const id = Number(qs("#placementSelect")?.value || selectedPlacementId || 0);
    if (id) removePlacement(id);
  });
  qs("#addMp3LaneBtn")?.addEventListener("click", () => addTrack("mp3"));
  qs("#addRecordedLaneBtn")?.addEventListener("click", () => addTrack("recorded"));
  qs("#addInstrumentLaneBtn")?.addEventListener("click", () => addTrack("instrument"));
  qs("#addMotherboardBtn")?.addEventListener("click", () => addTrack("recorded"));
  qs("#createBlankMotherboardBtn")?.addEventListener("click", () => addTrack("blank"));
  qs("#attachAudioToPlacementBtn")?.addEventListener("click", () => {
    const placementId = Number(qs("#placementSelect")?.value || selectedPlacementId || 0);
    const audio = placementAudioFiles.find((item) => item.id === selectedTimelineAudioId);
    const placement = placements.find((item) => item.id === placementId);
    if (!placement || !audio) {
      setStatus("#placementStatus", "Pick a placement and arm an imported clip first.");
      return;
    }
    pushUndoSnapshot(`Attach ${audio.name}`);
    placement.audioId = audio.id;
    placement.audioName = audio.name;
    placement.durationSec = audio.durationSec || placement.durationSec || 6;
    placement.waveData = audio.waveData || generateWaveData(audio.name, 48, placement.kind === "instrument" ? "instrument" : "steady", 1);
    renderPlacements();
    setStatus("#placementStatus", `Attached ${audio.name} to placement #${placementId}.`);
  });
  qs("#placementAudioUpload")?.addEventListener("change", () => {
    const files = Array.from(qs("#placementAudioUpload")?.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const ok = String(file.name || "").match(/\.(mp3|m4a|wav|aac|ogg)$/i) || (file.type || "").startsWith("audio/");
      if (!ok) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const url = URL.createObjectURL(file);
      const entry = {
        id,
        name: file.name,
        url,
        type: file.type || "audio/*",
        durationSec: 8,
        waveData: generateWaveData(file.name, 48, "steady", 1)
      };
      placementAudioFiles.push(entry);
      try {
        const probe = new Audio(url);
        probe.addEventListener("loadedmetadata", () => {
          const found = placementAudioFiles.find((item) => item.id === id);
          if (found && Number.isFinite(probe.duration) && probe.duration > 0) found.durationSec = probe.duration;
          if (found) found.waveData = generateWaveData(found.name, 48, "steady", Math.min(1.15, 0.75 + ((probe.duration || 8) / 20)));
          renderPlacementAudioOptions();
        }, { once: true });
      } catch {}
    });
    renderPlacementAudioOptions();
    setStatus("#placementStatus", `${placementAudioFiles.length} imported audio file(s) are ready for the motherboard.`);
    qs("#placementAudioUpload").value = "";
  });
  const toggleRecording = async () => {
    if (isRecording) await stopRecording();
    else await startRecording();
  };
  qs("#recordMainBtn")?.addEventListener("click", toggleRecording);
  qs("#timelineRecordBtn")?.addEventListener("click", toggleRecording);
  qsa("[data-transport]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.transport;
      if (cmd === "back") {
        undoLastAction();
        return;
      }
      transportStatus.textContent = `Transport: ${cmd.toUpperCase()} ready near the motherboard.`;
    });
  });
}

function setupBots() {
  qs("#editBotBtn")?.addEventListener("click", () => setStatus("#botStatus", "Edit Bot: tighten your hook entry by 120ms and widen the ad-lib tail."));
  qs("#techBotBtn")?.addEventListener("click", () => setStatus("#botStatus", "Technical Bot: keep peaks near 0 dB, monitor latency, and export clean stems."));
  qs("#studioJakeOrb")?.addEventListener("click", () => setStatus("#botStatus", "Pro Jake orb active. Booth focus locked on studio creation."));
}

function setupRecordingMath() {
  const calc = () => {
    const sr = Math.max(1, Number(qs("#mathSampleRate")?.value || 48000));
    const buf = Math.max(1, Number(qs("#mathBufferSize")?.value || 512));
    const idx = Math.max(0, Number(qs("#mathSampleIndex")?.value || 96000));
    const target = Math.max(0, Number(qs("#mathTargetSeconds")?.value || 2));
    const currentSec = idx / sr;
    const targetSamples = sr * target;
    const bufferMs = (buf / sr) * 1000;
    setStatus("#mathOutput", `currentSec = ${idx} / ${sr} = ${currentSec.toFixed(6)}s · targetSamples = ${sr} x ${target.toFixed(3)} = ${Math.round(targetSamples)} samples · bufferDuration = ${bufferMs.toFixed(3)}ms`);
  };
  ["mathSampleRate", "mathBufferSize", "mathSampleIndex", "mathTargetSeconds"].forEach((id) => qs(`#${id}`)?.addEventListener("input", calc));
  calc();
}

function setupGigPanel() {
  qs("#gigConnectorBtn")?.addEventListener("click", async () => {
    const slider = qs("#gigConnectorLoad");
    const steps = [10, 20, 55, 85, 100];
    for (const step of steps) {
      if (slider) slider.value = String(step);
      setStatus("#gigStatus", `Gig Session Connector loading ${step}%...`);
      await new Promise((resolve) => setTimeout(resolve, 240));
    }
    setStatus("#gigStatus", "Gig Session Connector ready. Glass edit view can now bridge the motherboard with video cuts.");
  });
  qs("#gigRecordBtn")?.addEventListener("click", () => setStatus("#gigStatus", "Gig 4K Record armed. Record, stop, and save to storage with preview routing next."));
  qs("#cameraAccessBtn")?.addEventListener("click", () => setStatus("#gigStatus", "Camera access requested. Kodak, Samsung, iPhone, and drone-ready workflow can connect here."));
}

function setupUtilityButtons() {
  qs("#studioSettingsLocalBtn")?.addEventListener("click", () => qs("#motherboardStatus")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioBlogLocalBtn")?.addEventListener("click", () => qs("#lyricsInput")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioPurchaseLocalBtn")?.addEventListener("click", () => { window.location.href = "/?open=subscription"; });
  qs("#studioProfileLocalBtn")?.addEventListener("click", () => qs("#profileStats")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioGigLocalBtn")?.addEventListener("click", () => qs("#gigStatus")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioThemeLocalBtn")?.addEventListener("click", () => {
    currentTheme = (currentTheme + 1) % THEMES.length;
    document.body.classList.remove("theme-signal", "theme-ember");
    if (THEMES[currentTheme]) document.body.classList.add(THEMES[currentTheme]);
    setStatus("#motherboardStatus", "Theme shifted across the whole studio glass layout.");
  });
  qs("#saveBoardBtn")?.addEventListener("click", saveSession);
  qs("#exportBoardBtn")?.addEventListener("click", async () => {
    const built = await buildConstructedMix();
    if (built) downloadBlob(built.blob, built.fileName);
  });
  qs("#undoStudioBtn")?.addEventListener("click", undoLastAction);
  qs("#restoreDeletedBtn")?.addEventListener("click", restoreDeletedAction);
  qs("#toggleBoardMenuBtn")?.addEventListener("click", () => {
    const select = qs("#boardCollapseMode");
    if (!select) return;
    select.value = select.value === "all" ? "3" : "all";
    renderPlacements();
    setStatus("#motherboardStatus", select.value === "all" ? "All motherboards reopened." : "Motherboards collapsed back to quick view.");
  });
  qs("#boardCollapseMode")?.addEventListener("change", () => {
    renderPlacements();
    setStatus("#motherboardStatus", `Board view updated: ${qs("#boardCollapseMode")?.selectedOptions?.[0]?.textContent || "custom"}.`);
  });
  qs("#dbQuick")?.addEventListener("input", updateDbQuickLabel);
  qs("#fxPreset")?.addEventListener("change", () => setStatus("#fxStatus", `FX preset engaged: ${qs("#fxPreset")?.selectedOptions?.[0]?.textContent || "Normal"}.`));
  qs("#soundProfile")?.addEventListener("change", () => setStatus("#transportStatus", `Sound profile switched to ${qs("#soundProfile")?.selectedOptions?.[0]?.textContent || "Normal"}.`));
}

window.addEventListener("DOMContentLoaded", () => {
  loadPlan();
  loadExtensions();
  setupStudioRadio();
  setupTransport();
  setupFx();
  setupFxBoard();
  setupBots();
  setupRecordingMath();
  setupGigPanel();
  setupUtilityButtons();
  renderPlacementAudioOptions();
  renderPlacements();
  renderProfileStats();
  renderUndoHistory();
  updateDbQuickLabel();
  applyStudioMicProfile();
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
  qs("#buildMixBtn")?.addEventListener("click", buildConstructedMix);
  qs("#exportMixBtn")?.addEventListener("click", async () => {
    if (!lastRenderedMixBlob) {
      const built = await buildConstructedMix();
      if (!built) return;
    }
    downloadBlob(lastRenderedMixBlob, lastRenderedMixName || "supportrd-constructed-mix.wav");
  });
  qs("#exportFullMp3Btn")?.addEventListener("click", async () => {
    if (!lastRenderedMixBlob) {
      const built = await buildConstructedMix();
      if (!built) return;
    }
    const mp3Name = (lastRenderedMixName || "supportrd-constructed-mix.wav").replace(/\.wav$/i, ".mp3");
    downloadBlob(lastRenderedMixBlob, mp3Name);
    setStatus("#mixExportStatus", `Exported full MP3 file: ${mp3Name}.`);
  });
});

window.addEventListener("message", (event) => {
  const data = event && event.data;
  if (!data || !data.type) return;
  if (data.type === "studio-enter") {
    applyStudioMicProfile();
    if (data.autoplay) setTimeout(() => window.__studioRadio?.play?.(), 180);
  }
  if (data.type === "studio-leave") {
    stopRecording();
    window.__studioRadio?.stop?.();
  }
});






