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
const THEME_SWITCHER_BTN = document.getElementById('themeSwitcherBtn');

/* Theme variables */
const THEMES = ['theme-neon', 'theme-cyberpunk', 'theme-pastel'];
let currentThemeIndex = 0;
const THEME_STORAGE_KEY = 'evanMusicStationTheme';

/* Visualizer variables */
let audioContext, analyserNode, sourceNode, dataArray, bufferLength;
const FFT_SIZE = 1024; // Increased from 256 for more bars (will be 512 bars)


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
        // Update to provide more specific error messages in UI
        SONG_TITLE.innerHTML = "Playlist fetch error";
        ARTIST_NAME.innerHTML = `Status: ${res.status}`;
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
        SONG_TITLE.innerHTML = "Playlist not found or empty";
        ARTIST_NAME.innerHTML = "";
      }
    })
    .catch((error) => {
      console.error("Error loading playlist:", error);
      // Ensure error messages are displayed if fetch or processing fails
      if (SONG_TITLE.innerHTML === "Titre de la chanson") { // Check if title was not already set by a more specific error
          SONG_TITLE.innerHTML = "Error loading playlist";
          ARTIST_NAME.innerHTML = error.message.includes("HTTP error") ? error.message : "Check console for details.";
      }
    });

  resizeVisualizerCanvas(); // Call on initial load
  // loadSavedTheme(); // Called at the end of the script instead
});

window.addEventListener('resize', resizeVisualizerCanvas); // Add resize listener

// Theme Functions
function applyTheme(themeName) {
  THEMES.forEach(t => { // Ensure all known theme classes are removed
    if (document.body.classList.contains(t)) {
      document.body.classList.remove(t);
    }
  });
  document.body.classList.add(themeName); // Add the new theme class
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
  currentThemeIndex = THEMES.indexOf(themeName);
}

if (THEME_SWITCHER_BTN) {
  THEME_SWITCHER_BTN.addEventListener('click', () => {
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    applyTheme(THEMES[currentThemeIndex]);
  });
} else {
  // console.log("Theme switcher button not found"); // Optional: for debugging
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme && THEMES.includes(savedTheme)) {
    applyTheme(savedTheme);
  } else {
    applyTheme(THEMES[0]); // Apply default theme (theme-neon)
  }
}
// End Theme Functions

function resizeVisualizerCanvas() {
  if (VISUALIZER_CANVAS) {
    VISUALIZER_CANVAS.width = VISUALIZER_CANVAS.clientWidth;
    VISUALIZER_CANVAS.height = VISUALIZER_CANVAS.clientHeight;
  }
}

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
  resizeVisualizerCanvas(); // Call here to set initial size correctly
}

function drawVisualizer() {
  // Ensure VISUALIZER_CANVAS is valid and get context once per call if possible
  if (!VISUALIZER_CANVAS) {
      requestAnimationFrame(drawVisualizer); // Keep trying if canvas not ready
      return;
  }
  const canvasCtx = VISUALIZER_CANVAS.getContext('2d');
  if (!canvasCtx) { // Should not happen if VISUALIZER_CANVAS is valid
      requestAnimationFrame(drawVisualizer);
      return;
  }

  if (!analyserNode || !audioContext || audioContext.state === 'suspended') {
    let clearBgColor = '#000000'; // Default fallback if no theme applied yet or CSS var missing
    if (document.body.className.includes('theme-')) { // Check if any theme class is present
         try {
            clearBgColor = getComputedStyle(document.body).getPropertyValue('--background_2').trim();
         } catch (e) { /* ignore, use fallback */ }
    }
    canvasCtx.fillStyle = clearBgColor;
    canvasCtx.fillRect(0, 0, VISUALIZER_CANVAS.width, VISUALIZER_CANVAS.height);
    requestAnimationFrame(drawVisualizer);
    return;
  }

  requestAnimationFrame(drawVisualizer);

  analyserNode.getByteFrequencyData(dataArray);

  const bodyStyles = getComputedStyle(document.body);
  // Provide fallbacks for all color properties in case CSS variables are missing temporarily
  const trailColor = bodyStyles.getPropertyValue('--canvas_trail_color').trim() || 'rgba(0,0,0,0.1)'; // Assuming --canvas_trail_color will be added to CSS themes
  const barPrimaryColor = bodyStyles.getPropertyValue('--canvas_visualizer_bar_primary').trim() || '#00ff00';
  const barSecondaryColor = bodyStyles.getPropertyValue('--canvas_visualizer_bar_secondary').trim() || '#ff00ff';
  const barPeakColor = bodyStyles.getPropertyValue('--canvas_visualizer_bar_peak').trim() || '#ffffff';
  const shadowColor = barPrimaryColor;
  const centralLineColor = bodyStyles.getPropertyValue('--text_1').trim() || 'rgba(255,255,255,0.2)';

  canvasCtx.fillStyle = trailColor;
  canvasCtx.fillRect(0, 0, VISUALIZER_CANVAS.width, VISUALIZER_CANVAS.height);

  const spacing = 1;
  const totalSpacing = (bufferLength - 1) * spacing;
  const barWidth = Math.max(1, (VISUALIZER_CANVAS.width - totalSpacing) / bufferLength);
  let barHeight;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i];
    // Gradient extent calculation needs to be robust
    let gradientMaxY = VISUALIZER_CANVAS.height - ((barHeight / 255) * VISUALIZER_CANVAS.height * 0.7);
    if (gradientMaxY < 0) gradientMaxY = 0; // Ensure it doesn't go negative

    const gradient = canvasCtx.createLinearGradient(
        x, VISUALIZER_CANVAS.height, x, gradientMaxY
    );
    gradient.addColorStop(0, barPrimaryColor);
    gradient.addColorStop(0.7, barSecondaryColor);
    gradient.addColorStop(1, barHeight > 200 ? barPeakColor : barSecondaryColor);
    canvasCtx.fillStyle = gradient;

    let scaledHeight = (barHeight / 255) * VISUALIZER_CANVAS.height * 0.7;

    canvasCtx.shadowBlur = 5;
    canvasCtx.shadowColor = shadowColor;

    canvasCtx.fillRect(
        x, (VISUALIZER_CANVAS.height / 2) - (scaledHeight / 2),
        barWidth, scaledHeight
    );

    canvasCtx.shadowBlur = 0;
    x += barWidth + spacing;
  }

  canvasCtx.beginPath();
  canvasCtx.moveTo(0, VISUALIZER_CANVAS.height / 2);
  canvasCtx.lineTo(VISUALIZER_CANVAS.width, VISUALIZER_CANVAS.height / 2);
  canvasCtx.strokeStyle = centralLineColor;
  canvasCtx.lineWidth = 1;
  canvasCtx.stroke();
}

// Make sure this is called after the DOM is ready
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', loadSavedTheme);
} else {
    loadSavedTheme(); // DOM is already ready
}
