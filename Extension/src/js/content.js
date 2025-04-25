console.log("Content script loaded.");

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

setInterval(
  () => {
    chrome.runtime.sendMessage({ action: "focus", value: {} }, res => res.focus_state || showNotification())
  }, 1000)

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

      async function sendMessage() {
        const input = document.getElementById("ff-user-input");
        const message = input.value.trim();
        const pageId = crypto.randomUUID();
        const pagecontent = document.body.innerText;
        if (message) {
          addMessage("user", message);
          input.value = "";
          // 模拟回复
          // setTimeout(() => {
          //   addMessage("FocusFlow: I'm here to help you stay focused!");
          // }, 1000);
          time = new Date().getTime()
          await chrome.runtime.sendMessage({ action: "ws_send", value: (new Message("input", { uid: pageId, webpage:pagecontent, message })).encode() })
          while (true) {
            console.log("waiting for response")
            let response=[]
            await chrome.storage.session.get("response").then(data => {
              if (data["response"] == undefined) return
              response = data.response
            }).catch(err => console.log(err))
            if (response[time]) {
              addMessage("ai", response[time])
              break
            }
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }
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
    })
}

document.addEventListener("scroll", () => {
  let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  let scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
  let clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
  let scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
  chrome.runtime.sendMessage({ action: 'ws_send', value: (new Message("scroll", { "distance": scrollTop.toFixed(2), "percent": scrollPercent.toFixed(2), "time": new Date().getTime() })).encode() });
})