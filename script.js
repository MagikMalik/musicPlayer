document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const mainContainer = document.getElementById('main-container');
    const prevButton = document.getElementById('prev-button');
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const nextButton = document.getElementById('next-button');
    const volumeSlider = document.getElementById('volume-slider');
    const audioPlayer = document.getElementById('audio-player');
    const playlistElement = document.getElementById('playlist');
    const visualizerCanvas = document.getElementById('visualizer');
    const fileUpload = document.getElementById('file-upload');
    const genreDropdown = document.getElementById('genre-dropdown'); // For uploading
    const filterGenreDropdown = document.getElementById('filter-genre-dropdown'); // For filtering display
    const currentSongInfoElement = document.getElementById('current-song-info');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const textColorPicker = document.getElementById('text-color-picker');
    const themeSelect = document.getElementById('theme-select');

    // Define theme colors in JS to have a single source of truth for color pickers
    // and for elements not easily styled by pure CSS variables (like canvas).
    const themeColors = {
        light: {
            name: "light", // Ensure lowercase name for consistency with themeSelect.value
            bg: '#eef2f7', // Light grey-blue
            text: '#1a1c20', // Dark grey/black
            accent: '#007bff', // Vibrant blue
            surface: '#ffffff', // White
            visualizerBar: '#1a1c20'
        },
        dark: {
            name: "dark",
            bg: '#121212', // Very dark grey
            text: '#e0e0e0', // Light grey
            accent: '#00f2ff', // Neon cyan
            surface: '#1e1e1e', // Slightly lighter dark
            visualizerBar: '#00f2ff'
        },
        cyberpunk: {
            name: "cyberpunk",
            bg: '#0d0221', // Deep indigo/purple
            text: '#f0f0f0', // Off-white/very light grey
            accent: '#ff00ff', // Neon magenta
            secondaryAccent: '#00f0ff', // Neon cyan for contrast
            surface: '#1a0a3d', // Darker surface
            visualizerBar: '#ff00ff'
        }
        // Custom theme colors are handled by color pickers directly
    };
    const customizationSection = document.getElementById('customization-section');

    const canvasCtx = visualizerCanvas.getContext('2d');
    let audioCtx; // For visualizer
    let analyser; // For visualizer
    let source; // For visualizer

    let currentTrackIndex = 0;
    // Playlist will now store objects: { file: File, name: String, genre: String, id: String, objectURL: String (temporary) }
    // We store 'id' for more reliable tracking than index, especially with filtering.
    // 'objectURL' will be generated on demand for playback.
    let musicLibrary = []; // This will be the main source of truth, persisted to localStorage
    let currentlyDisplayedPlaylist = []; // Could be filtered version of musicLibrary

    // --- Player Controls ---
    playButton.addEventListener('click', () => {
        if (currentlyDisplayedPlaylist.length > 0 && audioPlayer.src) {
            audioPlayer.play().catch(e => console.error("Error playing audio:", e));
        } else if (currentlyDisplayedPlaylist.length > 0 && currentTrackIndex < currentlyDisplayedPlaylist.length) {
            loadAndPlayTrack(currentTrackIndex);
        } else if (musicLibrary.length > 0 && currentlyDisplayedPlaylist.length === 0) {
            // If library has songs but current filter shows none, maybe play from overall library?
            // For now, let's stick to playing from what's displayed.
            alert("No songs in the current view to play. Try changing filters or uploading music.");
        }
        else {
            alert("Please upload some music and select a track.");
        }
    });

    pauseButton.addEventListener('click', () => {
        audioPlayer.pause();
    });

    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value;
    });

    nextButton.addEventListener('click', () => {
        if (currentlyDisplayedPlaylist.length > 0) {
            currentTrackIndex = (currentTrackIndex + 1) % currentlyDisplayedPlaylist.length;
            loadAndPlayTrack(currentTrackIndex);
        }
    });

    prevButton.addEventListener('click', () => {
        if (currentlyDisplayedPlaylist.length > 0) {
            currentTrackIndex = (currentTrackIndex - 1 + currentlyDisplayedPlaylist.length) % currentlyDisplayedPlaylist.length;
            loadAndPlayTrack(currentTrackIndex);
        }
    });

    // --- Audio Loading and Playback ---
    fileUpload.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length === 0) return;
        const selectedGenreForUpload = genreDropdown.value; // Use a distinct variable name

        Array.from(files).forEach(uploadedFile => {
            const existingSongIndex = musicLibrary.findIndex(song => song.name === uploadedFile.name && song.genre === selectedGenreForUpload);

            if (existingSongIndex !== -1) {
                // Song metadata exists, likely from localStorage. Update its File object.
                musicLibrary[existingSongIndex].file = uploadedFile;
                // If it was the currently "broken" track, and it's now re-uploaded, we might want to auto-play it or enable play.
                // For now, just updating the file object is enough. User can click to play.
                alert(`"${uploadedFile.name}" has been updated with the new file data.`);
            } else {
                // Not an existing metadata entry, and not a full duplicate of a song already having a File object.
                // (The `some` check below handles if it's a true new duplicate even with File object)
                 if (!musicLibrary.some(song => song.name === uploadedFile.name && song.genre === selectedGenreForUpload && song.file)) {
                    const songId = Date.now().toString() + Math.random().toString(36).substring(2, 15); // Unique ID
                    const newSong = {
                        file: uploadedFile,
                        name: uploadedFile.name,
                        genre: selectedGenreForUpload,
                        id: songId,
                        type: uploadedFile.type
                    };
                    musicLibrary.push(newSong);
                } else {
                     alert(`Song "${uploadedFile.name}" with genre "${selectedGenreForUpload}" already exists with playable file data.`);
                }
            }
        });

        saveLibraryToLocalStorage(); // Save metadata (File objects are not saved)
        renderPlaylist(); // This will now use currentlyDisplayedPlaylist, so filter needs to be applied
        populateGenreFilter();

        if (audioPlayer.paused && currentlyDisplayedPlaylist.length > 0 && !audioPlayer.src) {
            // If player is paused and nothing loaded, and new songs match current filter, load first.
            if (currentlyDisplayedPlaylist.findIndex(song => song.id === musicLibrary[musicLibrary.length - Array.from(files).length]?.id) !== -1) {
                 loadAndPlayTrack(0); // Or find index of first newly added song in currentlyDisplayedPlaylist
            }
        }
        fileUpload.value = ''; // Reset file input
    });

    function loadAndPlayTrack(trackIndexInDisplayedPlaylist) {
        if (trackIndexInDisplayedPlaylist < 0 || trackIndexInDisplayedPlaylist >= currentlyDisplayedPlaylist.length) return;

        const songToPlay = currentlyDisplayedPlaylist[trackIndexInDisplayedPlaylist];
        if (!songToPlay || !songToPlay.file) {
            alert("This song's file data is not available. Please re-upload if you want to play it.");
            // Attempt to find it in musicLibrary by ID if file is missing (e.g. after localStorage load without File objects)
            // This scenario needs careful handling if we don't re-associate File objects on load.
            // For now, assume .file is available if it's in currentlyDisplayedPlaylist from an upload.
            return;
        }

        // Revoke previous object URL if one exists for this player
        if (audioPlayer.dataset.currentObjectUrl) {
            URL.revokeObjectURL(audioPlayer.dataset.currentObjectUrl);
        }

        const fileURL = URL.createObjectURL(songToPlay.file);
        audioPlayer.src = fileURL;
        audioPlayer.dataset.currentObjectUrl = fileURL; // Store it for later revocation
        audioPlayer.load();
        audioPlayer.play().catch(e => console.error("Error playing audio:", e));

        // Update currentTrackIndex to reflect the index in the currentlyDisplayedPlaylist
        currentTrackIndex = trackIndexInDisplayedPlaylist;

        updateNowPlayingInfo(songToPlay);
        updateNowPlayingHighlight();


        if (!audioCtx) {
            setupVisualizer();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function renderPlaylist(filterGenre = "all") {
        playlistElement.innerHTML = ''; // Clear existing playlist

        if (filterGenre === "all") {
            currentlyDisplayedPlaylist = [...musicLibrary];
        } else {
            currentlyDisplayedPlaylist = musicLibrary.filter(song => song.genre === filterGenre);
        }

        if (currentlyDisplayedPlaylist.length === 0 && filterGenre !== "all") {
             playlistElement.innerHTML = `<li>No songs found for genre: ${filterGenre}. <a href="#" id="show-all-genres">Show all genres</a>.</li>`;
             document.getElementById('show-all-genres')?.addEventListener('click', (e) => {
                e.preventDefault();
                filterGenreDropdown.value = 'all';
                renderPlaylist('all');
             });
             return;
        } else if (musicLibrary.length === 0) {
            playlistElement.innerHTML = '<li>Your music library is empty. Upload some songs!</li>';
            currentlyDisplayedPlaylist = []; // Ensure it's empty
            return;
        }


        currentlyDisplayedPlaylist.forEach((song, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${index + 1}. ${song.name} (${song.genre})`;
            listItem.dataset.songId = song.id; // Use song ID
            listItem.dataset.indexInDisplayed = index; // Store its current index in the displayed list

            listItem.addEventListener('click', () => {
                // Pass the index from the currently displayed (and possibly filtered) list
                loadAndPlayTrack(index);
            });
            playlistElement.appendChild(listItem);
        });
        updateNowPlayingHighlight(); // Update highlighting based on the new list
    }

    function updateNowPlayingInfo(song) {
        if (song) {
            currentSongInfoElement.textContent = `Title: ${song.name} - Genre: ${song.genre}`;
        } else {
            currentSongInfoElement.textContent = "No song selected";
        }
    }

    function updateNowPlayingHighlight() {
        const items = playlistElement.querySelectorAll('li');
        const currentThemeName = themeSelect.value;

        // Find the currently playing song in the *displayed* list
        const playingSongInDisplayedList = currentlyDisplayedPlaylist[currentTrackIndex];

        items.forEach(item => {
            item.classList.remove('now-playing');
            item.style.color = '';
            item.style.fontWeight = 'normal';

            // Check if this list item corresponds to the actually playing song
            // and if the audio player is not paused and has a source.
            if (playingSongInDisplayedList && item.dataset.songId === playingSongInDisplayedList.id &&
                audioPlayer.src && !audioPlayer.paused) {
                item.classList.add('now-playing');
                // Rely on CSS for themed styling of .now-playing
            } else {
                 // Fallback styling for non-playing items if needed, but CSS should handle this
                 if (currentThemeName === 'custom') {
                     item.style.color = textColorPicker.value;
                 } else if (themeColors[currentThemeName]) {
                     // item.style.color = themeColors[currentThemeName].text; // Usually inherited
                 }
            }
        });
    }

     audioPlayer.addEventListener('ended', () => {
        nextButton.click(); // Play next song
    });

    audioPlayer.onplay = updateNowPlayingHighlight;
    audioPlayer.onpause = updateNowPlayingHighlight;


    // --- Theme and Color Customization ---
    themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    bgColorPicker.addEventListener('input', () => {
        if (themeSelect.value === 'custom') {
            document.body.style.backgroundColor = bgColorPicker.value;
            mainContainer.style.backgroundColor = bgColorPicker.value; // Or a slightly different shade
        }
    });

    textColorPicker.addEventListener('input', () => {
        if (themeSelect.value === 'custom') {
            document.body.style.color = textColorPicker.value;
            mainContainer.style.color = textColorPicker.value;
        }
    });

    function applyTheme(themeName) {
        document.body.classList.remove('light-theme', 'dark-theme', 'cyberpunk-theme', 'custom-theme');
        // mainContainer class manipulation can be removed if all styling is through body class context
        // e.g. .light-theme #main-container {}

        // Reset direct styles that might have been applied by 'custom' theme
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        mainContainer.style.backgroundColor = ''; // Only if #main-container has direct custom styles
        mainContainer.style.color = '';          // Only if #main-container has direct custom styles

        if (themeColors[themeName]) { // For light, dark, cyberpunk
            document.body.classList.add(themeName + '-theme');
            bgColorPicker.value = themeColors[themeName].bg;
            textColorPicker.value = themeColors[themeName].text;
            customizationSection.classList.remove('custom-active');
            mainContainer.style.setProperty('--custom-accent-color', ''); // Clear custom accent CSS variable
            document.documentElement.style.setProperty('--custom-button-bg', ''); // Clear custom button CSS variable
            document.documentElement.style.setProperty('--custom-button-text', ''); // Clear custom button CSS variable

        } else if (themeName === 'custom') {
            document.body.classList.add('custom-theme');
            customizationSection.classList.add('custom-active');

            const storedBgColor = localStorage.getItem('musicPlayerBgColor') || themeColors.dark.bg;
            const storedTextColor = localStorage.getItem('musicPlayerTextColor') || themeColors.dark.text;

            bgColorPicker.value = storedBgColor;
            textColorPicker.value = storedTextColor;

            document.body.style.backgroundColor = storedBgColor;
            document.body.style.color = storedTextColor;
            mainContainer.style.backgroundColor = storedBgColor;
            mainContainer.style.color = storedTextColor;

            const derivedAccent = deriveAccentColor(storedBgColor, storedTextColor);
            mainContainer.style.setProperty('--custom-accent-color', derivedAccent);
            // Set CSS variables for button styling in custom theme
            document.documentElement.style.setProperty('--custom-button-bg', derivedAccent);
            document.documentElement.style.setProperty('--custom-button-text', storedBgColor); // Use background for button text for contrast
        }
        updateNowPlayingHighlight();
        if (analyser && !audioPlayer.paused) { // Redraw visualizer if active
            drawVisualizerLoop();
        }
    }

    function deriveAccentColor(bgColorHex, textColorHex) {
        const hexToRgb = (hex) => {
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
            } else if (hex.length === 7) {
                r = parseInt(hex[1] + hex[2], 16); g = parseInt(hex[3] + hex[4], 16); b = parseInt(hex[5] + hex[6], 16);
            }
            return { r, g, b };
        };

        const bgRgb = hexToRgb(bgColorHex);
        // Calculate luminance: L = 0.2126*R + 0.7152*G + 0.0722*B (standard formula)
        const bgLuminance = (0.2126 * bgRgb.r + 0.7152 * bgRgb.g + 0.0722 * bgRgb.b) / 255;

        // Return text color if background is dark, or a darkened version of text color if background is light
        // This aims for contrast.
        if (bgLuminance < 0.5) { // Dark background -> use a lighter accent (e.g., the text color itself or a lighter variant)
            const textRgb = hexToRgb(textColorHex);
            return `rgb(${Math.min(255, textRgb.r + 20)}, ${Math.min(255, textRgb.g + 20)}, ${Math.min(255, textRgb.b + 20)})`;
        } else { // Light background -> use a darker accent
            const textRgb = hexToRgb(textColorHex);
            // Try to make it significantly different from the text color too, if text is already dark.
            // If text is very light on a light background (low contrast scenario), this might not be ideal.
            // For simplicity, we just darken the text color.
            return `rgb(${Math.max(0, textRgb.r - 40)}, ${Math.max(0, textRgb.g - 40)}, ${Math.max(0, textRgb.b - 40)})`;
        }
    }

    // --- LocalStorage Persistence ---
    function saveLibraryToLocalStorage() {
        // Store only metadata, not the File objects themselves
        const libraryToStore = musicLibrary.map(song => ({
            name: song.name,
            genre: song.genre,
            id: song.id,
            type: song.type
        }));
        localStorage.setItem('musicPlayerLibrary', JSON.stringify(libraryToStore));
    }

    function loadLibraryFromLocalStorage() {
        const storedLibrary = localStorage.getItem('musicPlayerLibrary');
        if (storedLibrary) {
            try {
                const parsedLibrary = JSON.parse(storedLibrary);
                // We don't have the File objects here.
                // Playback will require users to re-select files if the session ended.
                // For now, we load the metadata for display.
                // A more complex solution (IndexedDB) would be needed to store actual file data.
                musicLibrary = parsedLibrary.map(songMetadata => ({
                    ...songMetadata,
                    file: null // File object is not available from localStorage
                }));
            } catch (e) {
                console.error("Error parsing music library from localStorage:", e);
                musicLibrary = []; // Reset if data is corrupt
            }
        } else {
            musicLibrary = [];
        }
        renderPlaylist(); // Initial render based on loaded library (will show all by default)
        populateGenreFilter();
    }

    function populateGenreFilter() {
        const genres = new Set(musicLibrary.map(song => song.genre));
        // Save current filter value to reapply if possible
        const currentFilterValue = filterGenreDropdown.value;

        filterGenreDropdown.innerHTML = '<option value="all">All Genres</option>'; // Reset
        genres.forEach(genre => {
            if (genre) { // Ensure genre is not undefined or empty
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
                filterGenreDropdown.appendChild(option);
            }
        });
        // Reapply filter if it still exists, otherwise set to 'all'
        if (Array.from(filterGenreDropdown.options).some(opt => opt.value === currentFilterValue)) {
            filterGenreDropdown.value = currentFilterValue;
        } else {
            filterGenreDropdown.value = 'all';
        }
    }

    filterGenreDropdown.addEventListener('change', (e) => {
        renderPlaylist(e.target.value);
    });


    // Helper to convert RGB from getComputedStyle to HEX for color pickers
    function rgbToHex(rgbString) {
        if (!rgbString || typeof rgbString !== 'string') {
            // console.warn("Invalid input to rgbToHex:", rgbString);
            return '#ffffff'; // Default color if input is invalid
        }
        if (rgbString.startsWith('#')) return rgbString; // Already hex

        const match = rgbString.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
        if (!match) {
            // console.warn("Invalid RGB string for hex conversion:", rgbString);
            // Attempt to use a default based on current body text color, or fallback to white/black
            const bodyColor = getComputedStyle(document.body).color;
            return bodyColor && bodyColor !== rgbString ? rgbToHex(bodyColor) : '#000000';
        }

        let r = parseInt(match[1]).toString(16),
            g = parseInt(match[2]).toString(16),
            b = parseInt(match[3]).toString(16);

        if (r.length == 1) r = "0" + r;
        if (g.length == 1) g = "0" + g;
        if (b.length == 1) b = "0" + b;

        return "#" + r + g + b;
    }


    // --- Visualizer ---
    function setupVisualizer() {
        if (!audioPlayer.src) return;

        if (!audioCtx) { // Initialize AudioContext only if it doesn't exist
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("AudioContext could not be created:", e);
                alert("AudioContext is not supported by your browser or is blocked.");
                return;
            }
        }

        // Resume AudioContext if it's suspended (common in modern browsers until user interaction)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(err => console.error("AudioContext resume failed:", err));
        }

        // Ensure only one source and analyser chain is active for the current audioPlayer
        if (!source || source.mediaElement !== audioPlayer) {
            if (source) {
                source.disconnect(); // Disconnect previous source if any
            }
            if (analyser) {
                analyser.disconnect(); // Disconnect previous analyser if any
            }
            try {
                source = audioCtx.createMediaElementSource(audioPlayer);
                analyser = audioCtx.createAnalyser();
                source.connect(analyser);
                analyser.connect(audioCtx.destination);
                analyser.fftSize = 256;
            } catch (e) {
                console.error("Error setting up media element source for visualizer:", e);
                // If source creation fails (e.g. audio element not loaded properly yet)
                // try again after a short delay or on next play event.
                return;
            }
        }
        // Start drawing if not already started
        // This part of the original setupVisualizer was a bit mixed with the override logic.
        // The primary setup of source and analyser is done above.
        // The override mechanism will ensure drawVisualizerLoop starts if analyser is ready.
        if (analyser && !animationFrameId) { // If analyser is ready and loop not running
            drawVisualizerLoop();
        }
    }


    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        if (!analyser) return;

        if (!analyser) return; // Don't draw if analyser isn't ready

        const bufferLength = analyser.frequencyBinCount; // Number of data points (half of fftSize)
        const dataArray = new Uint8Array(bufferLength); // Array to hold frequency data
        analyser.getByteFrequencyData(dataArray); // Populate dataArray

        canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); // Clear canvas each frame

        const barSpacing = 2; // Spacing between bars
        const totalSpacing = (bufferLength - 1) * barSpacing;
        const barWidth = (visualizerCanvas.width - totalSpacing) / bufferLength;

        let x = 0; // X-coordinate for drawing each bar

        // Determine bar color based on theme
        let baseBarColor;
        const currentThemeName = themeSelect.value;
        if (themeColors[currentThemeName] && themeColors[currentThemeName].visualizerBar) {
            baseBarColor = themeColors[currentThemeName].visualizerBar;
        } else if (currentThemeName === 'custom') {
            baseBarColor = mainContainer.style.getPropertyValue('--custom-accent-color') || textColorPicker.value;
        } else {
            baseBarColor = themeColors.dark.visualizerBar; // Default fallback (e.g., dark theme's visualizer)
        }
        if (!baseBarColor || baseBarColor.length < 4) baseBarColor = '#FFFFFF'; // Ensure a visible fallback like white

        // --- Enhanced Bar Drawing ---
        for (let i = 0; i < bufferLength; i++) {
            const barHeightScale = 1.8; // Adjust overall height sensitivity
            let barHeight = dataArray[i] / barHeightScale;

            // Ensure barHeight is at least 1px if dataArray[i] > 0, otherwise it might not show
            if (dataArray[i] > 0 && barHeight < 1) {
                barHeight = 1;
            }

            // Style for the bars (rounded tops, gradient, glow)
            const borderRadius = barWidth / 3; // Rounded top radius

            // Gradient for bars (subtle, from slightly lighter to base color)
            const gradient = canvasCtx.createLinearGradient(
                x, visualizerCanvas.height - barHeight,
                x, visualizerCanvas.height
            );
            // Create a slightly lighter version of the baseBarColor for the gradient top
            // This is a simple way; a proper color manipulation library would be better.
            // Create a slightly lighter version for gradient (simplified)
            if (baseBarColor.startsWith('#') && baseBarColor.length >= 7) { // Check for full hex
                try {
                    let r = parseInt(baseBarColor.slice(1, 3), 16);
                    let g = parseInt(baseBarColor.slice(3, 5), 16);
                    let b = parseInt(baseBarColor.slice(5, 7), 16);
                    gradient.addColorStop(0, `rgba(${Math.min(255,r+40)}, ${Math.min(255,g+40)}, ${Math.min(255,b+40)}, 0.9)`);
                    gradient.addColorStop(1, baseBarColor);
                } catch(e) {
                    // Fallback if hex parsing fails (e.g. short hex like #FFF)
                    gradient.addColorStop(0, baseBarColor);
                    gradient.addColorStop(1, baseBarColor);
                }
            } else if (baseBarColor.startsWith('rgb')) { // Handle rgb strings from deriveAccentColor
                 gradient.addColorStop(0, baseBarColor.replace(')', ', 0.9)').replace('rgb', 'rgba')); // Lighter top
                 gradient.addColorStop(1, baseBarColor);
            } else { // Fallback for unknown color formats
                 gradient.addColorStop(0, baseBarColor);
                 gradient.addColorStop(1, baseBarColor);
            }
            canvasCtx.fillStyle = gradient;

            canvasCtx.shadowColor = baseBarColor;
            canvasCtx.shadowBlur = 8;

            // Draw the bar with rounded top path - corrected path
            canvasCtx.beginPath();
            canvasCtx.moveTo(x, visualizerCanvas.height); // Start from bottom-left of bar
            canvasCtx.lineTo(x, visualizerCanvas.height - barHeight + borderRadius); // Line to start of top-left curve
            canvasCtx.arcTo(x, visualizerCanvas.height - barHeight, // Control point for top-left corner
                            x + borderRadius, visualizerCanvas.height - barHeight, // End point of arc, start of top line
                            borderRadius);
            canvasCtx.lineTo(x + barWidth - borderRadius, visualizerCanvas.height - barHeight); // Line to start of top-right curve
            canvasCtx.arcTo(x + barWidth, visualizerCanvas.height - barHeight, // Control point for top-right corner
                            x + barWidth, visualizerCanvas.height - barHeight + borderRadius, // End point of arc, start of right line
                            borderRadius);
            canvasCtx.lineTo(x + barWidth, visualizerCanvas.height); // Line to bottom-right of bar
            // No need to closePath if we fill, as it implicitly closes for fill.
            // For stroke, closePath() would draw the bottom line if needed.
            canvasCtx.fill();

            canvasCtx.shadowBlur = 0;
            canvasCtx.shadowColor = 'transparent';

            x += barWidth + barSpacing;
        }
    }

    // Initialize
    loadLibraryFromLocalStorage(); // Load library, then render playlist and genre filter

    const initialTheme = localStorage.getItem('musicPlayerTheme') || themeColors.dark.name; // Default to Dark theme name
    themeSelect.value = initialTheme; // Set dropdown
    applyTheme(initialTheme); // Apply the theme, which also sets pickers for predefined themes

    // If the loaded theme is 'custom', ensure pickers are updated from localStorage,
    // or set to dark theme defaults if no custom colors are stored.
    if (initialTheme === 'custom') {
        const storedBg = localStorage.getItem('musicPlayerBgColor');
        const storedText = localStorage.getItem('musicPlayerTextColor');
        if (storedBg && storedText) {
            bgColorPicker.value = storedBg;
            textColorPicker.value = storedText;
            // Re-apply these specific custom styles because applyTheme might have used defaults if localStorage was empty at that point.
            document.body.style.backgroundColor = storedBg;
            document.body.style.color = storedText;
            mainContainer.style.backgroundColor = storedBg;
            mainContainer.style.color = storedText;
            const derivedAccent = deriveAccentColor(storedBg, storedText);
            mainContainer.style.setProperty('--custom-accent-color', derivedAccent);
            document.documentElement.style.setProperty('--custom-button-bg', derivedAccent);
            document.documentElement.style.setProperty('--custom-button-text', storedBg);

        } else {
            // If 'custom' is the theme but no colors are stored, initialize pickers to dark theme defaults
            // and save these as the initial custom colors.
            bgColorPicker.value = themeColors.dark.bg;
            textColorPicker.value = themeColors.dark.text;
            localStorage.setItem('musicPlayerBgColor', themeColors.dark.bg);
            localStorage.setItem('musicPlayerTextColor', themeColors.dark.text);
            // Apply these defaults visually
            document.body.style.backgroundColor = themeColors.dark.bg;
            document.body.style.color = themeColors.dark.text;
            mainContainer.style.backgroundColor = themeColors.dark.bg;
            mainContainer.style.color = themeColors.dark.text;
            const derivedAccent = deriveAccentColor(themeColors.dark.bg, themeColors.dark.text);
            mainContainer.style.setProperty('--custom-accent-color', derivedAccent);
            document.documentElement.style.setProperty('--custom-button-bg', derivedAccent);
            document.documentElement.style.setProperty('--custom-button-text', themeColors.dark.bg);
        }
    }

    // Event listener for saving theme (this also handles applying it)
    themeSelect.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        localStorage.setItem('musicPlayerTheme', newTheme);
        applyTheme(newTheme);
        // If switching to custom, and no custom colors are stored yet, applyTheme will use dark defaults.
        // User can then change them.
    });

    // AudioContext often needs a user gesture to start, especially for createMediaElementSource.
    // We'll try to initialize it on play or file load.
    let animationFrameId = null; // To control the animation loop

    const initAudioProcessingUserGesture = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(e => console.error("Error resuming AudioContext on gesture:", e));
        }
        // Ensure visualizer is set up if we have a playing source and analyser isn't already running.
        if (audioPlayer.src && !audioPlayer.paused) {
            if (!analyser) {
                setupVisualizer(); // This will also start drawVisualizer if successful
            } else if (!animationFrameId) { // If analyser exists but drawing stopped
                drawVisualizerLoop();
            }
        }
    };
    document.body.addEventListener('click', initAudioProcessingUserGesture, true);

    function drawVisualizerLoop() {
        if (!analyser || audioPlayer.paused) { // Stop loop if analyser not set or audio paused
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                // Optionally clear canvas when paused
                // canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
            }
            return;
        }
        drawVisualizer(); // Actual drawing function
        animationFrameId = requestAnimationFrame(drawVisualizerLoop);
    }

    // Override setupVisualizer to call drawVisualizerLoop if necessary
    // const originalSetupVisualizer = setupVisualizer; // This was part of an override pattern
    // The function setupVisualizer is now self-contained and will call drawVisualizerLoop indirectly via play events or init.
    // So, direct override might not be needed if setupVisualizer itself is robust.
    // Let's simplify: Ensure setupVisualizer is called, and if it succeeds, the play handler will start the loop.
    // The primary role of setupVisualizer is to establish the AudioNode graph.
    // The animation loop is started/stopped by play/pause events.

    // Let's adjust the original override to be more of a wrapper IF NEEDED,
    // or ensure `setupVisualizer` is called correctly and play events handle the loop.
    // The current setupVisualizer already tries to call drawVisualizer() if successful,
    // but drawVisualizer() itself is not the loop. drawVisualizerLoop is.

    // Correcting the override pattern slightly:
    // The original setupVisualizer is the core function that sets up nodes.
    // We want to ensure that *after* it runs, if successful, the loop starts.
    // However, the loop start is also tied to 'play' events.

    // Let's remove the override for now and rely on play events to start drawVisualizerLoop.
    // setupVisualizer will just set up the nodes.
    // The `if (analyser)` check at the end of the original `setupVisualizer` was for an immediate draw, not the loop.
    // This was simplified in a previous step.
    // The `initAudioProcessingUserGesture` and `audioPlayer.addEventListener('play', ...)`
    // are the primary mechanisms to start the visualizer loop now.


    // Initial setup
    loadLibraryFromLocalStorage(); // Load library, then render playlist and genre filter

    const initialTheme = localStorage.getItem('musicPlayerTheme') || 'light';
    themeSelect.value = initialTheme;
    applyTheme(initialTheme);

    if (initialTheme === 'custom') {
        // applyTheme handles loading custom colors from localStorage already
    }


    // Initial setup if audio is already playing (e.g. browser remembers state - less likely without src persistence)
    if (!audioPlayer.paused && audioPlayer.src) { // audioPlayer.src would be empty on fresh load
       setTimeout(initAudioProcessingUserGesture, 300);
    }

    audioPlayer.addEventListener('play', () => {
        initAudioProcessingUserGesture();
        updateNowPlayingHighlight(); // Update highlight when play starts
        if(!analyser && audioPlayer.src) {
            setupVisualizer(); // This will now also start the loop
        } else if (analyser && audioPlayer.src && !animationFrameId) { // If analyser exists but loop not running
            drawVisualizerLoop();
        }
    });
    audioPlayer.addEventListener('pause', () => {
        updateNowPlayingHighlight(); // Update highlight when paused
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            // Optionally, clear the canvas when paused or draw a static "paused" state
            // canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
            // canvasCtx.fillStyle = 'rgba(0,0,0,0.5)';
            // canvasCtx.fillRect(0,0, visualizerCanvas.width, visualizerCanvas.height);
            // canvasCtx.fillStyle = 'white';
            // canvasCtx.textAlign = 'center';
            // canvasCtx.fillText("Paused", visualizerCanvas.width/2, visualizerCanvas.height/2);
        }
    });

    // Add event listeners to color pickers to update custom theme dynamically
    bgColorPicker.addEventListener('input', () => {
        if (themeSelect.value === 'custom') {
            const newBgColor = bgColorPicker.value;
            document.body.style.backgroundColor = newBgColor;
            mainContainer.style.backgroundColor = newBgColor;
            localStorage.setItem('musicPlayerBgColor', newBgColor);
            const derivedAccent = deriveAccentColor(newBgColor, textColorPicker.value);
            mainContainer.style.setProperty('--custom-accent-color', derivedAccent);
            document.documentElement.style.setProperty('--custom-button-bg', derivedAccent);
            document.documentElement.style.setProperty('--custom-button-text', newBgColor);
            if (analyser && !audioPlayer.paused) drawVisualizerLoop();
        }
    });

    textColorPicker.addEventListener('input', () => {
        if (themeSelect.value === 'custom') {
            const newTextColor = textColorPicker.value;
            document.body.style.color = newTextColor;
            mainContainer.style.color = newTextColor;
            localStorage.setItem('musicPlayerTextColor', newTextColor);
            updateNowPlayingHighlight();
            const derivedAccent = deriveAccentColor(bgColorPicker.value, newTextColor);
            mainContainer.style.setProperty('--custom-accent-color', derivedAccent);
            // Button text color might need re-evaluation if it was based on old text color contrast
            // For simplicity, we keep button text color linked to BG color for now.
            if (analyser && !audioPlayer.paused) drawVisualizerLoop();
        }
    });
});
