(() => {

    "use strict";


    /* ========================================
       DISPLAY SETTINGS
    ======================================== */

    const DISPLAY_WIDTH = 9;

    /*
     * Speed of each one-character movement.
     * Higher number = slower.
     */
    const SCROLL_STEP_MS = 430;

    /*
     * Pause briefly before scrolling starts.
     */
    const SCROLL_HOLD_MS = 1500;

    const COUNTS_URL =
        "https://abraham-radio-counter.abrahamtilbury.workers.dev/counts";


    /* ========================================
       DISPLAY ELEMENTS
    ======================================== */

    const display =
        document.querySelector(
            "[data-radio-display]"
        );

    const displayText =
        document.querySelector(
            "[data-radio-display-text]"
        );


    if (
        !display ||
        !displayText
    ) {
        return;
    }


    /* ========================================
       ACCESSIBILITY
    ======================================== */

    const reduceMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );


    /* ========================================
       STATE
    ======================================== */

    let playCounts =
        Object.create(null);

    let currentTrack = null;

    let radioPlaying = false;

    let scrollTimer = null;


    /* ========================================
       SCROLL CONTROL
    ======================================== */

    function stopScroll() {

        if (scrollTimer !== null) {

            window.clearTimeout(
                scrollTimer
            );

            scrollTimer = null;
        }
    }


    /* ========================================
       PLAY COUNT
    ======================================== */

    function formatPlayCount(
        trackId
    ) {

        const count =
            playCounts[trackId];


        if (!Number.isFinite(count)) {
            return "—";
        }


        return Math.max(
            0,
            Math.trunc(count)
        ).toLocaleString(
            "en-AU"
        );
    }


    /* ========================================
       DISPLAY MESSAGE
    ======================================== */

    function getDisplayMessage() {

        if (!currentTrack) {
            return "";
        }


        const rawCount =
            playCounts[
                currentTrack.id
            ];

        const countLabel =
            formatPlayCount(
                currentTrack.id
            );

        if (!Number.isFinite(rawCount)) {

            return currentTrack
                .title
                .toUpperCase();
        }
        
        
        const playWord =
            rawCount === 1
                ? "PLAY"
                : "PLAYS";
        
        
        return (
            `${currentTrack.title} · ` +
            `${countLabel} ${playWord}`
        ).toUpperCase();
    }


    /* ========================================
       TICKER
    ======================================== */

    function startScroll(
        message
    ) {

        stopScroll();


        /*
         * Don't animate for people who have
         * reduced-motion enabled.
         */
        if (
            reduceMotion.matches ||
            message.length <=
                DISPLAY_WIDTH
        ) {

            displayText.textContent =
                message
                    .slice(
                        0,
                        DISPLAY_WIDTH
                    )
                    .padEnd(
                        DISPLAY_WIDTH,
                        " "
                    );

            return;
        }


        /*
         * Three spaces create a visible gap
         * between repetitions.
         */
        const cycle =
            `${message}   `;


        /*
         * Add enough beginning characters
         * to allow a seamless final frame.
         */
        const loopText =
            cycle +
            cycle.slice(
                0,
                DISPLAY_WIDTH
            );


        let offset = 0;


        function renderFrame() {

            displayText.textContent =
                loopText
                    .slice(
                        offset,
                        offset +
                            DISPLAY_WIDTH
                    )
                    .padEnd(
                        DISPLAY_WIDTH,
                        " "
                    );


            /*
             * Longer pause when title first
             * reaches the left side.
             */
            const delay =
                offset === 0
                    ? SCROLL_HOLD_MS
                    : SCROLL_STEP_MS;


            offset =
                (offset + 1) %
                cycle.length;


            scrollTimer =
                window.setTimeout(
                    renderFrame,
                    delay
                );
        }


        renderFrame();
    }


    /* ========================================
       HIDE
    ======================================== */

    function hideDisplay() {
        stopScroll();
        display.hidden = true;
        display.setAttribute(
            "aria-hidden",
            "true"
    
        );
        display.removeAttribute(
            "title"
        );
    
        displayText.textContent = "";
    }


    /* ========================================
       UPDATE
    ======================================== */

    function updateDisplay() {

        if (
            !radioPlaying ||
            !currentTrack
        ) {
    
            hideDisplay();
    
            return;
        }
    
    
        const countLabel =
            formatPlayCount(
                currentTrack.id
            );
    
    
        const message =
            getDisplayMessage() ||
            currentTrack.title.toUpperCase();
    
    
        display.hidden = false;
    
        display.setAttribute(
            "aria-hidden",
            "false"
        );
    
    
        display.title =
            `${currentTrack.title} — ` +
            `${countLabel} plays`;
    
    
        /*
         * Put something visible in the
         * display immediately, before the
         * scrolling loop begins.
         */
        displayText.textContent =
            message
                .slice(
                    0,
                    DISPLAY_WIDTH
                )
                .padEnd(
                    DISPLAY_WIDTH,
                    " "
                );
    
    
        startScroll(
            message
        );
    }


    /* ========================================
       RADIO EVENTS
    ======================================== */
    
    window.addEventListener(
        "abraham-radio-state",
        event => {
    
            const detail =
                event.detail || {};
    
    
            radioPlaying =
                Boolean(
                    detail.playing
                );
    
    
            currentTrack =
                detail.track &&
                typeof detail.track.id ===
                    "string" &&
                typeof detail.track.title ===
                    "string"
    
                    ? detail.track
                    : null;
    
    
            updateDisplay();
        }
    );
    
    
    /*
     * Update the visible count immediately
     * after the Worker records a new play.
     */
    window.addEventListener(
        "abraham-radio-count",
        event => {
    
            const detail =
                event.detail || {};
    
    
            if (
                typeof detail.trackId !==
                    "string" ||
                !Number.isFinite(
                    detail.count
                )
            ) {
                return;
            }
    
    
            playCounts[
                detail.trackId
            ] =
                Math.max(
                    0,
                    Math.trunc(
                        detail.count
                    )
                );
    
    
            updateDisplay();
        }
    );


    reduceMotion.addEventListener?.(
        "change",
        updateDisplay
    );


    /* ========================================
       LOAD COUNTS
    ======================================== */

    async function loadPlayCounts() {

        try {

            const response =
                await fetch(
                    `${COUNTS_URL}?v=${Date.now()}`,
                    {
                        cache:
                            "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const payload =
                await response.json();


            if (
                payload &&
                payload.counts &&
                typeof payload.counts ===
                    "object"
            ) {

                playCounts =
                    payload.counts;

                updateDisplay();
            }


        } catch (error) {

            /*
             * Radio continues functioning even
             * if analytics counts are unavailable.
             */
            console.warn(
                "Radio play counts unavailable:",
                error
            );
        }
    }


    loadPlayCounts();


})();
