(() => {

    "use strict";

    /* ========================================
       TRACK LIST
    ======================================== */

    const TRACKS = [
        {
            id: "butterflies",
            title: "Butterflies",
            file: "butterflies.mp3"
        },
        {
            id: "citylights",
            title: "City Lights",
            file: "citylights.mp3"
        },
        {
            id: "dreams",
            title: "Dreams",
            file: "dreams.mp3"
        },
        {
            id: "opmyeyes",
            title: "Op My Eyes",
            file: "opmyeyes.mp3"
        },
        {
            id: "photons",
            title: "Photons",
            file: "photons.mp3"
        },
        {
            id: "pineapple",
            title: "Pineapple",
            file: "pineapple.mp3"
        },
        {
            id: "racks",
            title: "Racks",
            file: "racks.mp3"
        },
        {
            id: "soright",
            title: "So Right",
            file: "soright.mp3"
        }
    ];


    /* ========================================
       SETTINGS
    ======================================== */

    const DEFAULT_VOLUME = 0.72;

    const STATE_KEY = "at-radio-state";
    const VOLUME_KEY = "at-radio-volume";


    /* ========================================
       CONTROLS
    ======================================== */

    const playButton =
        document.querySelector("[data-radio-play]");
    
    const volumeSlider =
        document.querySelector("[data-radio-volume]");
    
    const status =
        document.querySelector("[data-radio-status]");
    
    
    if (
        !playButton ||
        !volumeSlider ||
        !status
    ) {
        return;
    }
    
    
    const volumeControl =
        volumeSlider.closest(
            ".radio-volume"
        );
    
    
    const isIOS =
        /iPhone|iPad|iPod/i.test(
            navigator.userAgent
        ) ||
        (
            navigator.userAgent.includes("Mac") &&
            navigator.maxTouchPoints > 1
        );
    
    
    if (isIOS) {
    
        document.documentElement
            .classList.add("is-ios");
    
        if (volumeControl) {
            volumeControl.hidden = true;
        }
    }


    /* ========================================
       AUDIO
    ======================================== */

    const audio = new Audio();

    /*
     * Opening the website does not
     * automatically download an MP3.
     */

    audio.preload = "none";


    /* ========================================
       STATE
    ======================================== */

    let state = loadState();

    if (!validState(state)) {
        state = createFreshState();
    }

    if (
        typeof state.playTracked !==
            "boolean"
    ) {
        state.playTracked =
            state.currentTime > 0;
    }

    let loadedTrackId = null;
    let loading = false;


    /* ========================================
       VOLUME
    ======================================== */

    if (!isIOS) {

        const savedVolume =
            localStorage.getItem(
                VOLUME_KEY
            );
    
    
        audio.volume =
            savedVolume === null
                ? DEFAULT_VOLUME
                : clamp(
                    Number(savedVolume)
                );
    
    
        volumeSlider.value =
            audio.volume;
    }


    /* ========================================
       SHUFFLE STATE
    ======================================== */

    function createFreshState(
        previousTrack = null
    ) {

        return {
            order:
                createShuffle(
                    previousTrack
                ),
            index: 0,
            currentTime: 0,
            playing: false,
            playTracked: false
        };
    }

    function createShuffle(
        avoidFirst = null
    ) {

        const order =
            TRACKS.map(
                track => track.id
            );


        /*
         * Fisher-Yates shuffle.
         */

        for (
            let i = order.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() *
                    (i + 1)
                );


            [
                order[i],
                order[j]
            ] = [
                order[j],
                order[i]
            ];
        }


        /*
         * When a complete 8-song cycle
         * finishes, don't immediately
         * repeat the final track.
         */

        if (
            avoidFirst &&
            order.length > 1 &&
            order[0] === avoidFirst
        ) {

            [
                order[0],
                order[1]
            ] = [
                order[1],
                order[0]
            ];
        }


        return order;
    }


    /* ========================================
       CURRENT TRACK
    ======================================== */

    function getCurrentTrack() {

        const id =
            state.order[
                state.index
            ];


        return TRACKS.find(
            track =>
                track.id === id
        );
    }

    function trackMusicPlay() {

        const track =
            getCurrentTrack();
    
    
        if (
            !track ||
            state.playTracked
        ) {
            return;
        }
    
    
        if (
            !window.umami ||
            typeof window.umami.track !==
                "function"
        ) {
            return;
        }
    
    
        window.umami.track(
            "music-play",
            {
                track: track.title
            }
        );
    
    
        state.playTracked = true;
    }

    /* ========================================
       LOAD TRACK
    ======================================== */

    function loadCurrentTrack() {

        const track =
            getCurrentTrack();


        if (!track) {
            return;
        }


        if (
            loadedTrackId ===
            track.id
        ) {
            return;
        }


        audio.pause();


        audio.src =
            `audio/${track.file}`;


        audio.preload =
            "metadata";


        loadedTrackId =
            track.id;


        audio.load();


        updateMediaSession();


        /*
         * Restore playback position after
         * navigating between HTML pages.
         */

        if (
            state.currentTime > 0
        ) {

            audio.addEventListener(
                "loadedmetadata",
                restoreTime,
                {
                    once: true
                }
            );
        }
    }


    function restoreTime() {

        if (
            !Number.isFinite(
                audio.duration
            )
        ) {
            return;
        }


        audio.currentTime =
            Math.min(
                state.currentTime,
                Math.max(
                    0,
                    audio.duration - 0.25
                )
            );
    }


    /* ========================================
       PLAY
    ======================================== */

    async function playRadio() {

        if (loading) {
            return;
        }


        loading = true;

        playButton.disabled = true;


        loadCurrentTrack();


        try {

            await audio.play();

            state.playing = true;
            
            trackMusicPlay();
            
            saveState();

            status.textContent =
                `Playing ${getCurrentTrack().title}`;

        } catch (error) {

            console.warn(
                "Radio playback failed:",
                error
            );

            state.playing = false;

            saveState();

            status.textContent =
                "Radio paused";
        }

        loading = false;

        playButton.disabled = false;

        updatePlayButton();
    }

    /* ========================================
       PAUSE
    ======================================== */

    function pauseRadio() {

        audio.pause();

        saveCurrentTime();

        state.playing = false;

        saveState();

        status.textContent =
            "Radio paused";


        updatePlayButton();
    }

    /* ========================================
       PLAY / PAUSE BUTTON
    ======================================== */

    function toggleRadio() {

        if (
            loadedTrackId &&
            !audio.paused
        ) {

            pauseRadio();

        } else {

            playRadio();
        }
    }

    playButton.addEventListener(
        "click",
        toggleRadio
    );

    function updatePlayButton() {

        const isPlaying =
            Boolean(
                loadedTrackId &&
                !audio.paused
            );

        playButton.textContent =
            isPlaying
                ? "Ⅱ"
                : "▶︎";

        playButton.setAttribute(
            "aria-label",
            isPlaying
                ? "Pause Abraham Tilbury Radio"
                : "Play Abraham Tilbury Radio"
        );

        const track =
            getCurrentTrack();


        if (track) {

            playButton.title =
                track.title;
        }
    }

    audio.addEventListener(
        "play",
        updatePlayButton
    );

    audio.addEventListener(
        "pause",
        updatePlayButton
    );

    /* ========================================
       AUTOMATIC NEXT SONG

       No visible skip button.
    ======================================== */

    audio.addEventListener(
        "ended",
        advanceRadio
    );

    async function advanceRadio() {

        const previousTrack =
            getCurrentTrack();

        state.index += 1;

        /*
         * Finished all 8 tracks.
         */

        if (
            state.index >=
            state.order.length
        ) {

            state.order =
                createShuffle(
                    previousTrack
                        ? previousTrack.id
                        : null
                );


            state.index = 0;
        }

        state.currentTime = 0;
        state.playing = true;
        state.playTracked = false;
        
        saveState();

        loadedTrackId = null;

        audio.removeAttribute(
            "src"
        );

        audio.load();

        loadCurrentTrack();

        try {

            await audio.play();
        
            trackMusicPlay();
        
            saveState();
        
            status.textContent =
                `Playing ${getCurrentTrack().title}`;

        } catch (error) {

            console.warn(
                "Next track could not autoplay:",
                error
            );

            state.playing = false;

            saveState();

            status.textContent =
                "Press play to continue";
        }

        updatePlayButton();
    }

    /* ========================================
       VOLUME
    ======================================== */

    if (!isIOS) {

        volumeSlider.addEventListener(
            "input",
            event => {
    
                const volume =
                    clamp(
                        Number(
                            event.target.value
                        )
                    );
    
    
                audio.volume =
                    volume;
    
    
                localStorage.setItem(
                    VOLUME_KEY,
                    String(volume)
                );
            }
        );
    }

    /* ========================================
       SAVE CURRENT TIME
    ======================================== */

    function saveCurrentTime() {

        if (
            !loadedTrackId ||
            !Number.isFinite(
                audio.currentTime
            )
        ) {
            return;
        }


        state.currentTime =
            audio.currentTime;


        saveState();
    }

    /* ========================================
       LEAVING THIS HTML PAGE
    ======================================== */

    window.addEventListener(
        "pagehide",
        () => {

            saveCurrentTime();


            state.playing =
                Boolean(
                    loadedTrackId &&
                    !audio.paused &&
                    !audio.ended
                );


            saveState();
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "hidden"
            ) {

                saveCurrentTime();
            }
        }
    );

    /* ========================================
       RESTORE AFTER SITE NAVIGATION
    ======================================== */

    async function restoreRadio() {

        updatePlayButton();

        /*
         * Fresh visit / paused radio:
         * don't load an MP3.
         */

        if (!state.playing) {
            return;
        }


        loadCurrentTrack();


        try {

            await audio.play();

            status.textContent =
                `Playing ${getCurrentTrack().title}`;

        } catch {

            /*
             * Browsers can block audible
             * autoplay after a full page
             * navigation.
             */

            state.playing = false;

            saveState();


            status.textContent =
                "Press play to continue";
        }

        updatePlayButton();
    }

    /* ========================================
       PHONE / OS MEDIA METADATA
    ======================================== */

    function updateMediaSession() {

        const track =
            getCurrentTrack();

        if (
            !track ||
            !("mediaSession" in navigator) ||
            !("MediaMetadata" in window)
        ) {
            return;
        }


        try {

            navigator.mediaSession.metadata =
                new MediaMetadata({

                    title:
                        track.title,

                    artist:
                        "Abraham Tilbury",

                    album:
                        "Abraham Tilbury Radio"

                });

        } catch {}
    }


    if (
        "mediaSession" in navigator
    ) {

        try {

            navigator.mediaSession
                .setActionHandler(
                    "play",
                    playRadio
                );


            navigator.mediaSession
                .setActionHandler(
                    "pause",
                    pauseRadio
                );

        } catch {}
    }


    /* ========================================
       SESSION STORAGE
    ======================================== */

    function saveState() {

        try {

            sessionStorage.setItem(
                STATE_KEY,
                JSON.stringify(state)
            );

        } catch {}
    }


    function loadState() {

        try {

            const saved =
                sessionStorage.getItem(
                    STATE_KEY
                );


            return saved
                ? JSON.parse(saved)
                : null;

        } catch {

            return null;
        }
    }


    function validState(
        candidate
    ) {

        if (
            !candidate ||
            !Array.isArray(
                candidate.order
            ) ||
            candidate.order.length !==
                TRACKS.length ||
            !Number.isInteger(
                candidate.index
            ) ||
            candidate.index < 0 ||
            candidate.index >=
                TRACKS.length
        ) {

            return false;
        }


        const validIds =
            new Set(
                TRACKS.map(
                    track => track.id
                )
            );


        return (
            candidate.order.every(
                id => validIds.has(id)
            ) &&
            new Set(candidate.order).size === TRACKS.length
        );
    }


    /* ========================================
       UTILITY
    ======================================== */

    function clamp(value) {

        if (
            !Number.isFinite(value)
        ) {

            return DEFAULT_VOLUME;
        }


        return Math.max(
            0,
            Math.min(
                1,
                value
            )
        );
    }


    /* ========================================
       START
    ======================================== */

    restoreRadio();

})();
