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


// 创建聊天框
function createChatScreen() {
  const container = document.createElement("div");
  const chatUrl = chrome.runtime.getURL("chat.html");
  fetch(chatUrl)
      .then(res => res.text())
      .then(html => {
        container.innerHTML = html;
        document.body.appendChild(container);
        document.getElementById("ff-send-btn").addEventListener("click", sendMessage);
        document.getElementById("ff-close-btn").addEventListener("click", () => {
          document.getElementById("ff-main-screen").style.display = "none";
        });
        document.getElementById("ff-user-input").addEventListener("keypress", (e) => {
          if (e.key === "Enter") sendMessage();
        });

        function sendMessage() {
          const input = document.getElementById("ff-user-input");
          const message = input.value.trim();
          if (message) {
            addMessage("user", message);
            input.value = "";
            setTimeout(() => {
              addMessage("ai", "FocusFlow: I'm here to help you stay focused!");
            }, 800);
          }
        }

        // 添加消息，加整个div
        function addMessage(sender, content) {
          const chatHistory = document.getElementById("ff-chat-history");
          const wrapper = document.createElement("div");
          wrapper.className = `chat-message ${sender}-message`;
          const bubble = document.createElement("div");
          bubble.className = "message-bubble";
          bubble.textContent = content;
          wrapper.appendChild(bubble);
          chatHistory.appendChild(wrapper);
          chatHistory.scrollTop = chatHistory.scrollHeight;
        }

      });
}
