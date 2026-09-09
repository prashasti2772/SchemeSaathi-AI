// Capture mono PCM and resample to Bhashini's 16 kHz WAV input.
export async function recordWav() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  await ctx.resume();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain(); mute.gain.value = 0;
  const chunks = [];
  node.onaudioprocess = e => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(node); node.connect(mute); mute.connect(ctx.destination);
  return async () => {
    node.disconnect(); source.disconnect(); mute.disconnect();
    stream.getTracks().forEach(track => track.stop());
    const rate = ctx.sampleRate;
    await ctx.close();
    const input = new Float32Array(chunks.reduce((n, chunk) => n + chunk.length, 0));
    let offset = 0; chunks.forEach(chunk => { input.set(chunk, offset); offset += chunk.length; });
    const count = Math.floor(input.length * 16000 / rate);
    const buffer = new ArrayBuffer(44 + count * 2); const view = new DataView(buffer);
    const text = (pos, value) => [...value].forEach((c, i) => view.setUint8(pos + i, c.charCodeAt(0)));
    text(0, "RIFF"); view.setUint32(4, 36 + count * 2, true); text(8, "WAVE"); text(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, "data"); view.setUint32(40, count * 2, true);
    for (let i = 0; i < count; i++) {
      const sample = Math.max(-1, Math.min(1, input[Math.floor(i * rate / 16000)] || 0));
      view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
    }
    let binary = ""; for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
    return btoa(binary);
  };
}

