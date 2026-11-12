
require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

// TRANSLATION ROUTE - MyMemory
app.post("/translate", async (req, res) => {
    const { text, sourceLanguage, targetLanguage } = req.body;

    const supportedLanguages = [
        "en", "de", "hi", "kn", "fr", "es", "ta", "te"
    ];

    if (
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 5000 ||
        !supportedLanguages.includes(sourceLanguage) ||
        !supportedLanguages.includes(targetLanguage)
    ) {
        return res.status(400).json({
            error: "Invalid text or language."
        });
    }

    if (sourceLanguage === targetLanguage) {
        return res.json({ translatedText: text.trim() });
    }

    try {
        function splitIntoChunks(input, maxBytes = 450) {
            const chunks = [];
            let current = "";

            for (const char of input) {
                if (
                    Buffer.byteLength(current + char, "utf8") > maxBytes
                ) {
                    if (current) chunks.push(current);
                    current = "";
                }

                current += char;
            }

            if (current) chunks.push(current);
            return chunks;
        }

        const chunks = splitIntoChunks(text.trim());
        const translatedParts = [];

        for (const chunk of chunks) {
            const params = new URLSearchParams({
                q: chunk,
                langpair: `${sourceLanguage}|${targetLanguage}`
            });

            const response = await fetch(
                `https://api.mymemory.translated.net/get?${params}`
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (
                data.responseStatus !== 200 ||
                !data.responseData?.translatedText
            ) {
                return res.status(502).json({
                    error: data.responseDetails || "Translation failed."
                });
            }

            translatedParts.push(data.responseData.translatedText);
        }

        res.json({
            translatedText: translatedParts.join("").trim()
        });

    } catch (error) {
    console.error("Translation error:", error);
        res.status(500).json({
            error: "Unable to connect to translation service."
        });
    }
});

// SERVER TEST
app.get("/test", (req, res) => {
    res.send("Translator server is working!");
});

// SPEECH ROUTE - Azure
app.post("/speak", async (req, res) => {
    const { text, language } = req.body;

    const voices = {
        kn: { locale: "kn-IN", name: "kn-IN-SapnaNeural" },
        ta: { locale: "ta-IN", name: "ta-IN-PallaviNeural" },
        te: { locale: "te-IN", name: "te-IN-ShrutiNeural" }
    };

    if (
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 5000 ||
        !voices[language]
    ) {
        return res.status(400).json({
            error: "Invalid text or language."
        });
    }

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!key || !region) {
        return res.status(503).json({
            error: "Speech service is not configured yet."
        });
    }

    const escapeXml = (value) =>
        value.replace(/[<>&'"]/g, char => ({
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            "'": "&apos;",
            '"': "&quot;"
        })[char]);

    const voice = voices[language];

    const ssml = `
        <speak version="1.0"
            xmlns="http://www.w3.org/2001/10/synthesis"
            xml:lang="${voice.locale}">
            <voice name="${voice.name}">
                ${escapeXml(text.trim())}
            </voice>
        </speak>
    `;

    try {
        const response = await fetch(
            `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
            {
                method: "POST",
                headers: {
                    "Ocp-Apim-Subscription-Key": key,
                    "Content-Type": "application/ssml+xml",
                    "X-Microsoft-OutputFormat":
                        "audio-24khz-160kbitrate-mono-mp3",
                    "User-Agent": "LanguageTranslator"
                },
                body: ssml
            }
        );

        if (!response.ok) {
            return res.status(502).json({
                error: "Speech service request failed."
            });
        }

        const audio = Buffer.from(await response.arrayBuffer());

        res.set("Content-Type", "audio/mpeg");
        res.send(audio);

    } catch (error) {
        console.error("Speech error:", error.message);

        res.status(500).json({
            error: "Unable to generate speech."
        });
    }
});

// START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
