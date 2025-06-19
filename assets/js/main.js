// Données de la piste en cours
let playlistData = [];
let currentSongIndex = 0;

const AUDIO = document.querySelector("audio");
const TRACK = document.getElementById("track");
const TRACK_TIME = document.getElementById("track-time");
const CURRENT_TIME = document.getElementById("current-time");
const SONG_TITLE = document.getElementById("song_title");
const ARTIST_NAME = document.getElementById("artist_name");
const SONG_PICTURE = document.getElementById("songPicture");
const VOLUME = document.getElementById("volume");
const VISUALIZER_CANVAS = document.getElementById("musicVisualizerCanvas");

/* Visualizer variables */
let audioContext, analyserNode, sourceNode, dataArray, bufferLength;
const FFT_SIZE = 256; // Power of 2, e.g., 64, 128, 256, 512, 1024...


/* Boutons de controle du lecteur */
const PLAY_BTN = document.getElementById("play-btn");
const PAUSE_BTN = document.getElementById("pause-btn");
const NEXT_BTN = document.getElementById("skipF-btn");
const PREVIOUS_BTN = document.getElementById("skipB-btn");
const VOLUME_ICON = document.getElementById("volume_icon");
const VOLUME_OFF = document.getElementById("volume_off");

/**
 * Convertit la durée d'une chanson en minutes et secondes
 * @param {*} duration
 */
function buildDuration(duration) {
  let minutes = Math.floor(duration / 60);
  let reste = duration % 60;
  let seconds = Math.floor(reste);
  seconds = String(seconds).padStart(2, 0);

  return minutes + ":" + seconds;
}

// Play
PLAY_BTN.addEventListener("click", () => {
  if (!audioContext) {
    setupVisualizer();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  AUDIO.volume = VOLUME.value; // Set volume before playing
  AUDIO.play();
  PAUSE_BTN.style.display = "inline-block";
  PLAY_BTN.style.display = "none";
  // TRACK.max should be set by onloadedmetadata in setSongInfos
  drawVisualizer(); // Start visualizer animation
});

// Pause
PAUSE_BTN.addEventListener("click", () => {
  PLAY_BTN.style.display = "inline-block";
  PAUSE_BTN.style.display = "none";
  AUDIO.pause();
  if (audioContext && audioContext.state === 'running') {
    audioContext.suspend();
  }
});

// Timer actuel de la chanson
AUDIO.addEventListener("timeupdate", function () {
  TRACK.value = this.currentTime;
  CURRENT_TIME.textContent = buildDuration(this.currentTime);
});

// Permet de faire avancer la musique en déplaçant le curseur
TRACK.addEventListener("input", function () {
  CURRENT_TIME.textContent = buildDuration(this.value);
  AUDIO.currentTime = this.value;
});

// Volume
VOLUME.addEventListener("click", function () {
  AUDIO.volume = this.value;
});

VOLUME_ICON.addEventListener("click", function () {
  AUDIO.volume = 0;
  VOLUME_ICON.style.display = "none";
  VOLUME_OFF.style.display = "inline-block";
});

VOLUME_OFF.addEventListener("click", function () {
  AUDIO.volume = 1;
  VOLUME_OFF.style.display = "none";
  VOLUME_ICON.style.display = "inline-block";
});

// Bouton Next
NEXT_BTN.addEventListener("click", function () {
  currentSongIndex++;
  if (currentSongIndex >= playlistData.length) {
    currentSongIndex = 0; // Loop to first song
  }
  setSongInfos(currentSongIndex);
  AUDIO.play();
  PAUSE_BTN.style.display = "inline-block";
  PLAY_BTN.style.display = "none";
});

// Bouton Previous
PREVIOUS_BTN.addEventListener("click", function () {
  currentSongIndex--;
  if (currentSongIndex < 0) {
    currentSongIndex = playlistData.length - 1; // Loop to last song
  }
  setSongInfos(currentSongIndex);
  AUDIO.play();
  PAUSE_BTN.style.display = "inline-block";
  PLAY_BTN.style.display = "none";
});

// Récupération et affichage des données de la musique
function setSongInfos(newIndex) {
  currentSongIndex = newIndex;
  const song = playlistData[currentSongIndex];

  if (!song) {
    console.error(`Song not found at index ${currentSongIndex}`);
    return;
  }

  SONG_TITLE.innerHTML = song.title;
  ARTIST_NAME.innerHTML = song.artist;
  SONG_PICTURE.setAttribute("src", song.img);
  AUDIO.src = song.path;

  AUDIO.onloadedmetadata = () => {
    TRACK_TIME.textContent = buildDuration(AUDIO.duration);
    TRACK.max = AUDIO.duration;
  };

  AUDIO.load(); // Load the new audio source
}

// Fetch playlist data once when the page loads
document.addEventListener("DOMContentLoaded", () => {
  fetch("./assets/playlist.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      playlistData = data;
      if (playlistData && playlistData.length > 0) {
        setSongInfos(currentSongIndex); // Load the initial song
      } else {
        console.error("Playlist is empty or invalid.");
      }
    })
    .catch((error) => {
      console.error("Could not fetch playlist:", error);
    });
});

function setupVisualizer() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = FFT_SIZE;
  bufferLength = analyserNode.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  if (!sourceNode) { // Create source node only once
    sourceNode = audioContext.createMediaElementSource(AUDIO);
  }
  sourceNode.connect(analyserNode);
  analyserNode.connect(audioContext.destination);
}

function drawVisualizer() {
  if (!VISUALIZER_CANVAS || !analyserNode || !audioContext || audioContext.state === 'suspended') {
    // If canvas is not there, or audio context not ready/suspended, request frame and exit.
    // This helps to start/resume visualization if it was stopped or not ready.
    if (VISUALIZER_CANVAS && VISUALIZER_CANVAS.getContext('2d')) {
        const canvasCtx = VISUALIZER_CANVAS.getContext('2d');
        canvasCtx.fillStyle = 'rgb(0, 0, 0)'; // Clear to black
        canvasCtx.fillRect(0, 0, VISUALIZER_CANVAS.width, VISUALIZER_CANVAS.height);
    }
    requestAnimationFrame(drawVisualizer);
    return;
  }

  const canvasCtx = VISUALIZER_CANVAS.getContext('2d');
  requestAnimationFrame(drawVisualizer);

  analyserNode.getByteFrequencyData(dataArray); // Get frequency data

  canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Slightly transparent black for a fading trail effect
  canvasCtx.fillRect(0, 0, VISUALIZER_CANVAS.width, VISUALIZER_CANVAS.height);

  const barWidth = (VISUALIZER_CANVAS.width / bufferLength) * 1.5; // Bars are a bit thinner
  let barHeight;
  let x = 0;

  // Colors from CSS variables (or hardcoded if direct access is complex)
  // For subtask simplicity, let's hardcode gamer-style colors.
  const primaryColor = '#00ff00'; // Neon Green
  const secondaryColor = '#ff00ff'; // Neon Pink (for highlights or gradients)
  const peakColor = '#ffffff'; // White for peaks

  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i]; // dataArray values are 0-255

    // Create a gradient for each bar for a more dynamic look
    const gradient = canvasCtx.createLinearGradient(
        x, VISUALIZER_CANVAS.height, x, VISUALIZER_CANVAS.height - barHeight * (VISUALIZER_CANVAS.height / 255)
    );
    gradient.addColorStop(0, primaryColor); // Start color (bottom)
    gradient.addColorStop(0.7, secondaryColor); // Middle color
    gradient.addColorStop(1, barHeight > 200 ? peakColor : secondaryColor); // End color (top), use peakColor for high bars

    canvasCtx.fillStyle = gradient;

    // Scale barHeight to fit canvas height better
    // Let's say canvas height is 60px (as styled). Max dataArray[i] is 255.
    // So, scaledHeight = (barHeight / 255) * canvasHeight
    let scaledHeight = (barHeight / 255) * VISUALIZER_CANVAS.height * 0.9; // Use 90% of canvas height

    // Draw bars from the bottom
    // canvasCtx.fillRect(x, VISUALIZER_CANVAS.height - scaledHeight, barWidth, scaledHeight);

    // --- Alternative: Bars growing from center outwards (symmetric) ---
    // This requires drawing two bars for each data point, one upwards, one downwards,
    // or a single bar centered vertically. Let's do centered bars.

    scaledHeight = (barHeight / 255) * VISUALIZER_CANVAS.height * 0.6; // Max 60% of canvas height for centered bars

    // Glow effect for bars (subtle)
    canvasCtx.shadowBlur = 5;
    canvasCtx.shadowColor = primaryColor;

    // Draw the bar centered vertically
    canvasCtx.fillRect(
        x,
        (VISUALIZER_CANVAS.height / 2) - (scaledHeight / 2),
        barWidth,
        scaledHeight
    );

    // Reset shadow for next drawings if not desired globally
    canvasCtx.shadowBlur = 0;


    x += barWidth + 2; // Add 2 for spacing
  }

  // Optional: Add a central horizontal line for symmetry reference
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, VISUALIZER_CANVAS.height / 2);
  canvasCtx.lineTo(VISUALIZER_CANVAS.width, VISUALIZER_CANVAS.height / 2);
  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Faint white line
  canvasCtx.lineWidth = 1;
  canvasCtx.stroke();
}
