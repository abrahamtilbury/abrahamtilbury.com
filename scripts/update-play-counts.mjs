import {
    mkdir,
    writeFile
} from "node:fs/promises";


/* ========================================
   UMAMI SETTINGS
======================================== */

const API_BASE =
    "https://api.umami.is/v1";

const API_KEY =
    process.env.UMAMI_API_KEY;

const WEBSITE_ID =
    process.env.UMAMI_WEBSITE_ID;


if (!API_KEY) {

    throw new Error(
        "Missing UMAMI_API_KEY"
    );
}


if (!WEBSITE_ID) {

    throw new Error(
        "Missing UMAMI_WEBSITE_ID"
    );
}


/* ========================================
   RADIO TRACK LOOKUP
======================================== */

const TRACK_IDS_BY_TITLE = {

    "Butterflies":
        "butterflies",

    "City Lights":
        "citylights",

    "Dreams":
        "dreams",

    "Op My Eyes":
        "opmyeyes",

    "Photons":
        "photons",

    "Pineapple":
        "pineapple",

    "Racks":
        "racks",

    "So Right":
        "soright"
};


/*
 * Start every known track at zero.
 * Umami values then overwrite them.
 */
const counts =
    Object.fromEntries(
        Object.values(
            TRACK_IDS_BY_TITLE
        ).map(
            id => [
                id,
                0
            ]
        )
    );


/* ========================================
   REQUEST PLAY TOTALS
======================================== */

const params =
    new URLSearchParams({

        /*
         * Entire recorded history.
         */
        startAt:
            "0",

        endAt:
            String(
                Date.now()
            ),

        event:
            "music-play",

        propertyName:
            "track"
    });


const response =
    await fetch(

        `${API_BASE}/websites/` +
        `${WEBSITE_ID}/event-data/values?` +
        params,

        {
            headers: {

                Accept:
                    "application/json",

                Authorization:
                    `Bearer ${API_KEY}`
            }
        }
    );


if (!response.ok) {

    throw new Error(
        `Umami API ${response.status}: ` +
        await response.text()
    );
}


/* ========================================
   NORMALISE RESPONSE
======================================== */

const payload =
    await response.json();


const rows =
    Array.isArray(payload)
        ? payload

        : Array.isArray(
            payload.data
        )
            ? payload.data
            : [];


for (
    const row
    of rows
) {

    const trackId =
        TRACK_IDS_BY_TITLE[
            row.value
        ];


    /*
     * Ignore analytics values that aren't
     * one of the current radio tracks.
     */
    if (!trackId) {
        continue;
    }


    const total =
        Number(
            row.total
        );


    counts[trackId] =
        Number.isFinite(total)
            ? Math.max(
                0,
                Math.trunc(total)
            )
            : 0;
}


/* ========================================
   WRITE PUBLIC JSON
======================================== */

await mkdir(
    "audio",
    {
        recursive: true
    }
);


await writeFile(

    "audio/play-counts.json",

    JSON.stringify(
        {
            updatedAt:
                new Date()
                    .toISOString(),

            counts
        },
        null,
        2
    ) + "\n",

    "utf8"
);


console.log(
    "Updated audio/play-counts.json"
);
