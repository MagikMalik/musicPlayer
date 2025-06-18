# Futuristic HTML5 Music Player

## Description

A stylish and customizable client-side music player built with HTML, CSS, and JavaScript. It allows users to upload their music, organize it by genre, and enjoy playback with a dynamic audio visualizer. The player's appearance can be extensively customized with multiple themes and color choices, all saved in the browser's local storage.

## Features

*   **Audio Playback:**
    *   Play, pause, skip to the next or previous track.
    *   Adjust volume using a slider.
    *   "Now Playing" area displays the current song's filename and genre.
    *   Automatic playback to the next song in the playlist.
*   **Music Library & Organization:**
    *   Upload MP3, WAV, and OGG audio files.
    *   Assign a genre to uploaded songs from a predefined list.
    *   Client-side music library that stores song metadata (name, genre).
    *   Persistence of music library metadata using browser `localStorage`.
    *   Filter the displayed playlist by genre.
    *   Duplicate song prevention (based on filename and genre).
*   **Dynamic Audio Visualizer:**
    *   Real-time frequency bar visualizer that reacts to the currently playing music.
    *   Visualizer colors adapt dynamically to the selected theme, including custom themes.
    *   Features rounded bars, color gradients, and a glow effect for a modern look.
*   **UI Customization:**
    *   **Themes:** Multiple built-in themes:
        *   Light
        *   Dark (default)
        *   Cyberpunk
    *   **Custom Theme:**
        *   Select "Custom" theme to enable color pickers.
        *   Choose custom background and text colors.
        *   An accent color is automatically derived from the chosen background/text colors and applied to buttons, visualizer, and other highlights.
    *   **Persistence:** User's selected theme and custom color preferences are saved in `localStorage` and applied on subsequent visits.
*   **Responsive Design:**
    *   The player interface is designed to adapt to various screen sizes, providing a good user experience on desktops, tablets, and mobile phones.

## How to Use

1.  **Open the Player:**
    *   Download the project files (`index.html`, `style.css`, `script.js`).
    *   Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Edge, Safari).

2.  **Upload Music:**
    *   Click on the "Choose Files" button (or the area labeled "Upload Music").
    *   Select one or more audio files (MP3, WAV, OGG) from your computer.
    *   Before (or during) file selection, choose a genre from the "Select Genre (for new uploads)" dropdown that you want to associate with the files being uploaded.
    *   The uploaded songs, along with their assigned genre, will appear in the "Playlist/Library" section.

3.  **Play Music:**
    *   Click on any song in the playlist to start playback.
    *   The "Now Playing" area will display the current song's information.

4.  **Player Controls:**
    *   **Play/Pause:** Use the "Play" and "Pause" buttons to control playback.
    *   **Next/Previous:** Use the "Next" and "Previous" buttons to skip between tracks in the current playlist view.
    *   **Volume:** Adjust the volume using the slider next to the playback controls.

5.  **Filter by Genre:**
    *   Use the "Filter by Genre" dropdown above the playlist to view songs only from a specific genre or select "All Genres" to see your entire library.

6.  **Customize Appearance:**
    *   **Themes:** Select a theme (Light, Dark, Cyberpunk, Custom) from the "Select Theme" dropdown in the "Customization" section.
    *   **Custom Colors:**
        *   If you select the "Custom" theme, the color pickers below it will become active.
        *   Use the "Background Color" picker to change the main background color.
        *   Use the "Text Color" picker to change the primary text color.
        *   An accent color for buttons, the visualizer, and highlights will be derived automatically.
        *   Your theme and custom color choices are saved automatically.

## Technical Details

*   **Built with:** HTML, CSS, JavaScript (ES6+)
*   **Key Web APIs Used:**
    *   **Web Audio API:** For creating the audio visualizer (accessing frequency data from the playing audio).
    *   **`localStorage`:** For persisting user preferences (selected theme, custom colors) and music library metadata (song names, genres) on the client-side.
    *   **File API:** For handling user-uploaded audio files.
    *   **HTML5 `<audio>` element:** For core audio playback functionality.

## Notes & Limitations

*   **Client-Side Operation:** This is a purely client-side application. Your music files are **not** uploaded to any server. All processing and storage (for metadata and preferences) happen within your web browser.
*   **File Persistence:** Due to web browser security restrictions, the actual audio `File` objects cannot be directly stored persistently (e.g., in `localStorage`).
    *   The player **will** remember the names, genres, and other metadata of your uploaded songs across browser sessions.
    *   However, to make a song playable again after you've closed and reopened the browser, you will need to **re-select the audio file(s)** using the "Upload Music" input. The application will then match it with the stored metadata and make it playable.
*   **ID3 Tag Parsing:** The player currently uses the filename as the song title and relies on user-assigned genres. It does not parse ID3 tags (like embedded artist or album information) from audio files.
*   **Browser Compatibility:** Designed for modern web browsers that support the Web Audio API, File API, and `localStorage`.

---
Enjoy your customized music experience!