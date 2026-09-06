import {
    mkdir,
    writeFile
} from "node:fs/promises";

import {
    GoogleAuth
} from "google-auth-library";

/* ========================================

   GA4 SETTINGS

======================================== */

const PROPERTY_ID =

    process.env.GA4_PROPERTY_ID;

const SERVICE_ACCOUNT_JSON =

    process.env.GA4_SERVICE_ACCOUNT_JSON;

if (!PROPERTY_ID) {

    throw new Error(

        "Missing GA4_PROPERTY_ID"

    );

}

if (!SERVICE_ACCOUNT_JSON) {

    throw new Error(

        "Missing GA4_SERVICE_ACCOUNT_JSON"

    );

}

/* ========================================

   SERVICE ACCOUNT

======================================== */

let credentials;

try {

    credentials =

        JSON.parse(

            SERVICE_ACCOUNT_JSON

        );

} catch {

    throw new Error(

        "GA4_SERVICE_ACCOUNT_JSON is not valid JSON"

    );

}

const auth =

    new GoogleAuth({

        credentials,

        scopes: [

            "https://www.googleapis.com/auth/analytics.readonly"

        ]

    });

const client =

    await auth.getClient();

const accessToken =

    await client.getAccessToken();

if (!accessToken.token) {

    throw new Error(

        "Could not obtain Google access token"

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

   REQUEST GA4 PLAY TOTALS

======================================== */

const endpoint =

    "https://analyticsdata.googleapis.com/" +

    "v1beta/properties/" +

    `${PROPERTY_ID}:runReport`;

const response =

    await fetch(

        endpoint,

        {

            method:

                "POST",

            headers: {

                Authorization:

                    `Bearer ${accessToken.token}`,

                "Content-Type":

                    "application/json"

            },

            body:

                JSON.stringify({

                    dateRanges: [

                        {

                            startDate:

                                "2026-09-06",

                            endDate:

                                "today"

                        }

                    ],

                    dimensions: [

                        {

                            name:

                                "customEvent:track"

                        },

                        {

                            name:

                                "eventName"

                        }

                    ],

                    metrics: [

                        {

                            name:

                                "eventCount"

                        }

                    ],

                    dimensionFilter: {

                        filter: {

                            fieldName:

                                "eventName",

                            stringFilter: {

                                matchType:

                                    "EXACT",

                                value:

                                    "music_play"

                            }

                        }

                    }

                })

        }

    );

if (!response.ok) {

    throw new Error(

        `GA4 Data API ${response.status}: ` +

        await response.text()

    );

}

/* ========================================
   NORMALISE RESPONSE
======================================== */

const payload =

    await response.json();

const rows =

    Array.isArray(

        payload.rows

    )

        ? payload.rows

        : [];

for (const row of rows) {

    const trackTitle =

        row.dimensionValues?.[0]?.value;

    const eventName =

        row.dimensionValues?.[1]?.value;

    if (

        eventName !==

            "music_play"

    ) {

        continue;

    }

    const trackId =

        TRACK_IDS_BY_TITLE[

            trackTitle

        ];

    if (!trackId) {

        continue;

    }

    const total =

        Number(

            row.metricValues?.[0]?.value

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
