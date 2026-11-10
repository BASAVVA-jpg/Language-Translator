require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));
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

    const key = process.env.AZURE_TRANSLATOR_KEY;
    const region = process.env.AZURE_TRANSLATOR_REGION;
    const endpoint = (
        process.env.AZURE_TRANSLATOR_ENDPOINT ||
        "https://api.cognitive.microsofttranslator.com"
    ).replace(/\/+$/, "");

    if (!key) {
        return res.status(503).json({
            error: "Translation service is not configured yet."
        });
    }

    try {
        const params = new URLSearchParams({
            "api-version": "3.0",
            from: sourceLanguage,
            to: targetLanguage
        });

        const headers = {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/json"
        };

        if (region) {
            headers["Ocp-Apim-Subscription-Region"] = region;
        }

        const response = await fetch(
            `${endpoint}/translate?${params}`,
            {
                method: "POST",
                headers,
                body: JSON.stringify([{ Text: text.trim() }])
            }
        );

        if (!response.ok) {
            console.error("Translator API status:", response.status);
            return res.status(502).json({
                error: "Translation service request failed."
            });
        }

        const data = await response.json();
        const translated = data[0]?.translations?.[0]?.text;

        if (!translated) {
            return res.status(502).json({
                error: "No translation was returned."
            });
        }

        res.json({ translatedText: translated });

    } catch (error) {
        console.error("Translation error:", error.message);
        res.status(500).json({
            error: "Unable to connect to translation service."
        });
    }
});
app.get("/test", (req, res) => {
    res.send("Translator server is working!");
});

app.post("/speak", async (req, res) => {
    const { text, language } = req.body;

    const voices = {
        kn: { locale: "kn-IN", name: "kn-IN-SapnaNeural" },
        ta: { locale: "ta-IN", name: "ta-IN-PallaviNeural" },
        te: { locale: "te-IN", name: "te-IN-ShrutiNeural" }
    };

    if (!text || !voices[language]) {
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
            ${escapeXml(text)}
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
            return res.status(response.status).json({
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

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});