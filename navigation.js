(() => {

    "use strict";


    let navigationController = null;


    function isInternalPageLink(anchor, event) {

        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            anchor.target === "_blank" ||
            anchor.hasAttribute("download")
        ) {
            return false;
        }


        const url =
            new URL(
                anchor.href,
                window.location.href
            );


        if (
            url.origin !==
            window.location.origin
        ) {
            return false;
        }


        /*
         * Don't interfere with:
         * mailto:, tel:, etc.
         */

        if (
            url.protocol !==
            "http:" &&
            url.protocol !==
            "https:"
        ) {
            return false;
        }


        /*
         * Same-page hash link:
         * let the browser handle it.
         */

        if (
            url.pathname ===
                window.location.pathname &&
            url.search ===
                window.location.search &&
            url.hash
        ) {
            return false;
        }


        return true;
    }


    async function loadPage(
        url,
        pushHistory = true
    ) {

        /*
         * Cancel a previous unfinished
         * navigation if another link
         * is clicked quickly.
         */

        if (navigationController) {
            navigationController.abort();
        }


        navigationController =
            new AbortController();


        try {

            const response =
                await fetch(
                    url.href,
                    {
                        signal:
                            navigationController.signal,

                        headers: {
                            "X-Requested-With":
                                "partial-navigation"
                        }
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const html =
                await response.text();


            const parser =
                new DOMParser();


            const nextDocument =
                parser.parseFromString(
                    html,
                    "text/html"
                );


            const nextMain =
                nextDocument.querySelector(
                    "main"
                );


            const currentMain =
                document.querySelector(
                    "main"
                );


            const nextNav =
                nextDocument.querySelector(
                    "header nav"
                );


            const currentNav =
                document.querySelector(
                    "header nav"
                );


            if (
                !nextMain ||
                !currentMain
            ) {
                throw new Error(
                    "Page is missing <main>"
                );
            }


            const updatePage = () => {

                /*
                 * Replace page content,
                 * NOT the radio/header.
                 */

                currentMain.replaceWith(
                    nextMain
                );


                /*
                 * Replace only the nav so
                 * active-page styling updates.
                 */

                if (
                    nextNav &&
                    currentNav
                ) {

                    currentNav.replaceWith(
                        nextNav
                    );
                }


                /*
                 * Browser tab title.
                 */

                document.title =
                    nextDocument.title;


                updateMeta(
                    nextDocument,
                    'meta[name="description"]'
                );


                updateLink(
                    nextDocument,
                    'link[rel="canonical"]'
                );


                /*
                 * Update URL only after the
                 * new page is ready.
                 */

                if (pushHistory) {

                    history.pushState(
                        {},
                        "",
                        url.href
                    );
                }
            };


            /*
             * Smooth transition where
             * supported.
             */

            if (
                "startViewTransition" in
                document
            ) {

                const transition =
                    document.startViewTransition(
                        updatePage
                    );


                await transition.finished;

            } else {

                updatePage();
            }


            window.scrollTo(
                {
                    top: 0,
                    left: 0,
                    behavior: "instant"
                }
            );


        } catch (error) {

            if (
                error.name ===
                "AbortError"
            ) {
                return;
            }


            /*
             * Safe fallback:
             * normal browser navigation.
             */

            window.location.href =
                url.href;
        }
    }


    function updateMeta(
        nextDocument,
        selector
    ) {

        const current =
            document.querySelector(
                selector
            );


        const next =
            nextDocument.querySelector(
                selector
            );


        if (
            current &&
            next
        ) {

            current.setAttribute(
                "content",
                next.getAttribute(
                    "content"
                )
            );
        }
    }


    function updateLink(
        nextDocument,
        selector
    ) {

        const current =
            document.querySelector(
                selector
            );


        const next =
            nextDocument.querySelector(
                selector
            );


        if (
            current &&
            next
        ) {

            current.setAttribute(
                "href",
                next.getAttribute(
                    "href"
                )
            );
        }
    }


    /*
     * Internal link navigation.
     *
     * Event delegation means this
     * continues working even after
     * <nav> is replaced.
     */

    document.addEventListener(
        "click",
        event => {

            const anchor =
                event.target.closest(
                    "a"
                );


            if (
                !anchor ||
                !isInternalPageLink(
                    anchor,
                    event
                )
            ) {
                return;
            }


            const url =
                new URL(
                    anchor.href,
                    window.location.href
                );


            event.preventDefault();


            loadPage(
                url,
                true
            );
        }
    );


    /*
     * Browser Back / Forward.
     */

    window.addEventListener(
        "popstate",
        () => {

            loadPage(
                new URL(
                    window.location.href
                ),
                false
            );
        }
    );

})();
