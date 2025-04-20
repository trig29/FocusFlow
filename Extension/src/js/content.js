console.log("Content script loaded.");

// 空格键计数器
// let spacePressCount = 0;

// 1. 接收 background.js 的消息
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log(request)
//   if (request.action === "ws_message") {
//     request.value = JSON.parse(request.value)
//     if (request.value.type === "show_notification") {
//       showNotification();
//     }
//   }
// });

setInterval(
  () => {
    chrome.runtime.sendMessage({ action: "focus", value: {} }, res => res.focus_state || showNotification())
  }, 1000)
// 2. 监听键盘事件
// document.addEventListener('keydown', function (event) {
//   if (event.code === 'Space') {
//     event.preventDefault(); // 防止空格键滚动页面
//     spacePressCount++;

//     // 如果按了3次空格
//     if (spacePressCount >= 3) {
//       showNotification();
//       spacePressCount = 0; // 重置计数器
//     }

//     // 1秒后重置计数器（防止慢慢按空格也触发）
//     setTimeout(() => {
//       spacePressCount = 0;
//     }, 1000);
//   }
// });

// 不专心的弹窗
function showNotification() {

  // 有了就不要反复弹
  if (document.querySelector("#ff-notification-screen, #ff-main-screen")) return;

  // 创建容器
  const notification = document.createElement("div");
  notification.className = "ff-notification";
  notification.id = "ff-notification-screen";

  // 加载通知的HTML
  fetch(chrome.runtime.getURL("notification.html"))
      .then(res => res.text())
      .then(html => {
        notification.innerHTML = html;
        document.body.appendChild(notification);
        console.log(html);
        // 事件监听器
        document.querySelector(".ff-help-btn").addEventListener("click", () => {
          let chatScreen = document.getElementById("main-screen") || document.getElementById("ff-main-screen");
          if (!chatScreen) {
            createChatScreen();
            chatScreen = document.getElementById("ff-main-screen");
          }
          if (chatScreen) {
            chatScreen.style.display = "block";
            chatScreen.style.position = "fixed";
            chatScreen.style.bottom = "20px";
            chatScreen.style.right = "20px";
            chatScreen.style.zIndex = "10000";
          }
          notification.style.display = "none";
        });
        document.querySelector(".ff-ignore-btn").addEventListener("click", () => {
          notification.style.display = "none";
        });
        });
}


// 创建聊天框的函数
function createChatScreen() {
  const chatScreen = document.createElement("div");
  chatScreen.className = "screen main";
  chatScreen.id = "ff-main-screen";
  chatScreen.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    display: none;
  `;
  chatScreen.innerHTML = `
    <button class="close-btn" id="ff-close-btn">X</button>
    <div class="focus-state">Focus State: Active</div>
    <div class="chat-history" id="ff-chat-history">
      <!-- Messages appear here -->
    </div>
    <div class="input-section">
      <input type="text" class="input-box" id="ff-user-input" placeholder="Type something...">
      <button class="send-btn" id="ff-send-btn">Send</button>
    </div>
  `;

  // 添加聊天框样式
  const chatStyle = document.createElement("style");
  chatStyle.textContent = `
    .screen.main {
      padding: 20px;
      border-radius: 20px;
      background: #fff;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      width: 300px;
    }
    .focus-state {
      text-align: center;
      margin-bottom: 10px;
      font-weight: bold;
      font-size: 16px;
    }
    .chat-history {
      height: 200px;
      background-color: #eee;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 10px;
      overflow-y: auto;
    }
    .input-section {
      display: flex;
    }
    .input-box {
      flex: 1;
      padding: 5px;
      border: 1px solid #aaa;
      border-radius: 5px;
    }
    .send-btn {
      margin-left: 5px;
      padding: 5px 10px;
      border: none;
      border-radius: 5px;
      background-color: #0b01c6;
      color: white;
      cursor: pointer;
    }
  `;

  document.head.appendChild(chatStyle);
  document.body.appendChild(chatScreen);

  // 添加聊天功能
  document.getElementById("ff-send-btn").addEventListener("click", sendMessage);
  document.getElementById("ff-close-btn").addEventListener("click", () => document.getElementById("ff-main-screen").style.display = "none");
  document.getElementById("ff-user-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  function sendMessage() {
    const input = document.getElementById("ff-user-input");
    const message = input.value.trim();
    if (message) {
      addMessage("You: " + message);
      input.value = "";
      // 模拟回复
      setTimeout(() => {
        addMessage("FocusFlow: I'm here to help you stay focused!");
      }, 1000);
    }
  }

  function addMessage(text) {
    const chatHistory = document.getElementById("ff-chat-history");
    const messageElement = document.createElement("div");
    messageElement.textContent = text;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}