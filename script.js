document.addEventListener('DOMContentLoaded', () => {

// ===== API KEY =====
let API_KEY = localStorage.getItem('jarvis_key');
if(!API_KEY || API_KEY.length < 20){
  API_KEY = prompt('Enter your Gemini API Key (starts with AIza...):');
  if(API_KEY) localStorage.setItem('jarvis_key', API_KEY.trim());
}

// ===== ELEMENTS =====
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');

// ===== WORKING MODELS - NO 404 =====
const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-latest"
];

async function callGemini(promptText){
  let lastError = null;
  for(const model of MODELS){
    try{
      console.log('Trying:', model);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({contents:[{parts:[{text:promptText}]}]})
        }
      );
      const data = await response.json();
      
      if(data.error){
        console.warn(model + ' error:', data.error.message);
        // If 404 or 503, try next model
        if(data.error.code === 404 || data.error.code === 503 || data.error.status === 'UNAVAILABLE'){
          lastError = data.error.message;
          continue;
        }
        throw new Error(data.error.message);
      }
      
      if(data.candidates && data.candidates[0]){
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error('No response');
      
    }catch(e){
      lastError = e;
      console.log(model + ' failed, trying next...');
    }
  }
  throw new Error(lastError || 'All models busy. Wait 30 sec.');
}

async function askGemini(text){
  add('J.A.R.V.I.S: Thinking...','ai');
  try{
    const reply = await callGemini(text);
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  }catch(e){
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== SEND BUTTON - FIXED =====
sendBtn.addEventListener('click', () => {
  const t = input.value.trim();
  if(!t) return;
  add('YOU: ' + t, 'user');
  input.value = '';
  askGemini(t);
});

input.addEventListener('keypress', (e) => {
  if(e.key === 'Enter'){
    sendBtn.click();
  }
});

// ===== MIC BUTTON - FIXED =====
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

if(!SpeechRec){
  micBtn.innerText = '❌';
  micBtn.title = 'Voice not supported';
  micBtn.onclick = () => alert('Voice only works in Chrome on Android. Use Chrome.');
} else {
  const recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    micBtn.innerText = '🔴';
    micBtn.style.background = 'red';
    micBtn.style.color = 'white';
  };

  recognition.onend = () => {
    micBtn.innerText = '🎙';
    micBtn.style.background = '#0ff';
    micBtn.style.color = '#000';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    add('YOU: ' + transcript, 'user');
    askGemini(transcript);
  };

  recognition.onerror = (event) => {
    alert('Mic Error: ' + event.error + '\nCheck mic permission in browser settings');
    micBtn.innerText = '🎙';
    micBtn.style.background = '#0ff';
  };

  micBtn.addEventListener('click', () => {
    try{
      recognition.start();
    }catch(err){
      recognition.stop();
      setTimeout(()=>{ try{recognition.start()}catch{} }, 300);
    }
  });
  
  // Update status to ONLINE
  const voiceRow = document.querySelectorAll('.row')[2];
  if(voiceRow){
    voiceRow.querySelector('b').innerText = '• ONLINE';
    voiceRow.querySelector('b').className = 'on';
  }
}

// ===== HELPER FUNCTIONS =====
function speak(text){
  try{
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
  }catch{}
}

function add(text, who){
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Reset key function - call from console if needed
window.resetKey = function(){
  localStorage.removeItem('jarvis_key');
  alert('API Key cleared! Reloading page...');
  location.reload();
}

// Welcome
add('J.A.R.V.I.S: Systems Online Boss! All errors fixed.','ai');

});
