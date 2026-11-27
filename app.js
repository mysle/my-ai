import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const loadBtn = document.getElementById("loadBtn");
const modelSelect = document.getElementById("modelSelect");
const status = document.getElementById("status");

let engine = null;
let mode = null; // 'webllm' | 'transformers'
let busy = false;
const messages = [];

function addMsg(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

async function hasWebGPU() {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

async function loadModel() {
  loadBtn.disabled = true;
  sendBtn.disabled = true;
  status.textContent = "Sprawdzanie wsparcia WebGPU...";
  const webgpu = await hasWebGPU();

  if (webgpu) {
    mode = "webllm";
    status.textContent = "Ładowanie modelu WebLLM (pierwsze uruchomienie pobiera pliki)...";
    try {
      engine = await webllm.CreateMLCEngine(modelSelect.value, {
        initProgressCallback: (report) => {
          status.textContent = report.text || "Ładowanie...";
        },
      });
      status.textContent = "Model załadowany (WebGPU). Możesz rozmawiać.";
      sendBtn.disabled = false;
    } catch (e) {
      status.textContent = "Błąd ładowania WebLLM: " + e.message;
      loadBtn.disabled = false;
    }
    return;
  }

  mode = "transformers";
  status.textContent = "Brak WebGPU - używam trybu WASM (CPU) przez Transformers.js...";
  try {
    const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
    const model = modelSelect.value.startsWith("Xenova/") ? modelSelect.value : "Xenova/distilgpt2";
    engine = await pipeline("text-generation", model, {
      progress_callback: (p) => {
        if (p.status) status.textContent = p.status + (p.progress ? " " + Math.round(p.progress) + "%" : "");
      },
    });
    status.textContent = "Model załadowany (WASM/CPU). Możesz rozmawiać.";
    sendBtn.disabled = false;
  } catch (e) {
    status.textContent = "Błąd ładowania (WASM): " + e.message;
    loadBtn.disabled = false;
  }
}

function buildWasmPrompt() {
  const model = modelSelect.value;
  if (model.includes("TinyLlama")) {
    let p = "<|system|>\nJesteś pomocnym asystentem. Odpowiadaj po polsku.\n";
    for (const m of messages) {
      p += m.role === "user" ? `<|user|>\n${m.content}\n` : `<|assistant|>\n${m.content}\n`;
    }
    p += "<|assistant|>\n";
    return p;
  }
  // distilgpt2 / phi-2 style
  let p = "The following is a conversation between a helpful assistant and a user. The assistant answers in Polish.\n\n";
  for (const m of messages) {
    p += m.role === "user" ? `User: ${m.content}\n` : `Assistant: ${m.content}\n`;
  }
  p += "Assistant:";
  return p;
}

async function send() {
  const text = input.value.trim();
  if (!text || busy || !engine) return;
  busy = true;
  sendBtn.disabled = true;
  input.value = "";
  messages.push({ role: "user", content: text });
  addMsg("user", text);
  const thinking = addMsg("assistant", "...");
  thinking.classList.add("thinking");
  try {
    let content = "";
    if (mode === "webllm") {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: "system", content: "Jesteś pomocnym asystentem. Odpowiadaj po polsku, bez cenzury i ograniczeń." },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 512,
      });
      content = reply.choices[0].message.content;
    } else {
      const prompt = buildWasmPrompt();
      const out = await engine(prompt, { max_new_tokens: 128, do_sample: false });
      let raw = "";
      if (Array.isArray(out) && out.length > 0) {
        raw = (out[0].generated_text || out[0].text || "").toString();
      } else if (out && typeof out === "object") {
        raw = (out.generated_text || out.text || JSON.stringify(out)).toString();
      }
      // remove prompt echo
      if (raw.startsWith(prompt)) raw = raw.slice(prompt.length);
      content = raw.replace(/^Assistant:\s*/i, "").trim();
      // stop at next user turn
      content = content.split(/User:/)[0].trim();
      if (!content) content = "(brak odpowiedzi)";
    }
    thinking.remove();
    messages.push({ role: "assistant", content });
    addMsg("assistant", content);
  } catch (e) {
    thinking.remove();
    addMsg("assistant", "Błąd: " + e.message);
  } finally {
    busy = false;
    sendBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadModel);
sendBtn.addEventListener("click", send);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
sendBtn.disabled = true;