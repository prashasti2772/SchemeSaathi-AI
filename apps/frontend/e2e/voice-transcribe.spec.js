import { test, expect } from "@playwright/test";
import voiceStrings from "../src/lib/locales/voice.js";

// Exercise the real WAV encoder and UI with deterministic microphone samples.
// No microphone permission, Bhashini account, or live speech service is used.
async function prepareMicrophone(page, mode = "ok") {
  await page.addInitScript(({ mode }) => {
    localStorage.setItem("schemeSaathiLanguage", "en");
    window.voiceCapture = { requested: 0, stopped: 0, closed: 0, recognition: 0 };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        window.voiceCapture.requested++;
        if (mode === "denied") throw new DOMException("Permission denied", "NotAllowedError");
        return { getTracks: () => [{ stop: () => { window.voiceCapture.stopped++; } }] };
      },
    });
    window.AudioContext = class {
      sampleRate = 48000;
      destination = {};
      async resume() {
        if (mode === "context_failure") throw new Error("Audio input unavailable");
      }
      async close() { window.voiceCapture.closed++; }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      createScriptProcessor() {
        return {
          onaudioprocess: null,
          connect() {
            this.onaudioprocess({ inputBuffer: {
              getChannelData: () => Float32Array.from({ length: 4096 }, (_, i) => Math.sin(i / 12) * 0.25),
            } });
          },
          disconnect() {},
        };
      }
    };
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      constructor() { window.voiceCapture.recognition++; throw new Error("Browser recognition must not be the primary path"); }
    };
  }, { mode });
  await page.route("**/api/v1/public/voice/status", route => route.fulfill({
    json: { configured: true, tts_languages: ["en", "hi"] },
  }));
}

async function startAndStop(page) {
  const microphone = page.getByTestId("assistant-microphone");
  await microphone.click();
  await expect(microphone).toHaveAttribute("aria-label", /Stop listening|सुनना रोकें/);
  await microphone.click();
}

for (const [language, transcript] of [["en", "a tailoring loan"], ["hi", "सिलाई व्यवसाय के लिए ऋण"]]) {
  test(`WAV transcription appends ${language} to the draft without sending it`, async ({ page }) => {
    await prepareMicrophone(page);
    let payload;
    const chatRequests = [];
    page.on("request", request => {
      if (/\/(?:assistant-chat|chat|chatbot)(?:[/?]|$)/.test(request.url())) chatRequests.push(request.url());
    });
    await page.route("**/api/v1/public/voice/transcribe", route => {
      payload = route.request().postDataJSON();
      return route.fulfill({ json: { transcript } });
    });
    await page.goto("/ai-assistant");
    await page.getByRole("combobox").selectOption(language);
    const draft = page.locator("#assistant-question");
    await draft.fill("Tell me about");
    await startAndStop(page);
    await expect(draft).toHaveValue(`Tell me about ${transcript}`);
    expect(payload.language).toBe(language);
    const wav = Buffer.from(payload.audio_base64, "base64");
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(16000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.length).toBeGreaterThan(44);
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
    expect(await page.evaluate(() => window.voiceCapture)).toEqual({ requested: 1, stopped: 1, closed: 1, recognition: 0 });
    expect(chatRequests).toEqual([]);
    await expect(page.getByTestId("user-message")).toHaveCount(0);
  });
}

for (const mode of ["denied", "context_failure", "provider_failure"]) {
  test(`${mode} keeps the draft and displays the existing voice error`, async ({ page }) => {
    await prepareMicrophone(page, mode);
    await page.route("**/api/v1/public/voice/transcribe", route => route.fulfill({
      status: 503, json: { detail: "Speech provider unavailable" },
    }));
    await page.goto("/ai-assistant");
    if (mode === "provider_failure") await page.getByRole("combobox").selectOption("hi");
    await page.locator("#assistant-question").fill("Keep my typed question");
    if (mode === "provider_failure") await startAndStop(page);
    else await page.getByTestId("assistant-microphone").click();
    await expect(page.getByRole("alert")).toHaveText(mode === "provider_failure"
      ? voiceStrings.assistant_voice_input_failed.hi
      : "Could not capture your voice. Try again or type your question.");
    await expect(page.locator("#assistant-question")).toHaveValue("Keep my typed question");
    await expect(page.getByTestId("assistant-microphone")).toBeEnabled();
    const capture = await page.evaluate(() => window.voiceCapture);
    expect(capture.stopped).toBe(mode === "denied" ? 0 : 1);
    expect(capture.recognition).toBe(0);
  });
}

for (const action of ["language", "new chat", "navigation"]) {
  test(`${action} discards a late transcription`, async ({ page }) => {
    await prepareMicrophone(page);
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    let requested = false;
    let settled = false;
    await page.route("**/api/v1/public/voice/transcribe", async route => {
      requested = true;
      await pending;
      await route.fulfill({ json: { transcript: "Stale transcript must not appear" } });
      settled = true;
    });
    await page.goto("/ai-assistant");
    await page.locator("#assistant-question").fill("Original draft");
    await startAndStop(page);
    await expect.poll(() => requested).toBe(true);
    await expect(page.getByTestId("assistant-microphone")).toBeDisabled();
    if (action === "language") await page.getByRole("combobox").selectOption("hi");
    else if (action === "new chat") await page.getByRole("button", { name: "+ New chat", exact: true }).click();
    else await page.evaluate(() => {
      history.pushState({}, "", "/about");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    release();
    await expect.poll(() => settled).toBe(true);
    if (action === "navigation") {
      await expect(page.locator("#assistant-question")).toHaveCount(0);
      await page.evaluate(() => {
        history.pushState({}, "", "/ai-assistant");
        dispatchEvent(new PopStateEvent("popstate"));
      });
    }
    await expect(page.locator("#assistant-question")).toHaveValue(action === "language" ? "Original draft" : "");
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect((await page.evaluate(() => window.voiceCapture)).stopped).toBe(1);
  });
}

test("cancelling an active recording releases the microphone without transcription", async ({ page }) => {
  await prepareMicrophone(page);
  let requests = 0;
  await page.route("**/api/v1/public/voice/transcribe", route => {
    requests++;
    return route.fulfill({ json: { transcript: "Unexpected transcript" } });
  });
  await page.goto("/ai-assistant");
  await page.getByTestId("assistant-microphone").click();
  await expect(page.getByTestId("assistant-microphone")).toHaveAttribute("aria-label", "Stop listening");
  await page.getByRole("button", { name: "+ New chat", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.voiceCapture.stopped)).toBe(1);
  expect(requests).toBe(0);
});

test("recording automatically stops after forty seconds", async ({ page }) => {
  await prepareMicrophone(page);
  await page.route("**/api/v1/public/voice/transcribe", route => route.fulfill({ json: { transcript: "Timed recording" } }));
  await page.goto("/ai-assistant");
  await page.clock.install();
  await page.getByTestId("assistant-microphone").click();
  await expect(page.getByTestId("assistant-microphone")).toHaveAttribute("aria-label", "Stop listening");
  await page.clock.fastForward(40001);
  await expect(page.locator("#assistant-question")).toHaveValue("Timed recording");
  expect((await page.evaluate(() => window.voiceCapture)).stopped).toBe(1);
});


test("long transcription preserves the typed draft within the existing text limit", async ({ page }) => {
  await prepareMicrophone(page);
  await page.route("**/api/v1/public/voice/transcribe", route => route.fulfill({ json: { transcript: "another useful question about a loan" } }));
  await page.goto("/ai-assistant");
  const original = "a".repeat(1990);
  await page.locator("#assistant-question").fill(original);
  await startAndStop(page);
  await expect(page.locator("#assistant-question")).toHaveValue(original + " another u");
  expect((await page.locator("#assistant-question").inputValue()).length).toBe(2000);
});
