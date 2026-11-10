
// =====================================
// LANGUAGE TRANSLATOR - SCRIPT.JS
// =====================================


// TRANSLATE FUNCTION

async function translateText() {
    const text = document.getElementById("inputText").value.trim();
    const sourceLanguage = document.getElementById("sourceLanguage").value;
    const targetLanguage = document.getElementById("targetLanguage").value;
    const output = document.getElementById("translatedText");

    const translateBtn = document.querySelector(
        'button[onclick="translateText()"]'
    );

    if (!text) {
        output.innerText = "Please enter some text!";
        return;
    }

    if (sourceLanguage === targetLanguage) {
        output.innerText = text;
        return;
    }

    output.innerText = "Translating...";

    if (translateBtn) {
        translateBtn.disabled = true;
        translateBtn.textContent = "Translating...";
    }

    try {
        const response = await fetch("/translate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text,
                sourceLanguage,
                targetLanguage
            })
        });

        const data = await response.json();

        if (!response.ok) {
            output.innerText = data.error || "Translation failed.";
            return;
        }

        output.innerText =
            data.translatedText || "No translation returned.";

        if (data.translatedText) {
            addToHistory(
                text,
                data.translatedText,
                sourceLanguage,
                targetLanguage
            );
        }

    } catch (error) {
        console.error("Translation error:", error);
        output.innerText = "Unable to connect to translation service.";

    } finally {
        if (translateBtn) {
            translateBtn.disabled = false;
            translateBtn.textContent = "Translate";
        }
    }
}



// SWAP LANGUAGES AND TEXT
function swapLanguages() {
    const source = document.getElementById("sourceLanguage");
    const target = document.getElementById("targetLanguage");

    const input = document.getElementById("inputText");
    const output = document.getElementById("translatedText");

    const tempLanguage = source.value;
    source.value = target.value;
    target.value = tempLanguage;

    const translatedText = output.innerText;

    if (
        translatedText !== "Your translated text will appear here..." &&
        translatedText !== "Translating..."
    ) {
        const originalText = input.value;
        input.value = translatedText;
        output.innerText = originalText;
        updateCharacterCount();
    }
}


// CLEAR TEXT
function clearText() {
    document.getElementById("inputText").value = "";

    document.getElementById("translatedText").innerText =
        "Your translated text will appear here...";

    updateCharacterCount();
}


// COPY TRANSLATION
async function copyText() {
    const text = document.getElementById("translatedText").innerText;

    if (!text || text === "Your translated text will appear here...") {
        alert("Nothing to copy!");
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        alert("Copied successfully!");
    } catch (error) {
        alert("Unable to copy.");
    }
}


// DARK MODE
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    const button = document.getElementById("darkModeBtn");

    if (document.body.classList.contains("dark-mode")) {
        button.innerText = "☀️ Light Mode";
    } else {
        button.innerText = "🌙 Dark Mode";
    }
}


// SPEECH OUTPUT
async function speakText() {
    const text = document.getElementById("translatedText").innerText.trim();
    const language = document.getElementById("targetLanguage").value;

    if (
        !text ||
        text === "Your translated text will appear here..." ||
        text === "Translating..."
    ) {
        alert("Please translate some text first!");
        return;
    }

    const azureLanguages = ["kn", "ta", "te"];

    if (azureLanguages.includes(language)) {
        try {
            const response = await fetch("/speak", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text, language })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || "Speech service unavailable.");
                return;
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => URL.revokeObjectURL(audioUrl);
            audio.onerror = () => URL.revokeObjectURL(audioUrl);

            await audio.play();
            return;

        } catch (error) {
            console.error("Speech error:", error);
            alert("Unable to connect to speech service.");
            return;
        }
    }

    if (!("speechSynthesis" in window)) {
        alert("Speech output is not supported in this browser.");
        return;
    }

    const voiceLanguages = {
        en: "en-US",
        de: "de-DE",
        hi: "hi-IN",
        fr: "fr-FR",
        es: "es-ES"
    };

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = voiceLanguages[language] || language;
    speech.rate = 1;

    window.speechSynthesis.speak(speech);
}


// VOICE INPUT
function startVoiceInput() {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice input is not supported in this browser.");
        return;
    }

    const sourceLanguage = document.getElementById("sourceLanguage").value;
    const input = document.getElementById("inputText");

    const recognition = new SpeechRecognition();

    const voiceLanguages = {
        en: "en-US",
        de: "de-DE",
        hi: "hi-IN",
        kn: "kn-IN",
        fr: "fr-FR",
        es: "es-ES",
        ta: "ta-IN",
        te: "te-IN"
    };

    recognition.lang = voiceLanguages[sourceLanguage] || sourceLanguage;
    recognition.interimResults = false;

    recognition.onresult = function (event) {
        input.value = event.results[0][0].transcript;
        updateCharacterCount();
    };

    recognition.onerror = function (event) {
        console.error("Voice input error:", event.error);
        alert("Voice input failed. Please try again.");
    };

    recognition.start();
}


// CHARACTER COUNTER
function updateCharacterCount() {
    const input = document.getElementById("inputText");
    const counter = document.getElementById("charCount");

    if (!input || !counter) return;

    const count = input.value.length;

    counter.innerText = `${count} / 5000 characters`;
    counter.style.color = count >= 4500 ? "red" : "";
}


// KEYBOARD SHORTCUT AND COUNTER INITIALIZATION
document.addEventListener("DOMContentLoaded", function () {
    const input = document.getElementById("inputText");

    if (!input) return;

    updateCharacterCount();

    input.addEventListener("input", updateCharacterCount);

    input.addEventListener("keydown", function (event) {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            translateText();
        }
    });
});
function addToHistory(original, translated, source, target) {
    let history = JSON.parse(
        localStorage.getItem("translationHistory") || "[]"
    );

history.unshift({
    original,
    translated,
    source,
    target,
    date: new Date().toLocaleString()
});    history = history.slice(0, 10);

    localStorage.setItem("translationHistory", JSON.stringify(history));
    renderTranslationHistory();
}

function renderTranslationHistory() {
    const container = document.getElementById("translationHistory");
    if (!container) return;

    const history = JSON.parse(
        localStorage.getItem("translationHistory") || "[]"
    );

    container.replaceChildren();

    if (history.length === 0) {
        container.textContent = "No translations yet.";
        return;
    }

    history.forEach(item => {
        const entry = document.createElement("div");
        entry.className = "history-item";
        const text = document.createElement("span");
text.textContent = `${item.original} → ${item.translated}`;

const deleteBtn = document.createElement("button");
deleteBtn.textContent = "Delete";

deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    let history = JSON.parse(
        localStorage.getItem("translationHistory") || "[]"
    );

const index = history.findIndex(entry =>
    entry.original === item.original &&
    entry.translated === item.translated &&
    entry.source === item.source &&
    entry.target === item.target &&
    entry.date === item.date
);

if (index !== -1) {
    history.splice(index, 1);
}
    localStorage.setItem("translationHistory", JSON.stringify(history));
    renderTranslationHistory();
});

const date = document.createElement("small");
date.textContent = item.date || "Older translation";
date.className = "history-date";

const details = document.createElement("div");
const languages = document.createElement("small");
languages.textContent = `${item.source.toUpperCase()} → ${item.target.toUpperCase()}`;
languages.className = "history-languages";

details.append(text, languages, date);
entry.append(details, deleteBtn);
        entry.addEventListener("click", () => {
            document.getElementById("inputText").value = item.original;
            document.getElementById("translatedText").textContent = item.translated;
            document.getElementById("sourceLanguage").value = item.source;
            document.getElementById("targetLanguage").value = item.target;
            updateCharacterCount();
        });

        container.appendChild(entry);
    });
}

function clearHistory() {
    localStorage.removeItem("translationHistory");
    renderTranslationHistory();
}

document.addEventListener("DOMContentLoaded", renderTranslationHistory);
function searchHistory() {
    const query = document
        .getElementById("historySearch")
        .value.toLowerCase();

    const items = document.querySelectorAll(".history-item");

    items.forEach(item => {
        item.style.display = item.textContent
            .toLowerCase()
            .includes(query) ? "flex" : "none";
    });
}
function exportHistory() {
    const history = JSON.parse(
        localStorage.getItem("translationHistory") || "[]"
    );

    if (history.length === 0) {
        alert("No translation history to export!");
        return;
    }

    const content = history.map((item, index) => {
        return `Translation ${index + 1}
Original: ${item.original}
Translated: ${item.translated}
Languages: ${item.source} → ${item.target}
Date: ${item.date || "Not available"}
`;
    }).join("\n----------------------\n");

    const blob = new Blob([content], {
        type: "text/plain"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "translation-history.txt";
    link.click();

    URL.revokeObjectURL(url);
}
function exportHistoryCSV() {
    const history = JSON.parse(
        localStorage.getItem("translationHistory") || "[]"
    );

    if (!history.length) {
        alert("No history to export!");
        return;
    }

    const rows = [
        ["Original", "Translated", "Source", "Target", "Date"],
        ...history.map(item => [
            item.original,
            item.translated,
            item.source,
            item.target,
            item.date || ""
        ])
    ];

    const csv = rows.map(row =>
        row.map(value =>
            `"${String(value).replace(/"/g, '""')}"`
        ).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "translation-history.csv";
    link.click();

    URL.revokeObjectURL(url);
}