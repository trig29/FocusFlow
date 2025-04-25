const welcome = document.getElementById('welcome');
const sequence = document.getElementById('sequence');
const mainScreen = document.getElementById('main-screen');
const focusImg = document.getElementById('focus-img');
const focusText = document.getElementById('focus-text');
const successText = document.getElementById('success-text');

let thinking = false
let msgElement = null

class Message {
  constructor(type, value) {
    this.type = type
    this.value = value
  }

  encode() {
    let msg = JSON.stringify(this)
    return msg
  }
}

const focusSteps = [
  { src: 'static/images/Image1.jpg', corner: 'upper-right corner' },
  { src: 'static/images/Image2.jpg', corner: 'upper-left corner' },
  { src: 'static/images/Image3.jpg', corner: 'bottom-left corner' },
  { src: 'static/images/Image4.jpg', corner: 'bottom-right corner' }
];

function startFocus() {
  welcome.style.display = 'none';
  sequence.style.display = 'flex';

  showFocusStep(0);
}

function showFocusStep(index) {
  if (index >= focusSteps.length) {
    completeFocusSequence();
    return;
  }
  const step = focusSteps[index];
  focusImg.src = step.src;
  focusImg.style.display = 'block';

  runCountdown(
    3,
    (timeLeft) => {
      focusText.textContent = `Prepare to stare at the ${step.corner} on your screen (${timeLeft}s)`;
    },
    () => {
      chrome.runtime.sendMessage({ action: 'ws_send', value: (new Message("corner", index + 1)).encode() })
      runCountdown(
        3,
        (timeLeft) => {
          focusText.textContent = `Please stare at the ${step.corner} on your screen. Remain Still! (${timeLeft}s)`;
        },
        () => showFocusStep(index + 1)
      );
    }
  );
}

function runCountdown(duration, onTick, onComplete) {
  let timeLeft = duration;

  function tick() {
    if (timeLeft > 0) {
      onTick(timeLeft);
      timeLeft--;
      setTimeout(tick, 1000);
    } else {
      onComplete();
    }
  }

  tick();
}

function completeFocusSequence() {
  focusText.textContent = '';
  successText.textContent = 'Initiation complete! 🎉';
  focusImg.style.display = 'none';
  chrome.storage.session.set({ initialized: true })
  setTimeout(() => {
    sequence.style.display = 'none';
    mainScreen.style.display = 'block';
  }, 3000);
}

document.querySelector("#start").addEventListener("click", startFocus);
document.querySelector(".stop-focus-btn").addEventListener("click",event=>{
  event.preventDefault()
  chrome.runtime.sendMessage({ action: "ws_send", value: (new Message("stop", {})).encode() })
  mainScreen.style.display = 'none';
  welcome.style.display = 'flex';
  sequence.style.display = 'none';
  chrome.storage.session.set({ initialized: false })
  chrome.storage.session.remove("response")
  chrome.storage.session.remove("initialized")
  const checkInterval = setInterval(() => {
    // 尝试从 session 存储获取焦点图片
    chrome.storage.session.get("focusImage", (data) => {
      if (data.focusImage) {
        console.log("Focus image found.");
        const newTab = window.open();
        newTab.document.write(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Focus Image</title>
            <style>
              body { text-align: center; padding: 20px; }
              img { max-width: 100%; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h3>Your Focus Visualization</h3>
            <img src="data:image/png;base64,${data.focusImage}" alt="Focus Result" />
          </body>
          </html>
        `);

        // 找到图片后停止轮询
        clearInterval(checkInterval);
      } else {
        console.log("Focus image not found, retrying...");
      }
    });
  }, 500); // 每500毫秒检查一次

  // 设定一个最大检查次数，避免无限循环（可选）
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log("Stopped checking for focus image after timeout.");
  }, 30000);
  
})
// 点击“Send”按钮弹出通知
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById("user-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
function addMessage(sender, content) {
  const chatHistory = document.getElementById("chat-history");
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${sender}-message`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;
  wrapper.appendChild(bubble);
  chatHistory.appendChild(wrapper);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}
async function sendMessage() {
  if (thinking) return
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  const pagecontent = await chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => tabs[0].id).then(tabId => {
    console.log(tabId)
    return new Promise((resolve) => {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return document.body.innerText
        }
      }).then((result) => resolve(result[0].result))
    })
  })
  if (message) {
    addMessage("user", message);
    input.value = "";
    // 模拟回复
    // setTimeout(() => {
    //   addMessage("FocusFlow: I'm here to help you stay focused!");
    // }, 1000);
    msgElement = addMessage("ai", "Thinking...")
    thinking = true
    chrome.runtime.sendMessage({
      action: "ws_send",
      value: (new Message("input", { webpage: pagecontent, message, fromPopup: true })).encode()
    })
  }
}

function addMessage(sender, content) {
  const chatHistory = document.getElementById("chat-history");
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${sender}-message`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;
  wrapper.appendChild(bubble);
  chatHistory.appendChild(wrapper);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return bubble;
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "response") {
    const response = request.value;
    if (response) {
      if (thinking) {
        msgElement.textContent = response;
        thinking = false
      } else {
        addMessage("ai", response);
      }
    }
  }
});
window.onload = () => {
  chrome.storage.session.get('initialized', data => {
    if (data.initialized) {
      welcome.style.display = 'none';
      sequence.style.display = 'none';
      mainScreen.style.display = 'block';
    } else {
      welcome.style.display = 'flex';
      sequence.style.display = 'none';
      mainScreen.style.display = 'none';
    }
  })

  document.getElementById('notification-screen').style.display = 'none';
};

