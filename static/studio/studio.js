const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const STUDIO_PREMIUM_URL = "https://shop.supportrd.com/products/jake-premium-studio";
const STUDIO_LOGIN_URL = "/login";
const STUDIO_LOCAL_SANDBOX = new URLSearchParams(window.location.search).get("localSandbox") === "1";
const STUDIO_SANDBOX_SUFFIX = STUDIO_LOCAL_SANDBOX ? "?localSandbox=1" : "";

let currentSessionId = localStorage.getItem("studioSessionId") || "";
let placements = [];
let placementAudioFiles = [];
let trackState = [
  { id: "mp3-1", type: "mp3", title: "Motherboard 1" },
  { id: "recorded-1", type: "recorded", title: "Motherboard 2" },
  { id: "instrument-1", type: "instrument", title: "Motherboard 3" },
  { id: "blank-4", type: "blank", title: "Motherboard 4" }
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
let recentBoards = [];
let lastRenderedMixBlob = null;
let lastRenderedMixName = "";
let currentTheme = 0;
let recentSessionSaves = [];
let videoAssets = [];
const THEMES = ["", "theme-signal", "theme-ember"];
const timelineDurationSec = 120;
let timelineZoom = 1;
let draggedPlacementId = 0;
let selectedTrackId = "mp3-1";
let selectedWaveRegion = null;
let studioTransportAudio = null;
let activeCameraStream = null;
let currentGuideTimer = null;
let studioAccessState = {
  locked: true,
  authenticated: false,
  access: false,
  checking: true,
  email: "",
  subscription: "free"
};
let studioDeviceState = {
  audioGranted: false,
  videoGranted: false,
  micLabel: "",
  cameraLabel: "",
  micCount: 0,
  cameraCount: 0
};

function playUiClickSound(type = "soft") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = playUiClickSound._ctx || (playUiClickSound._ctx = new AudioCtx());
    if (ctx.state === "suspended") ctx.resume?.();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === "accent" ? "triangle" : "sine";
    osc.frequency.value = type === "accent" ? 660 : 440;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(type === "accent" ? 0.04 : 0.025, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {}
}

function getSelectedPlacement() {
  return placements.find((item) => item.id === selectedPlacementId) || null;
}

function getPlacementAudioSource(placement) {
  if (!placement) return null;
  if (placement.audioId) {
    const match = placementAudioFiles.find((item) => item.id === placement.audioId);
    if (match?.url) return match;
  }
  const fallback = placementAudioFiles.find((item) => item.name === placement.audioName);
  return fallback?.url ? fallback : null;
}

function clearWaveRegionSelection() {
  selectedWaveRegion = null;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setStatus(id, message) {
  const el = qs(id);
  if (el) el.textContent = message;
}
function updateStudioDevicePanel() {
  const micStatus = qs("#studioMicStatus");
  const micDevices = qs("#studioMicDevices");
  const camStatus = qs("#studioCameraStatus");
  const camDevices = qs("#studioCameraDevices");
  const sessionCard = qs("#studioSessionCardStatus");
  const apiStatus = qs("#studioApiStatus");
  if (micStatus) micStatus.textContent = studioDeviceState.audioGranted
    ? `Microphone ready${studioDeviceState.micLabel ? ` · ${studioDeviceState.micLabel}` : ""}`
    : "Waiting for browser mic access.";
  if (micDevices) micDevices.textContent = studioDeviceState.micCount
    ? `${studioDeviceState.micCount} mic device${studioDeviceState.micCount === 1 ? "" : "s"} detected for this booth.`
    : "No microphone labels detected yet.";
  if (camStatus) camStatus.textContent = studioDeviceState.videoGranted
    ? `Camera ready${studioDeviceState.cameraLabel ? ` · ${studioDeviceState.cameraLabel}` : ""}`
    : "Waiting for camera access.";
  if (camDevices) camDevices.textContent = studioDeviceState.cameraCount
    ? `${studioDeviceState.cameraCount} camera device${studioDeviceState.cameraCount === 1 ? "" : "s"} detected for live screen work.`
    : "No camera labels detected yet.";
  if (sessionCard) sessionCard.textContent = studioAccessState.access
    ? `API session attached${studioAccessState.email ? ` · ${studioAccessState.email}` : ""}`
    : "API session not attached yet.";
  if (apiStatus) apiStatus.textContent = studioAccessState.access
    ? `Premium Jake is active on ${studioAccessState.subscription || "studio100"} and the booth can record live.`
    : "Jake Premium Studio will attach once login and payment are verified.";
}
function setStudioLocked(locked, options = {}) {
  studioAccessState.locked = !!locked;
  document.body.classList.toggle("studio-api-locked", !!locked);
  const gate = qs("#studioAccessGate");
  if (!gate) return;
  gate.hidden = !locked;
  const copy = qs("#studioAccessCopy");
  const meta = qs("#studioAccessMeta");
  const loginBtn = qs("#studioAccessLoginBtn");
  const upgradeBtn = qs("#studioAccessUpgradeBtn");
  if (copy && options.copy) copy.textContent = options.copy;
  if (meta && options.meta) meta.textContent = options.meta;
  if (loginBtn) loginBtn.hidden = !!options.hideLogin;
  if (upgradeBtn) upgradeBtn.hidden = !!options.hideUpgrade;
  updateStudioDevicePanel();
}
function getSelectedTrack() {
  return trackState.find((track) => track.id === selectedTrackId) || null;
}
function updateSelectedBoardLabels() {
  const selected = getSelectedTrack();
  const btn = qs("#stickySelectedBoardBtn");
  if (btn) btn.textContent = selected ? `${selected.title} Selected` : "Selected Motherboard";
}
function captureSessionState() {
  return {
    session_id: currentSessionId || `studio-${Date.now()}`,
    saved_at: new Date().toISOString(),
    lyrics: qs("#lyricsInput")?.value || "",
    fx: {
      reverb: Number(qs("#fxReverb")?.value || 0),
      echo: Number(qs("#fxEcho")?.value || 0),
      bass: Number(qs("#fxBass")?.value || 0),
      dbQuick: Number(qs("#dbQuick")?.value || 0),
      preset: qs("#fxPreset")?.value || "normal"
    },
    placements: deepClone(placements),
    trackState: deepClone(trackState),
    placementAudioFiles: deepClone(placementAudioFiles.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      durationSec: item.durationSec,
      waveData: item.waveData || [],
      url: item.url || ""
    }))),
    selectedTimelineAudioId,
    selectedPlacementId,
    selectedTrackId,
    timelineZoom
  };
}

function applySessionState(snapshot, label = "Session loaded.") {
  if (!snapshot) return;
  placements = deepClone(snapshot.placements || []);
  trackState = deepClone(snapshot.trackState || trackState);
  placementAudioFiles = deepClone(snapshot.placementAudioFiles || []);
  selectedTimelineAudioId = snapshot.selectedTimelineAudioId || 0;
  selectedPlacementId = snapshot.selectedPlacementId || 0;
  selectedTrackId = snapshot.selectedTrackId || trackState[0]?.id || "mp3-1";
  timelineZoom = Number(snapshot.timelineZoom || 1);
  if (qs("#lyricsInput")) qs("#lyricsInput").value = snapshot.lyrics || "";
  if (qs("#fxReverb")) qs("#fxReverb").value = String(snapshot.fx?.reverb ?? 25);
  if (qs("#fxEcho")) qs("#fxEcho").value = String(snapshot.fx?.echo ?? 30);
  if (qs("#fxBass")) qs("#fxBass").value = String(snapshot.fx?.bass ?? 40);
  if (qs("#dbQuick")) qs("#dbQuick").value = String(snapshot.fx?.dbQuick ?? 0);
  if (qs("#fxPreset")) qs("#fxPreset").value = snapshot.fx?.preset || "normal";
  renderPlacementAudioOptions();
  renderPlacements();
  renderProfileStats();
  renderUndoHistory();
  renderRecentSessionSaves();
  updateDbQuickLabel();
  setStatus("#lyricsStatus", label);
  setStatus("#recentSessionStatus", label);
}

function renderRecentSessionSaves() {
  const select = qs("#recentSessionSelect");
  if (!select) return;
  if (!recentSessionSaves.length) {
    select.innerHTML = "<option value=''>No saved files yet</option>";
    return;
  }
  select.innerHTML = recentSessionSaves.map((item, index) => `<option value="${index}">${item.name}</option>`).join("");
}

function persistRecentSessionSave(snapshot) {
  const entry = {
    name: `Motherboard Session · ${new Date(snapshot.saved_at).toLocaleString()}`,
    snapshot
  };
  recentSessionSaves.unshift(entry);
  recentSessionSaves = recentSessionSaves.slice(0, 12);
  localStorage.setItem("studioRecentSessionSaves", JSON.stringify(recentSessionSaves));
  renderRecentSessionSaves();
}

function exportSessionSnapshot(snapshot, fileName = `supportrd-session-${Date.now()}.json`) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  downloadBlob(blob, fileName);
}
function pushRecentBoard(action, title) {
  recentBoards.unshift({ action, title, at: new Date().toLocaleTimeString() });
  recentBoards = recentBoards.slice(0, 12);
  renderRecentBoards();
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
  updateSelectedBoardLabels();
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

async function decodeAudioVisual(file) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const buffer = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const channel = decoded.getChannelData(0);
    const bars = 64;
    const chunk = Math.max(1, Math.floor(channel.length / bars));
    const waveData = [];
    for (let i = 0; i < bars; i += 1) {
      const start = i * chunk;
      let peak = 0;
      for (let j = start; j < Math.min(start + chunk, channel.length); j += 1) {
        const val = Math.abs(channel[j] || 0);
        if (val > peak) peak = val;
      }
      waveData.push(Math.max(10, Math.min(98, Math.round(peak * 100))));
    }
    await ctx.close();
    return { durationSec: decoded.duration || 8, waveData };
  } catch {
    return null;
  }
}
function buildWaveMarkup(waveData = []) {
  const bars = (waveData.length ? waveData : generateWaveData())
    .map((height, index) => {
      const intensity = Math.max(0.18, Math.min(1, Number(height || 0) / 100));
      return `<span class="wave-bar" style="--wave-height:${height}%;--wave-intensity:${intensity.toFixed(3)}" data-wave-index="${index}"></span>`;
    })
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
  if (snapshot) pushUndoSnapshot(`Add motherboard`);
  const count = trackState.length + 1;
  const track = {
    id: `${type}-${count}`,
    type,
    title: `Motherboard ${count}`
  };
  trackState.push(track);
  pushRecentBoard("Added", track.title);
  renderPlacements();
  renderProfileStats();
  setStatus("#placementStatus", `${track.title} added.`);
  return track;
}

function deleteLastMotherboard() {
  if (trackState.length <= 1) {
    setStatus("#motherboardStatus", "Keep at least one motherboard active.");
    return;
  }
  pushUndoSnapshot("Delete motherboard");
  const removed = trackState.pop();
  placements = placements.filter((placement) => placement.trackId !== removed.id);
  if (selectedTrackId === removed.id) selectedTrackId = trackState[trackState.length - 1]?.id || trackState[0]?.id || "";
  pushRecentBoard("Deleted", removed.title);
  renderPlacements();
  renderProfileStats();
  updateSelectedBoardLabels();
  setStatus("#motherboardStatus", `${removed.title} removed.`);
}
  function removePlacement(id) {
    const idx = placements.findIndex((p) => p.id === id);
    if (idx < 0) return;
    pushUndoSnapshot(`Delete ${summarizePlacement(placements[idx])}`);
    const removed = placements[idx];
    placements.splice(idx, 1);
    if (selectedPlacementId === id) {
      selectedPlacementId = 0;
      clearWaveRegionSelection();
    }
  deletedSnapshots.unshift({ action: `Deleted clip`, at: new Date().toLocaleTimeString(), placements: deepClone(placements), trackState: deepClone(trackState), placementAudioFiles: deepClone(placementAudioFiles), selectedTimelineAudioId, selectedPlacementId });
  renderPlacements();
  renderProfileStats();
  setStatus("#placementStatus", `Deleted ${removed.audioName || removed.wave}.`);
}

  function createPlacement(kind = "mp3", options = {}) {
  pushUndoSnapshot(`Create ${kind} placement`);
  const time = Number(options.timeSec ?? qs("#timelinePlacementTime")?.value ?? qs("#placementTime")?.value ?? 0);
  const wave = String(options.wave ?? qs("#fxPreset")?.value ?? "echo");
  const audio = options.audio || placementAudioFiles.find((item) => item.id === selectedTimelineAudioId) || null;
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const placement = {
    id,
    kind,
    timeSec: Math.max(0, time),
    wave,
    audioId: audio?.id || 0,
    audioName: options.audioName || audio?.name || "Audio Layer",
    durationSec: Math.max(3, Number(options.durationSec || audio?.durationSec || (kind === "recorded" ? 6 : kind === "instrument" ? 9 : 8))),
    trackId: options.trackId || selectedTrackId || ensureTrack(kind),
    waveData: options.waveData || generateWaveData(options.audioName || audio?.name || kind, kind === "recorded" ? 56 : 48, kind === "instrument" ? "instrument" : "steady", kind === "recorded" ? 0.92 : 1),
    live: Boolean(options.live)
  };
    placements.push(placement);
    selectedPlacementId = id;
    clearWaveRegionSelection();
    renderPlacements();
  renderProfileStats();
  updateSelectedBoardLabels();
  setStatus("#placementStatus", `${kind.toUpperCase()} placement added on ${placement.trackId}.`);
  return placement;
}

function renderPlacementAudioOptions() {
  const bank = qs("#timelineClipBank");
  if (!bank) return;
  if (!placementAudioFiles.length) {
    selectedTimelineAudioId = 0;
    bank.innerHTML = "";
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

function trimSelectedPlacement(edge = "right") {
    const placement = getSelectedPlacement();
    if (!placement) {
      setStatus("#placementStatus", "Highlight a waveform first to trim it.");
      return;
    }
    pushUndoSnapshot(`Trim ${edge} ${placement.audioName || placement.wave}`);
    if (selectedWaveRegion && selectedWaveRegion.placementId === placement.id) {
      const bars = Array.isArray(placement.waveData) ? placement.waveData.slice() : [];
      const total = Math.max(1, bars.length);
      const startIndex = Math.max(0, Math.min(total - 1, Math.round(selectedWaveRegion.start * total)));
      const endIndex = Math.max(startIndex + 1, Math.min(total, Math.round(selectedWaveRegion.end * total)));
      if (edge === "left") {
        placement.waveData = bars.slice(endIndex);
      } else {
        placement.waveData = bars.slice(0, startIndex);
      }
      const fractionLeft = Math.max(0.08, (placement.waveData.length || 1) / total);
      placement.durationSec = Math.max(0.8, Number((placement.durationSec * fractionLeft).toFixed(2)));
      if (edge === "left") {
        placement.timeSec = Math.max(0, Number((placement.timeSec + ((endIndex / total) * (placement.durationSec / fractionLeft))).toFixed(2)));
      }
      clearWaveRegionSelection();
    } else {
      if (edge === "left") {
        placement.timeSec = Math.max(0, placement.timeSec + 0.5);
        placement.durationSec = Math.max(0.8, placement.durationSec - 0.5);
      } else {
        placement.durationSec = Math.max(0.8, placement.durationSec - 0.5);
      }
    }
    renderPlacements();
    setStatus("#placementStatus", `Trimmed ${edge} side of ${placement.audioName || 'selected waveform'}.`);
  }

  function deleteSelectedWaveRegion() {
    const placement = getSelectedPlacement();
    if (!placement || !selectedWaveRegion || selectedWaveRegion.placementId !== placement.id) {
      if (placement) {
        removePlacement(placement.id);
      }
      return;
    }
    const bars = Array.isArray(placement.waveData) ? placement.waveData.slice() : [];
    const total = Math.max(1, bars.length);
    const startIndex = Math.max(0, Math.min(total - 1, Math.round(selectedWaveRegion.start * total)));
    const endIndex = Math.max(startIndex + 1, Math.min(total, Math.round(selectedWaveRegion.end * total)));
    pushUndoSnapshot(`Delete snippet from ${placement.audioName || placement.wave}`);
    placement.waveData = [...bars.slice(0, startIndex), ...bars.slice(endIndex)];
    const removedFraction = Math.max(0.02, (endIndex - startIndex) / total);
    placement.durationSec = Math.max(0.8, Number((placement.durationSec * (1 - removedFraction)).toFixed(2)));
    clearWaveRegionSelection();
    renderPlacements();
    setStatus("#placementStatus", "Highlighted wave snippet removed.");
  }

function setTimelineZoom(delta = 0) {
  timelineZoom = Math.max(1, Math.min(8, Number((timelineZoom + delta).toFixed(2))));
  renderPlacements();
  setStatus("#placementStatus", `Wave zoom is now ${timelineZoom.toFixed(2)}x for precise editing.`);
}
function renderClipHandles(placement) {
  if (placement.id !== selectedPlacementId) return "";
  return `
    <button class="clip-handle left" type="button" data-handle="left" data-placement-id="${placement.id}" aria-label="Resize Left"></button>
    <button class="clip-handle right" type="button" data-handle="right" data-placement-id="${placement.id}" aria-label="Resize Right"></button>
  `;
}
function renderWaveSelection(placement) {
  if (!selectedWaveRegion || selectedWaveRegion.placementId !== placement.id) return "";
  const left = Math.max(0, Math.min(96, selectedWaveRegion.start * 100));
  const width = Math.max(4, Math.min(100 - left, (selectedWaveRegion.end - selectedWaveRegion.start) * 100));
  return `<span class="timeline-wave-selection" style="left:${left}%;width:${width}%"></span>`;
}
function renderPlacements() {
  const wrap = qs("#timelineTracks");
  const select = qs("#placementSelect");
  if (!wrap) return;
  const collapseMode = qs("#boardCollapseMode")?.value || "4";
  const visibleCount = collapseMode === "all" ? Number.MAX_SAFE_INTEGER : Math.max(1, Number(collapseMode));
  const laneWidth = Math.max(100, timelineZoom * 100);
  wrap.innerHTML = trackState.map((track, index) => {
    const hiddenClass = index >= visibleCount ? " hidden-track" : "";
    const selectedTrackClass = track.id === selectedTrackId ? " selected-track" : "";
    const clips = placements.filter((placement) => placement.trackId === track.id).map((placement) => {
      const left = Math.max(0, Math.min(98, (placement.timeSec / timelineDurationSec) * 100));
      const width = Math.max(26, Math.min(94, ((placement.durationSec || 6) / timelineDurationSec) * 100));
      const selected = placement.id === selectedPlacementId ? " selected" : "";
      const waveData = Array.isArray(placement.waveData) ? placement.waveData : generateWaveData(placement.audioName || placement.wave);
        return `<button class="timeline-clip ${placement.kind}${selected}" draggable="true" type="button" data-placement-id="${placement.id}" style="left:${left}%;width:${width}%;">
          <span class="timeline-clip-live"></span>
          ${buildWaveMarkup(waveData)}
          ${renderWaveSelection(placement)}
          ${renderClipHandles(placement)}
          <span class="timeline-clip-label"><span class="clip-name">${placement.audioName || placement.wave}</span><span class="clip-meta">${placement.durationSec.toFixed(1)}s</span></span>
        </button>`;
    }).join("");
    return `<div class="timeline-track${hiddenClass}${selectedTrackClass}" data-track-id="${track.id}">
      <div class="timeline-track-head">
        <button class="timeline-track-title-button" type="button" data-track-select="${track.id}">${track.title}</button>
        <div class="timeline-track-type">Zoom ${timelineZoom.toFixed(2)}x</div>
      </div>
      <div class="timeline-track-body" data-track-drop="${track.id}"><div class="timeline-track-lane" style="width:${laneWidth}%">${clips || '<div class="timeline-empty">This motherboard is ready for clips, live recording, or instruments.</div>'}</div></div>
    </div>`;
  }).join("");

  qsa("#timelineTracks [data-track-select]").forEach((node) => {
    node.addEventListener("click", () => {
      selectedTrackId = node.getAttribute("data-track-select") || selectedTrackId;
      renderPlacements();
      updateSelectedBoardLabels();
      setStatus("#motherboardStatus", `${node.textContent} selected.`);
    });
  });

  qsa("#timelineTracks [data-track-drop]").forEach((node) => {
    node.addEventListener("click", () => {
      selectedTrackId = node.getAttribute("data-track-drop") || selectedTrackId;
      renderPlacements();
      const track = trackState.find((item) => item.id === selectedTrackId);
      updateSelectedBoardLabels();
      setStatus("#motherboardStatus", `${track?.title || "Motherboard"} selected.`);
    });
  });

    qsa("#timelineTracks [data-placement-id]").forEach((node) => {
      node.addEventListener("click", () => {
        selectedPlacementId = Number(node.getAttribute("data-placement-id") || 0);
        const placement = placements.find((item) => item.id === selectedPlacementId);
        if (placement?.audioId) {
          selectedTimelineAudioId = placement.audioId;
          renderPlacementAudioOptions();
          window.__studioRadio?.loadPlacement?.(selectedPlacementId);
        }
        clearWaveRegionSelection();
        if (select) select.value = String(selectedPlacementId);
        renderPlacements();
        setStatus("#placementStatus", placement ? `Selected: ${summarizePlacement(placement)}.` : "Placement selected.");
      });
      node.addEventListener("dblclick", async () => {
        const placementId = Number(node.getAttribute("data-placement-id") || 0);
        if (!placementId) return;
        selectedPlacementId = placementId;
        if (select) select.value = String(selectedPlacementId);
        renderPlacements();
        await window.__studioRadio?.playPlacement?.(placementId);
      });
      node.addEventListener("pointerdown", (event) => {
        if (event.target.closest("[data-handle]")) return;
        const placementId = Number(node.getAttribute("data-placement-id") || 0);
        const placement = placements.find((item) => item.id === placementId);
        if (!placement) return;
        const waveform = node.querySelector(".timeline-waveform");
        const rect = waveform?.getBoundingClientRect() || node.getBoundingClientRect();
        const getRatio = (clientX) => Math.max(0, Math.min(1, rect.width ? (clientX - rect.left) / rect.width : 0));
        const startRatio = getRatio(event.clientX);
        selectedPlacementId = placementId;
        selectedWaveRegion = { placementId, start: startRatio, end: Math.min(1, startRatio + 0.08) };
        renderPlacements();
        const move = (moveEvent) => {
          const currentRatio = getRatio(moveEvent.clientX);
          selectedWaveRegion = {
            placementId,
            start: Math.min(startRatio, currentRatio),
            end: Math.max(startRatio, currentRatio)
          };
          renderPlacements();
        };
        const up = () => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
          const span = Math.max(0.01, selectedWaveRegion.end - selectedWaveRegion.start);
          if (span < 0.015) {
            const center = selectedWaveRegion.start;
            selectedWaveRegion = {
              placementId,
              start: Math.max(0, center - 0.04),
              end: Math.min(1, center + 0.04)
            };
          }
          renderPlacements();
          setStatus("#placementStatus", "Wave section highlighted. Press Delete/Backspace to remove that snippet.");
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
      });
      node.addEventListener("dragstart", (event) => {
        draggedPlacementId = Number(node.getAttribute("data-placement-id") || 0);
        event.dataTransfer?.setData("text/plain", String(draggedPlacementId));
      });
    });
  qsa("#timelineTracks [data-handle]").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const placementId = Number(node.getAttribute("data-placement-id") || 0);
      const edge = node.getAttribute("data-handle");
      const placement = placements.find((item) => item.id === placementId);
      const clip = node.closest(".timeline-clip");
      const lane = clip?.closest(".timeline-track-lane");
      if (!placement || !lane || !edge) return;
      const laneWidth = lane.getBoundingClientRect().width || 1;
      const secondsPerPixel = timelineDurationSec / laneWidth;
      const startX = event.clientX;
      const startTime = placement.timeSec;
      const startDuration = placement.durationSec;
      const move = (moveEvent) => {
        const deltaSec = (moveEvent.clientX - startX) * secondsPerPixel;
        if (edge === "left") {
          placement.timeSec = Math.max(0, Math.min(startTime + deltaSec, startTime + startDuration - 0.4));
          placement.durationSec = Math.max(0.4, startDuration - deltaSec);
        } else {
          placement.durationSec = Math.max(0.4, startDuration + deltaSec);
        }
        renderPlacements();
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setStatus("#placementStatus", `Adjusted ${placement.audioName || "selected clip"} on ${placement.trackId}.`);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  });

  qsa("#timelineTracks [data-track-drop]").forEach((node) => {
    node.addEventListener("dragover", (event) => {
      event.preventDefault();
      node.classList.add("drag-over");
    });
    node.addEventListener("dragleave", () => node.classList.remove("drag-over"));
    node.addEventListener("drop", (event) => {
      event.preventDefault();
      node.classList.remove("drag-over");
      const trackId = node.getAttribute("data-track-drop") || "";
      const placementId = Number(event.dataTransfer?.getData("text/plain") || draggedPlacementId || 0);
      const placement = placements.find((item) => item.id === placementId);
      const lane = node.querySelector('.timeline-track-lane');
      if (!placement || !lane) return;
      const rect = lane.getBoundingClientRect();
      const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
      pushUndoSnapshot(`Move ${placement.audioName || placement.wave}`);
      placement.trackId = trackId;
      placement.timeSec = Math.max(0, Math.min(timelineDurationSec, ratio * timelineDurationSec));
      selectedPlacementId = placement.id;
      selectedTrackId = trackId;
      renderPlacements();
      setStatus("#placementStatus", `Moved ${placement.audioName || 'waveform'} to ${trackId}.`);
    });
  });

  if (select) {
    select.innerHTML = placements.length
      ? placements.map((placement) => `<option value="${placement.id}">#${placement.id} · ${placement.kind.toUpperCase()} · ${placement.audioName || placement.wave}</option>`).join("")
      : "<option value=''>No placements</option>";
    if (selectedPlacementId) select.value = String(selectedPlacementId);
  }
  updateSelectedBoardLabels();
}
function renderRecentBoards() {
  const wrap = qs("#recentBoardsList");
  if (!wrap) return;
  if (!recentBoards.length) {
    wrap.innerHTML = "No recent motherboard changes yet.";
    return;
  }
  wrap.innerHTML = recentBoards.map((item) => `<div class="recent-board-item"><strong>${item.action}</strong> · ${item.title}<div>${item.at}</div></div>`).join("");
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

function renderGigPreviewSummary() {
  const preview = qs("#gigPreviewWindow .gig-preview-copy");
  if (!preview) return;
  const videoCount = videoAssets.length;
  const boardCount = trackState.length;
  preview.innerHTML = `
    <strong>${boardCount}</strong> motherboards linked<br>
    <strong>${videoCount}</strong> video clip${videoCount === 1 ? "" : "s"} loaded<br>
    ${videoAssets[0] ? `Latest video: ${videoAssets[0].name}` : "Add an MP4 to join the current motherboards with video content."}
  `;
  setStatus("#gigBoardStat", String(boardCount));
}
function handleGigVideoFiles(files = []) {
  if (!files.length) return;
  files.forEach((file) => {
    const ok = String(file.name || "").match(/\.(mp4|mov|webm|m4v)$/i) || (file.type || "").startsWith("video/");
    if (!ok) return;
    videoAssets.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: file.name,
      type: file.type || "video/mp4",
      url: URL.createObjectURL(file)
    });
  });
  videoAssets = videoAssets.slice(0, 12);
  renderGigPreviewSummary();
  setStatus("#gigStatus", `${videoAssets.length} video file(s) are now joined with the current motherboards.`);
}

async function refreshStudioDeviceInventory() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => device.kind === "audioinput");
    const videoInputs = devices.filter((device) => device.kind === "videoinput");
    studioDeviceState.micCount = audioInputs.length;
    studioDeviceState.cameraCount = videoInputs.length;
    if (!studioDeviceState.micLabel) studioDeviceState.micLabel = audioInputs[0]?.label || "";
    if (!studioDeviceState.cameraLabel) studioDeviceState.cameraLabel = videoInputs[0]?.label || "";
    const micSelect = qs("#micSourceSelect");
    if (micSelect) {
      micSelect.innerHTML = audioInputs.length
        ? audioInputs.map((device, index) => `<option value="${device.deviceId || `mic-${index}`}">${device.label || `Microphone ${index + 1}`}</option>`).join("")
        : "<option value='default'>Default Mic</option>";
    }
  } catch {}
  updateStudioDevicePanel();
}

async function ensureStudioDeviceReady({ audio = false, video = false, source = "studio" } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("device_api_unavailable");
  const constraints = {};
  if (audio) {
    const selectedMicId = qs("#micSourceSelect")?.value || "default";
    constraints.audio = selectedMicId && selectedMicId !== "default"
      ? { deviceId: { exact: selectedMicId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 1 }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 1 };
  }
  if (video) {
    constraints.video = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };
  }
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const audioTrack = stream.getAudioTracks?.()[0] || null;
  const videoTrack = stream.getVideoTracks?.()[0] || null;
  if (audioTrack) {
    studioDeviceState.audioGranted = true;
    studioDeviceState.micLabel = audioTrack.label || studioDeviceState.micLabel || "";
    setStatus("#transportStatus", `${source === "assistant" ? "Assistant" : "Studio"} microphone is ready on ${studioDeviceState.micLabel || "this device"}.`);
  }
  if (videoTrack) {
    studioDeviceState.videoGranted = true;
    studioDeviceState.cameraLabel = videoTrack.label || studioDeviceState.cameraLabel || "";
    setStatus("#gigStatus", `Camera lane is ready on ${studioDeviceState.cameraLabel || "this device"}.`);
  }
  await refreshStudioDeviceInventory();
  return stream;
}

async function applyStudioMicProfile() {
  try {
    const stream = await ensureStudioDeviceReady({ audio: true, source: "studio" });
    const micLabel = stream.getAudioTracks()[0]?.label || "your microphone";
    stream.getTracks().forEach((track) => track.stop());
    localStorage.setItem("studio_mic_profile", "normal");
    setStatus("#transportStatus", `Normal voice pickup is active by default on ${micLabel}.`);
  } catch {
    setStatus("#transportStatus", "Mic profile is ready once microphone permission is allowed.");
    refreshStudioDeviceInventory();
  }
}
async function loadPlan() {
  const badge = qs("#planBadge");
  try {
    const response = await fetch("/api/studio/plan");
    const data = await response.json();
    if (!(data && data.ok)) throw new Error("plan_error");
    const tierLabel = data.tier === "pro500" ? "Jake Premium Studio" : data.tier === "premium100" ? "Premium" : "Free";
    badge.textContent = `Plan: ${tierLabel} · API Live`;
  } catch {
    badge.textContent = "Plan: free · API waiting";
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
  const line = "Jake Premium Studio is live. The motherboard is centered, the API is attached to your SupportRD login, and Jake is standing by in the booth.";
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

async function refreshStudioJakeAccess({ bootstrap = true } = {}) {
  if (STUDIO_LOCAL_SANDBOX) {
    studioAccessState = {
      ...studioAccessState,
      locked: false,
      checking: false,
      authenticated: true,
      access: true,
      email: "local-sandbox@supportrd.com",
      subscription: "studio100"
    };
    if (!currentSessionId) {
      currentSessionId = `SES-LOCAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      localStorage.setItem("studioSessionId", currentSessionId);
    }
    setStatus("#sessionStatus", "Studio API linked to local sandbox mode.");
    updateStudioDevicePanel();
    setStudioLocked(false);
    return true;
  }
  setStudioLocked(true, {
    copy: "Checking SupportRD login and Jake Premium Studio payment access...",
    meta: "Studio API is verifying your account.",
    hideLogin: true,
    hideUpgrade: true
  });
  studioAccessState.checking = true;
  try {
    const accessResponse = await fetch(`/api/studio/jake/access${STUDIO_SANDBOX_SUFFIX}`, { credentials: "same-origin" });
    let accessData = {};
    try { accessData = await accessResponse.json(); } catch {}
    if (accessResponse.status === 401 || accessData?.error === "login_required") {
      studioAccessState = { ...studioAccessState, checking: false, authenticated: false, access: false, subscription: "free" };
      setStudioLocked(true, {
        copy: "Log in to SupportRD to open Jake Premium Studio.",
        meta: "Your booth, boards, and exports attach to the account that signs in.",
        hideLogin: false,
        hideUpgrade: false
      });
      return false;
    }
    if (accessResponse.status === 402 || accessData?.error === "premium_jake_required" || !accessData?.access) {
      studioAccessState = {
        ...studioAccessState,
        checking: false,
        authenticated: true,
        access: false,
        email: accessData?.email || "",
        subscription: accessData?.subscription || "free"
      };
      setStudioLocked(true, {
        copy: accessData?.message || "Jake Premium Studio is locked until the $100 package is active.",
        meta: "Premium Jake + Studio Features · $100",
        hideLogin: false,
        hideUpgrade: false
      });
      return false;
    }
    if (!bootstrap) {
      studioAccessState = {
        ...studioAccessState,
        checking: false,
        authenticated: true,
        access: true,
        email: accessData?.email || "",
        subscription: accessData?.subscription || "studio100"
      };
      setStudioLocked(false);
      return true;
    }
    const enterResponse = await fetch(`/api/studio/jake/enter${STUDIO_SANDBOX_SUFFIX}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "studio-api", route: "studio-front" })
    });
    let enterData = {};
    try { enterData = await enterResponse.json(); } catch {}
    if (!(enterResponse.ok && enterData?.ok && enterData?.session_id)) {
      throw new Error(enterData?.error || "enter_failed");
    }
    currentSessionId = enterData.session_id;
    localStorage.setItem("studioSessionId", currentSessionId);
    studioAccessState = {
      ...studioAccessState,
      checking: false,
      authenticated: true,
      access: true,
      email: enterData?.email || accessData?.email || "",
      subscription: enterData?.subscription || accessData?.subscription || "studio100"
    };
    if (studioAccessState.email) {
      setStatus("#sessionStatus", `Studio API linked to ${studioAccessState.email}.`);
    }
    updateStudioDevicePanel();
    setStudioLocked(false);
    return true;
  } catch {
    studioAccessState = { ...studioAccessState, checking: false, access: false };
    setStudioLocked(true, {
      copy: "Jake Premium Studio could not finish the API login handshake just yet.",
      meta: "Use Refresh Access to try again without leaving the booth.",
      hideLogin: false,
      hideUpgrade: false
    });
    return false;
  }
}

function setupStudioAccessGate() {
  qs("#studioAccessLoginBtn")?.addEventListener("click", () => {
    try {
      if (window.top) {
        window.top.location.href = STUDIO_LOGIN_URL;
        return;
      }
    } catch {}
    window.location.href = STUDIO_LOGIN_URL;
  });
  qs("#studioAccessUpgradeBtn")?.addEventListener("click", () => {
    try {
      if (window.top) {
        window.top.location.href = STUDIO_PREMIUM_URL;
        return;
      }
    } catch {}
    window.location.href = STUDIO_PREMIUM_URL;
  });
  qs("#studioAccessRefreshBtn")?.addEventListener("click", () => {
    refreshStudioJakeAccess({ bootstrap: true });
  });
  qs("#studioPrimeMicBtn")?.addEventListener("click", async () => {
    try {
      const stream = await ensureStudioDeviceReady({ audio: true, source: "studio" });
      stream.getTracks().forEach((track) => track.stop());
      setStatus("#transportStatus", "Studio microphone lane is armed and ready for live recording.");
    } catch {
      setStatus("#transportStatus", "Browser microphone permission is required before live recording can start.");
    }
  });
  qs("#studioPrimeCameraBtn")?.addEventListener("click", async () => {
    try {
      const stream = await ensureStudioDeviceReady({ video: true, source: "studio" });
      activeCameraStream?.getTracks()?.forEach((track) => track.stop());
      activeCameraStream = stream;
      setStatus("#gigStatus", "Studio camera lane is armed and ready for the live screen.");
    } catch {
      setStatus("#gigStatus", "Browser camera permission is required before live video can start.");
    }
  });
  qs("#studioRefreshDevicesBtn")?.addEventListener("click", () => {
    refreshStudioDeviceInventory();
  });
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
  setStatus("#mixExportStatus", "20% · Reading all active motherboards...");
  const srcCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = new Map();
  try {
    for (const placement of active) {
      const audio = placementAudioFiles.find((item) => item.id === placement.audioId);
      if (!audio || decoded.has(audio.id)) continue;
      const arr = await fetch(audio.url).then((r) => r.arrayBuffer());
      const buffer = await srcCtx.decodeAudioData(arr.slice(0));
      decoded.set(audio.id, buffer);
      setStatus("#mixExportStatus", `40% · Loaded ${decoded.size} source file${decoded.size === 1 ? "" : "s"} into the mix.`);
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
  setStatus("#mixExportStatus", "60% · Aligning the waveforms across the motherboards...");
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
  setStatus("#mixExportStatus", "80% · Rendering the full SupportRD studio export...");
  const rendered = await offline.startRendering();
  const blob = audioBufferToWavBlob(rendered);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  lastRenderedMixBlob = blob;
  lastRenderedMixName = `supportrd-constructed-mix-${stamp}.wav`;
  setStatus("#mixExportStatus", `100% · Mix ready: ${lastRenderedMixName}`);
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
  let mixObjectUrl = "";
  studioTransportAudio = audio;
  audio.preload = "auto";
  audio.loop = false;

  const hasConstructedSession = () => placements.some((item) => item.audioId && Number.isFinite(Number(item.timeSec)));
  const getSelectedPlacementSource = () => {
    const placement = getSelectedPlacement();
    const source = getPlacementAudioSource(placement);
    if (!placement || !source?.url) return null;
    return {
      title: placement.audioName || source.name || "Selected placement",
      src: source.url,
      placementId: placement.id
    };
  };

  const revokeMixObjectUrl = () => {
    if (!mixObjectUrl) return;
    try { URL.revokeObjectURL(mixObjectUrl); } catch {}
    mixObjectUrl = "";
  };

  const getSessionPlaylist = () => {
    const fromBoards = placements
      .map((placement) => {
        const source = getPlacementAudioSource(placement);
        if (!source?.url) return null;
        return {
          title: placement.audioName || source.name || "Session Clip",
          src: source.url,
          placementId: placement.id
        };
      })
      .filter(Boolean);
    return fromBoards.length ? fromBoards : playlist;
  };

  const updateTrackUi = (message) => {
    const activeList = getSessionPlaylist();
    const current = activeList[index] || activeList[0];
    track.textContent = current ? `Track ${Math.min(index + 1, activeList.length)}/${activeList.length}: ${current.title}` : "No active track";
    status.textContent = message;
  };

  const load = (nextIndex) => {
    const activeList = getSessionPlaylist();
    if (!activeList.length) {
      audio.removeAttribute("src");
      playBtn.textContent = "Play";
      updateTrackUi("Import or record audio to begin playback.");
      return;
    }
    index = (nextIndex + activeList.length) % activeList.length;
    const current = activeList[index];
    audio.pause();
    audio.src = current.src;
    audio.currentTime = 0;
    playBtn.textContent = "Play";
    updateTrackUi(`Ready: ${current.title}`);
    if (current.placementId) {
      selectedPlacementId = current.placementId;
      const placement = placements.find((item) => item.id === current.placementId);
      if (placement?.audioId) {
        selectedTimelineAudioId = placement.audioId;
        renderPlacementAudioOptions();
      }
      renderPlacements();
    }
  };

  const loadPlacement = (placementId) => {
    const activeList = getSessionPlaylist();
    const placementIndex = activeList.findIndex((item) => item.placementId === placementId);
    if (placementIndex >= 0) {
      load(placementIndex);
      return true;
    }
    return false;
  };

  const play = async () => {
    try {
      const selectedSource = getSelectedPlacementSource();
      if (selectedSource) {
        revokeMixObjectUrl();
        audio.pause();
        audio.src = selectedSource.src;
        audio.currentTime = 0;
        playBtn.textContent = "Play";
        track.textContent = `Selected Clip: ${selectedSource.title}`;
        status.textContent = "Playing the selected motherboard clip."
      } else if (hasConstructedSession()) {
        const built = await buildConstructedMix();
        if (built?.blob) {
          revokeMixObjectUrl();
          mixObjectUrl = URL.createObjectURL(built.blob);
          audio.pause();
          audio.src = mixObjectUrl;
          audio.currentTime = 0;
          track.textContent = `Full Mix: ${built.fileName}`;
          status.textContent = "Playing the full motherboard mix from the beginning."
        }
      } else if (!audio.src) {
        load(index);
      }
      await audio.play();
      playBtn.textContent = "Pause";
      if (selectedSource) {
        status.textContent = `Now playing selected clip: ${selectedSource.title}`
      } else if (hasConstructedSession()) {
        status.textContent = "Now playing the combined motherboard mix."
      } else {
        const activeList = getSessionPlaylist();
        updateTrackUi(`Now playing: ${(activeList[index] || activeList[0])?.title || "Session audio"}`);
      }
    } catch {
      updateTrackUi("Tap Play again to allow audio.");
    }
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    playBtn.textContent = "Play";
    if (getSelectedPlacementSource()) {
      status.textContent = "Stopped the selected motherboard clip."
      return;
    }
    if (hasConstructedSession()) {
      status.textContent = "Stopped the full motherboard mix."
      return;
    }
    const activeList = getSessionPlaylist();
    updateTrackUi(`Stopped: ${(activeList[index] || activeList[0])?.title || "Session audio"}`);
  };

  const stepTrack = async (delta) => {
    if (getSelectedPlacementSource()) {
      audio.currentTime = Math.max(0, (audio.currentTime || 0) + (delta < 0 ? -5 : 5));
      status.textContent = `${delta < 0 ? "Rewound" : "Moved forward"} 5 seconds on the selected clip.`
      return;
    }
    if (hasConstructedSession()) {
      audio.currentTime = 0;
      if (!audio.paused) await play();
      else status.textContent = "Full mix reset to the beginning."
      return;
    }
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
      const activeList = getSessionPlaylist();
      updateTrackUi(`Paused: ${(activeList[index] || activeList[0])?.title || "Session audio"}`);
    }
  });

  stopBtn.addEventListener("click", stop);
  prevBtn.addEventListener("click", async () => { await stepTrack(-1); });
  nextBtn.addEventListener("click", async () => { await stepTrack(1); });
  audio.addEventListener("ended", async () => {
    if (getSelectedPlacementSource()) {
      stop();
      return;
    }
    if (hasConstructedSession()) {
      stop();
      return;
    }
    await stepTrack(1);
    if (getSessionPlaylist().length === 1) {
      stop();
    }
  });

  load(0);
  window.__studioRadio = {
    play,
    stop,
    prev: async () => { await stepTrack(-1); },
    next: async () => { await stepTrack(1); },
    refresh: () => load(index),
    loadPlacement,
    playPlacement: async (placementId) => {
      if (loadPlacement(placementId)) {
        await play();
      }
    },
    seekRelative: (seconds = 0) => {
      try {
        const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
        audio.currentTime = Math.max(0, Math.min(duration, (audio.currentTime || 0) + seconds));
      } catch {}
    }
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
  const payload = captureSessionState();
  payload.updated_at = new Date().toISOString();
  persistRecentSessionSave(payload);
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
    setStatus("#recentSessionStatus", `Saved: ${currentSessionId}`);
  } catch {
    currentSessionId = payload.session_id;
    localStorage.setItem("studioSessionId", currentSessionId);
    setStatus("#lyricsStatus", `Saved locally: ${currentSessionId}`);
    setStatus("#recentSessionStatus", `Saved locally: ${currentSessionId}`);
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
    applySessionState(data.payload, `Loaded: ${currentSessionId}`);
  } catch {
    const local = recentSessionSaves.find((item) => item.snapshot?.session_id === currentSessionId);
    if (local) {
      applySessionState(local.snapshot, `Loaded local save: ${currentSessionId}`);
      return;
    }
    setStatus("#lyricsStatus", "Load failed.");
  }
}
function updateLiveWaveFromMic() {
  const placement = placements.find((item) => item.id === currentRecordingPlacementId);
  if (!placement) return;
  if (currentAnalyser && currentWaveProbe) {
    currentAnalyser.getFloatTimeDomainData(currentWaveProbe);
    const chunkSize = Math.max(1, Math.floor(currentWaveProbe.length / 56));
    const nextWave = [];
    for (let i = 0; i < 56; i += 1) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, currentWaveProbe.length);
      let peak = 0;
      let energy = 0;
      let count = 0;
      for (let j = start; j < end; j += 1) {
        const value = Number(currentWaveProbe[j] || 0);
        const abs = Math.abs(value);
        if (abs > peak) peak = abs;
        energy += value * value;
        count += 1;
      }
      const rms = count ? Math.sqrt(energy / count) : 0;
      const shaped = Math.max(rms * 1.45, peak * 0.95);
      const cinematic = 12 + Math.round(Math.pow(Math.min(1, shaped * 2.3), 0.78) * 86);
      nextWave.push(Math.max(12, Math.min(98, cinematic)));
    }
    placement.waveData = nextWave;
  } else {
    placement.waveData = generateWaveData("Live", 56, "live", 1);
  }
  placement.durationSec = Math.min(45, (placement.durationSec || 2) + 0.25);
  renderPlacements();
}

async function startRecording() {
  if (isRecording) return;
  try {
    currentMicStream = await ensureStudioDeviceReady({ audio: true, source: "studio" });
    const micLabel = currentMicStream?.getAudioTracks?.()[0]?.label || studioDeviceState.micLabel || "your microphone";
    currentAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = currentAudioContext.createMediaStreamSource(currentMicStream);
    currentAnalyser = currentAudioContext.createAnalyser();
    currentAnalyser.fftSize = 2048;
    currentAnalyser.smoothingTimeConstant = 0.82;
    currentWaveProbe = new Float32Array(currentAnalyser.fftSize);
    source.connect(currentAnalyser);

    recordingChunks = [];
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4"
    ].find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
    mediaRecorder = mimeType ? new MediaRecorder(currentMicStream, { mimeType }) : new MediaRecorder(currentMicStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordingChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
      const placement = placements.find((item) => item.id === currentRecordingPlacementId);
      if (placement) {
        const audioId = Date.now() + Math.floor(Math.random() * 1000);
        const url = URL.createObjectURL(blob);
        const recordedName = `Recorded-${new Date().toISOString().slice(11, 19).replace(/:/g, "-")}.webm`;
        placementAudioFiles.push({
          id: audioId,
          name: recordedName,
          url,
          type: blob.type || "audio/webm",
          durationSec: placement.durationSec || 6,
          waveData: placement.waveData || generateWaveData("Recorded", 48, "live", 1)
        });
        placement.audioId = audioId;
        placement.audioName = recordedName;
        placement.live = false;
        selectedTimelineAudioId = audioId;
        selectedPlacementId = placement.id;
      }
      currentMicStream?.getTracks().forEach((track) => track.stop());
      currentAudioContext?.close?.();
      currentMicStream = null;
      currentAudioContext = null;
      currentAnalyser = null;
      currentWaveProbe = null;
      renderPlacementAudioOptions();
      renderPlacements();
      window.__studioRadio?.loadPlacement?.(placement?.id || 0);
      window.__studioRadio?.refresh?.();
      renderProfileStats();
      setStatus("#placementStatus", `Recording saved to ${placement?.trackId || "the selected motherboard"}.`);
    };

    const targetTrack = selectedTrackId || trackState[0]?.id || ensureTrack("recorded");
    const placement = createPlacement("recorded", {
      trackId: targetTrack,
      live: true,
      audioName: "Live Recording",
      durationSec: 2,
      waveData: generateWaveData("Live", 48, "live", 1)
    });
    currentRecordingPlacementId = placement.id;
    selectedTrackId = targetTrack;
    mediaRecorder.start(200);
    isRecording = true;
    qs("#recordMainBtn")?.classList.add("is-recording");
    qs("#timelineRecordBtn")?.classList.add("is-recording");
    recordingTick = setInterval(updateLiveWaveFromMic, 220);
    setStatus("#placementStatus", `Recording ON · ${micLabel} is live and the waveform is drawing now.`);
  } catch {
    setStatus("#placementStatus", "Recording needs browser microphone permission before the booth can go live.");
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
  qs("#addMotherboardBtn")?.addEventListener("click", () => { const track = addTrack("recorded"); selectedTrackId = track.id; renderPlacements(); });
  qs("#createBlankMotherboardBtn")?.addEventListener("click", () => { const track = addTrack("blank"); selectedTrackId = track.id; renderPlacements(); });
  qs("#deleteMotherboardBtn")?.addEventListener("click", deleteLastMotherboard);
  qs("#attachAudioToPlacementBtn")?.addEventListener("click", () => {
    let placementId = Number(qs("#placementSelect")?.value || selectedPlacementId || 0);
    const audio = placementAudioFiles.find((item) => item.id === selectedTimelineAudioId);
    if (!audio) {
      setStatus("#placementStatus", "Arm an imported clip first.");
      return;
    }
    let placement = placements.find((item) => item.id === placementId);
    if (!placement) {
      placement = createPlacement("mp3", { audio, audioName: audio.name, durationSec: audio.durationSec || 8, trackId: selectedTrackId || undefined });
      placementId = placement.id;
    }
    pushUndoSnapshot(`Attach ${audio.name}`);
    placement.audioId = audio.id;
    placement.audioName = audio.name;
    placement.durationSec = audio.durationSec || placement.durationSec || 6;
    placement.waveData = audio.waveData || generateWaveData(audio.name, 48, placement.kind === "instrument" ? "instrument" : "steady", 1);
    renderPlacements();
    window.__studioRadio?.refresh?.();
    setStatus("#placementStatus", `Placed ${audio.name} on ${placement.trackId}.`);
  });
  qs("#placementAudioUpload")?.addEventListener("change", async () => {
    const files = Array.from(qs("#placementAudioUpload")?.files || []);
    if (!files.length) return;
    for (const file of files) {
      const ok = String(file.name || "").match(/\.(mp3|m4a|wav|aac|ogg)$/i) || (file.type || "").startsWith("audio/");
      if (!ok) continue;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const url = URL.createObjectURL(file);
      const entry = {
        id,
        name: file.name,
        url,
        type: file.type || "audio/*",
        durationSec: 8,
        waveData: generateWaveData(file.name, 64, "steady", 1)
      };
      const decoded = await decodeAudioVisual(file);
      if (decoded) {
        entry.durationSec = decoded.durationSec;
        entry.waveData = decoded.waveData;
      }
      placementAudioFiles.push(entry);
      selectedTimelineAudioId = entry.id;
      const targetTrackId = selectedTrackId || trackState[0]?.id || ensureTrack("mp3");
      const placement = createPlacement("mp3", {
        audio: entry,
        audioName: entry.name,
        durationSec: entry.durationSec || 8,
        trackId: targetTrackId,
        waveData: entry.waveData || generateWaveData(entry.name, 64, "steady", 1)
      });
      placement.audioId = entry.id;
    }
    renderPlacementAudioOptions();
    renderPlacements();
    window.__studioRadio?.refresh?.();
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
      if (cmd === "stop") {
        stopRecording();
        window.__studioRadio?.stop?.();
        transportStatus.textContent = "Stopped current recording and default player.";
        return;
      }
      if (cmd === "play") { window.__studioRadio?.play?.(); }
      if (cmd === "next") { window.__studioRadio?.next?.(); }
      if (cmd === "rewind") { window.__studioRadio?.seekRelative?.(-5); }
      if (cmd === "forward") { window.__studioRadio?.seekRelative?.(5); }
      transportStatus.textContent = `Transport: ${cmd.toUpperCase()} ready near the motherboard.`;
    });
  });
}

function setupBots() {
  qs("#studioJakeOrb")?.addEventListener("click", () => {
    const overlay = qs("#studioGuideOverlay");
    if (overlay) overlay.hidden = false;
    setStatus("#guideOverlayTitle", "Pro Jake");
    setStatus("#guideOverlayStatus", "Pro Jake is live: select a motherboard, add an MP3 or record live, then shape the booth with FX and export.");
    setStatus("#botResponseStatus", "Pro Jake: I’m live in the booth. Pick a motherboard, bring in your sound, and I’ll guide the session.");
  });
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
  const runGigLoad = async () => {
    const slider = qs("#gigConnectorLoad");
    const shell = qs("#gigEditorShell");
    const shellStatus = qs("#gigEditorStatus");
    const boardStat = qs("#gigBoardStat");
    const page = qs(".studio-page");
    const opener = qs("#gigConnectorBtn");
    const steps = [12, 24, 38, 55, 72, 85, 100];
    page?.classList.add("gig-active");
    if (opener) opener.textContent = "Close Gig Connector";
    for (const step of steps) {
      if (slider) slider.value = String(step);
      setStatus("#gigStatus", `Gig 4K Record loading ${step}%...`);
      if (shellStatus) shellStatus.textContent = `Gig 4K Record loading ${step}%...`;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    if (shell) shell.hidden = false;
    if (boardStat) boardStat.textContent = String(trackState.length);
    setStatus("#gigStatus", "Gig connector ready. Dual-panel editor is open in the middle of the page.");
    if (shellStatus) shellStatus.textContent = "Dual-panel video editor is live. Edit on one side, watch on the other.";
    renderGigPreviewSummary();
    shell?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const gigMessages = {
    gigCutBtn: "Cut ready across the live stream and connected motherboards.",
    gigHighlightBtn: "Highlight points marked for fast scene review.",
    gigEraseBtn: "Erase tool armed for selected scene slices.",
    gigExtendBtn: "Extend mode applied to the current scene timing.",
    gigCompactBtn: "Compact mode tightened the current scene layout.",
    gigEffectBtn: "Effect layer added to the dual-panel session.",
    gigSpeedBtn: "Speed controls are active for the current gig stream.",
    gigSlowBtn: "Slow motion panel is shaping the current shot.",
    gigPanoramaBtn: "Panorama view is stretching the frame smoothly.",
    gigDroneBtn: "4K drone pass armed for the live connector.",
    gigZoomInBtn: "Zoom in locked on the active scene.",
    gigZoomOutBtn: "Zoom out opened the whole action view.",
    gigReactiveBtn: "Reactive camera mode is following the session energy."
  };

  qs("#gigConnectorBtn")?.addEventListener("click", () => {
    if (qs(".studio-page")?.classList.contains("gig-active")) {
      qs("#closeGigEditorBtn")?.click();
      return;
    }
    runGigLoad();
  });
  qs("#gigRecordBtn")?.addEventListener("click", runGigLoad);
  qs("#studioGigLocalBtn")?.addEventListener("click", runGigLoad);
  qs("#cameraAccessBtn")?.addEventListener("click", async () => {
    try {
      activeCameraStream?.getTracks()?.forEach((track) => track.stop());
      activeCameraStream = await ensureStudioDeviceReady({ video: true, source: "studio" });
      setStatus("#gigStatus", "Camera access is live. Kodak, Samsung, iPhone, and drone-ready preview is armed.");
      setStatus("#gigEditorStatus", "Camera stream is connected for the Gig 4K session.");
    } catch {
      setStatus("#gigStatus", "Camera access needs permission before the Gig panel can use live visuals.");
    }
  });
  qs("#closeGigEditorBtn")?.addEventListener("click", () => {
    const shell = qs("#gigEditorShell");
    const page = qs(".studio-page");
    const opener = qs("#gigConnectorBtn");
    if (shell) shell.hidden = true;
    page?.classList.remove("gig-active");
    if (opener) opener.textContent = "Open Gig Connector";
    setStatus("#gigStatus", "Returned to the main booth view.");
  });
  qs("#gigVideoUpload")?.addEventListener("change", () => {
    const files = Array.from(qs("#gigVideoUpload")?.files || []);
    handleGigVideoFiles(files);
    qs("#gigVideoUpload").value = "";
  });
  Object.entries(gigMessages).forEach(([id, message]) => {
    qs(`#${id}`)?.addEventListener("click", () => setStatus("#gigEditorStatus", message));
  });
}

function applyFxToSelection() {
  const placement = placements.find((item) => item.id === selectedPlacementId);
  if (!placement) {
    setStatus("#placementStatus", "Highlight a wave clip first to add an effect.");
    return;
  }
  const mode = qs("#fxPreset")?.value || "echo";
  placement.wave = mode;
  placement.waveData = generateWaveData(`${placement.audioName}-${mode}`, 64, placement.kind === "instrument" ? "instrument" : placement.kind === "recorded" ? "live" : "steady", 1.08);
  renderPlacements();
  setStatus("#placementStatus", `Effect applied: ${mode.toUpperCase()} on ${placement.audioName || 'selected clip'}.`);
}

function setupStickyWorkbench() {
  const stickyBar = qs("#stickyEditorBar");
  const stickyGigBar = qs("#stickyGigBar");
  const boardZone = qs(".board-stage-card");
  const undoPanel = qs("#undoHistory");
  const gigShell = qs("#gigEditorShell");
  const page = qs(".studio-page");
  const footer = qs(".studio-footer");
  const updateStickyState = () => {
    const boardRect = boardZone?.getBoundingClientRect();
    const undoRect = undoPanel?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const gigAlways = Boolean(page?.classList.contains("gig-active"));
    const inBoardZone = Boolean(
      boardRect &&
      boardRect.top < 180 &&
      boardRect.bottom > 220 &&
      (!undoRect || undoRect.top > 70) &&
      (!footerRect || footerRect.top > 160)
    );
    stickyEditorVisible = inBoardZone && !gigAlways;
    if (stickyBar) stickyBar.hidden = !stickyEditorVisible;
    const gigActive = Boolean(
      gigAlways &&
      gigShell &&
      !gigShell.hidden
    );
    stickyGigVisible = gigActive;
    if (stickyGigBar) stickyGigBar.hidden = !gigActive;
    page?.classList.toggle("sticky-editor-live", stickyEditorVisible || gigActive);
    updateSelectedBoardLabels();
  };

  qsa('[data-sticky-transport]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cmd = btn.getAttribute('data-sticky-transport');
      if (cmd === 'back') {
        undoLastAction();
        return;
      }
      if (cmd === 'stop') {
        await stopRecording();
        window.__studioRadio?.stop?.();
        setStatus('#transportStatus', 'Stopped current recording and the active motherboard playback.');
        return;
      }
      if (cmd === 'play') await window.__studioRadio?.play?.();
      if (cmd === 'next') await window.__studioRadio?.next?.();
      if (cmd === 'rewind') window.__studioRadio?.seekRelative?.(-5);
      if (cmd === 'forward') window.__studioRadio?.seekRelative?.(5);
      playUiClickSound(cmd === 'play' ? 'accent' : 'soft');
      setStatus('#transportStatus', `Transport: ${String(cmd || '').toUpperCase()} ready on the active motherboard.`);
    });
  });
  qs('[data-sticky-record]')?.addEventListener('click', async () => {
    playUiClickSound('accent');
    if (isRecording) await stopRecording();
    else await startRecording();
  });
  qs('#stickyImportBtn')?.addEventListener('click', () => qs('#placementAudioUpload')?.click());
  qs('#stickyGigVideoUpload')?.addEventListener('change', (event) => {
    handleGigVideoFiles(Array.from(event.target.files || []));
    event.target.value = '';
  });
  qs('#stickyInstrumentBtn')?.addEventListener('click', () => {
    createPlacement('instrument', {
      trackId: selectedTrackId || undefined,
      waveData: generateWaveData('Instrument', 64, 'instrument', 1.08)
    });
    updateSelectedBoardLabels();
  });
  qs('#stickyNewBoardBtn')?.addEventListener('click', () => {
    const track = addTrack('blank');
    selectedTrackId = track.id;
    renderPlacements();
    updateSelectedBoardLabels();
    setStatus('#motherboardStatus', `${track.title} created and selected.`);
  });
  qs('#stickySelectedBoardBtn')?.addEventListener('click', () => {
    const selected = getSelectedTrack();
    if (selected) setStatus('#motherboardStatus', `${selected.title} is active. Import, record, or edit on this motherboard.`);
  });
  qs('#stickyUndoBtn')?.addEventListener('click', () => undoLastAction());
    qs('#stickyDeleteBtn')?.addEventListener('click', () => {
      if (selectedWaveRegion && selectedWaveRegion.placementId === selectedPlacementId) {
        deleteSelectedWaveRegion();
        return;
      }
      const id = Number(qs('#placementSelect')?.value || selectedPlacementId || 0);
      if (id) removePlacement(id);
    });
  qs('#stickyFxBtn')?.addEventListener('click', applyFxToSelection);
  qs('#stickyZoomInBtn')?.addEventListener('click', () => setTimelineZoom(0.25));
  qs('#stickyZoomOutBtn')?.addEventListener('click', () => setTimelineZoom(-0.25));
  qs('#stickyTrimLeftBtn')?.addEventListener('click', () => trimSelectedPlacement('left'));
  qs('#stickyTrimRightBtn')?.addEventListener('click', () => trimSelectedPlacement('right'));
  qs('#stickyBoardBtn')?.addEventListener('click', () => qs('#fxBoardStatus')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

  const gigButtonMap = {
    cut: '#gigCutBtn',
    highlight: '#gigHighlightBtn',
    erase: '#gigEraseBtn',
    effect: '#gigEffectBtn',
    speed: '#gigSpeedBtn',
    off: '#closeGigEditorBtn',
    play: '[data-sticky-transport="play"]',
    stop: '[data-sticky-transport="stop"]',
    record: '[data-sticky-record]',
    slow: '#gigSlowBtn',
    panorama: '#gigPanoramaBtn',
    drone: '#gigDroneBtn',
    'zoom-in': '#gigZoomInBtn',
    'zoom-out': '#gigZoomOutBtn',
    reactive: '#gigReactiveBtn'
  };
    qsa('[data-gig-main],[data-gig-live]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-gig-main') || btn.getAttribute('data-gig-live');
        const target = qs(gigButtonMap[key]);
        playUiClickSound(key === 'record' || key === 'play' ? 'accent' : 'soft');
        target?.click();
      });
    });

  document.addEventListener('keydown', (event) => {
    const targetTag = event.target?.tagName || '';
    if (['INPUT','TEXTAREA','SELECT'].includes(targetTag)) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedPlacementId) {
        event.preventDefault();
        if (selectedWaveRegion && selectedWaveRegion.placementId === selectedPlacementId) {
          deleteSelectedWaveRegion();
        } else {
          removePlacement(selectedPlacementId);
        }
      }
    });

  window.addEventListener('scroll', updateStickyState, { passive: true });
  window.addEventListener('resize', updateStickyState);
  updateStickyState();
}
function runGuideDemo(mode = "visual") {
  const overlay = qs("#studioGuideOverlay");
  const title = qs("#guideOverlayTitle");
  const status = qs("#guideOverlayStatus");
  const targets = mode === "settings"
    ? [qs(".studio-main-bar"), qs(".profile-launch-card"), qs(".board-stage-card")]
    : [qs(".board-stage-card"), qs("#gigEditorShell"), qs(".studio-guidance-card")];
  if (!overlay || !title || !status) return;
  if (currentGuideTimer) {
    clearTimeout(currentGuideTimer);
    currentGuideTimer = null;
  }
  overlay.hidden = false;
  title.textContent = mode === "settings" ? "Settings Bot" : "Visual Bot";
  status.textContent = mode === "settings" ? "Running a settings walkthrough." : "Running a visual workflow walkthrough.";
  setStatus("#botResponseStatus", mode === "settings"
    ? "Settings Bot is showing where to control the studio, mic, FX, save flow, and Gig options."
    : "Visual Bot is showing waveform editing, Gig mode, and live scene controls.");
  let delay = 0;
  targets.filter(Boolean).forEach((target, index) => {
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      status.textContent = `Step ${index + 1}: ${target.querySelector("h2,h3")?.textContent || "Studio section"}`;
    }, delay);
    delay += 1200;
  });
  currentGuideTimer = setTimeout(() => {
    overlay.hidden = true;
  }, delay + 600);
}

function setupProfileAndMain() {
  const openProfile = () => {
    qs("#studioProfileOverlay")?.removeAttribute("hidden");
    document.body.classList.add("profile-open");
  };
  const closeProfile = () => {
    qs("#studioProfileOverlay")?.setAttribute("hidden", "hidden");
    document.body.classList.remove("profile-open");
  };
  qs("#openProfilePanelBtn")?.addEventListener("click", openProfile);
  qs("#studioProfileLocalBtn")?.addEventListener("click", openProfile);
  qs("#closeProfilePanelBtn")?.addEventListener("click", closeProfile);
  qs("#saveProfileStatusBtn")?.addEventListener("click", () => {
    const post = qs("#profileStatusPost")?.value?.trim() || "Studio profile updated.";
    setStatus("#profileMiniPost", post);
    closeProfile();
  });
  qs("#profileAvatarUpload")?.addEventListener("change", () => {
    const file = qs("#profileAvatarUpload")?.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    qsa("#profileAvatarPreview, .profile-launch-card .profile-avatar").forEach((node) => {
      node.style.backgroundImage = `url("${url}")`;
      node.classList.add("has-image");
      node.textContent = "";
    });
    setStatus("#profileMiniPost", "Profile picture updated for the studio profile.");
  });
  qs("#studioMainSaveBtn")?.addEventListener("click", saveSession);
  qs("#studioMainExportBtn")?.addEventListener("click", () => exportSessionSnapshot(captureSessionState(), `supportrd-session-${Date.now()}.json`));
  qs("#studioMainUndoBtn")?.addEventListener("click", undoLastAction);
  qs("#studioMainSettingsBtn")?.addEventListener("click", () => qs(".board-stage-card")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioMainInstrumentBtn")?.addEventListener("click", () => qs("#stickyInstrumentBtn")?.click());
  qs("#studioMainFxBtn")?.addEventListener("click", () => qs("#fxBoardStatus")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioMainVideoBtn")?.addEventListener("click", () => qs("#gigStatus")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioMainDroneBtn")?.addEventListener("click", () => qs("#gigDroneBtn")?.click());
  qs("#studioMainMenuBtn")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  qs("#visualGuideBotBtn")?.addEventListener("click", () => runGuideDemo("visual"));
  qs("#settingsGuideBotBtn")?.addEventListener("click", () => runGuideDemo("settings"));
  const closeGuide = () => {
    if (currentGuideTimer) {
      clearTimeout(currentGuideTimer);
      currentGuideTimer = null;
    }
    qs("#studioGuideOverlay")?.setAttribute("hidden", "hidden");
  };
  qs("#closeGuideBotBtn")?.addEventListener("click", closeGuide);
  qs("#closeGuideOverlayBtn")?.addEventListener("click", closeGuide);
}
function setupUtilityButtons() {
  qsa("#studioMainBar button, #studioUtilityBar button").forEach((btn) => {
    btn.addEventListener("click", () => playUiClickSound("soft"));
  });
  qs("#studioSettingsLocalBtn")?.addEventListener("click", () => qs("#motherboardStatus")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioBlogLocalBtn")?.addEventListener("click", () => qs("#lyricsInput")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioPurchaseLocalBtn")?.addEventListener("click", () => {
    qs("#studioPurchaseOverlay")?.removeAttribute("hidden");
  });
  qs("#studioProfileLocalBtn")?.addEventListener("click", () => qs("#openProfilePanelBtn")?.click());
  qs("#studioGigLocalBtn")?.addEventListener("click", () => qs("#gigStatus")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  qs("#studioFloatLocalBtn")?.addEventListener("click", () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "open-float-mode" }, "*");
    }
  });
  const shiftTheme = (delta) => {
    currentTheme = (currentTheme + delta + THEMES.length) % THEMES.length;
    document.body.classList.remove("theme-signal", "theme-ember");
    if (THEMES[currentTheme]) document.body.classList.add(THEMES[currentTheme]);
    setStatus("#motherboardStatus", "Theme shifted across the whole studio glass layout.");
  };
  qs("#studioThemePrevBtn")?.addEventListener("click", () => shiftTheme(-1));
  qs("#studioThemeNextBtn")?.addEventListener("click", () => shiftTheme(1));
  qs("#saveBoardBtn")?.addEventListener("click", saveSession);
  qs("#exportBoardBtn")?.addEventListener("click", () => {
    const snapshot = captureSessionState();
    exportSessionSnapshot(snapshot, `supportrd-session-${Date.now()}.json`);
    setStatus("#recentSessionStatus", "Exported current motherboard session.");
  });
  qs("#exportSessionStateBtn")?.addEventListener("click", () => {
    const snapshot = captureSessionState();
    exportSessionSnapshot(snapshot, `supportrd-session-${Date.now()}.json`);
    setStatus("#recentSessionStatus", "Exported current motherboard session.");
  });
  qs("#loadRecentSessionBtn")?.addEventListener("click", () => {
    const idx = Number(qs("#recentSessionSelect")?.value || -1);
    const item = recentSessionSaves[idx];
    if (!item) return;
    applySessionState(item.snapshot, `Loaded saved file: ${item.name}`);
  });
  qs("#replaceRecentSessionBtn")?.addEventListener("click", () => {
    const idx = Number(qs("#recentSessionSelect")?.value || -1);
    const item = recentSessionSaves[idx];
    if (!item) return;
    pushUndoSnapshot("Replace motherboard session");
    applySessionState(item.snapshot, `Replaced current session with: ${item.name}`);
  });
  qs("#exportRecentSessionBtn")?.addEventListener("click", () => {
    const idx = Number(qs("#recentSessionSelect")?.value || -1);
    const item = recentSessionSaves[idx];
    if (!item) return;
    exportSessionSnapshot(item.snapshot, `${item.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`);
    setStatus("#recentSessionStatus", `Exported saved file: ${item.name}`);
  });
  qs("#undoStudioBtn")?.addEventListener("click", undoLastAction);
  qs("#restoreDeletedBtn")?.addEventListener("click", restoreDeletedAction);
  qs("#toggleBoardMenuBtn")?.addEventListener("click", () => {
    const select = qs("#boardCollapseMode");
    if (!select) return;
    select.value = select.value === "all" ? "4" : "all";
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
  qs("#closePurchasePanelBtn")?.addEventListener("click", () => qs("#studioPurchaseOverlay")?.setAttribute("hidden", "hidden"));
  qs("#purchasePremium100Btn")?.addEventListener("click", () => {
    setStatus("#purchasePremiumStatus", "Jake Premium Studio $100 selected. Opening the live Shopify product lane now.");
    try {
      if(window.top){
        window.top.location.href = STUDIO_PREMIUM_URL;
        return;
      }
    } catch {}
    window.location.href = STUDIO_PREMIUM_URL;
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupStudioAccessGate();
  setStudioLocked(true, {
    copy: "Checking SupportRD login and Jake Premium Studio access...",
    meta: "Studio API is waking up.",
    hideLogin: true,
    hideUpgrade: true
  });
  try {
    recentSessionSaves = JSON.parse(localStorage.getItem("studioRecentSessionSaves") || "[]");
    if (!Array.isArray(recentSessionSaves)) recentSessionSaves = [];
  } catch {
    recentSessionSaves = [];
  }
  renderRecentSessionSaves();
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
  setupProfileAndMain();
  setupStickyWorkbench();
  renderPlacementAudioOptions();
  renderPlacements();
  renderProfileStats();
  renderUndoHistory();
  updateDbQuickLabel();
  refreshStudioDeviceInventory();
  applyStudioMicProfile();
  refreshStudioJakeAccess({ bootstrap: true });
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
