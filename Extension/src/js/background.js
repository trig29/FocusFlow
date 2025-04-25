let webSocket = null;
let focus_state = true

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

function keepAlive() {
    const keepAliveIntervalId = setInterval(
        () => {
            if (webSocket) {
                // webSocket.send('keepalive');
                webSocket.send((new Message("focus", {})).encode())
            } else {
                clearInterval(keepAliveIntervalId);
            }
        },
        // Set the interval to 20 seconds to prevent the service worker from becoming inactive.
        1000
    );
}

function connect() {
    webSocket = new WebSocket('ws://localhost:8765');

    webSocket.onopen = (event) => {
        console.log('websocket open');
        keepAlive();
    };

    webSocket.onmessage = (event) => {
        let data = JSON.parse(event.data)
        if (data.type === "focus") {
            focus_state = data.value
        } else if (data.type === "response") {
            // chrome.storage.session.get("response", storage => {
            //     storage[data.value.time] = data.value.message
            //     chrome.storage.session.set({ "response": storage })

            // })
            if (data.value.fromPopup) {
                chrome.runtime.sendMessage({ action: "response", value: data.value.message }, (res) => {
                    if (res && res.status) {
                        console.log("response sent to popup")
                    } else {
                        console.error("response failed to send to popup")
                    }
                })
            } else {
                chrome.tabs.sendMessage(data.value.tabId, { action: "response", value: data.value.message }, (res) => {
                    if (res && res.status) {
                        console.log("response sent to content script")
                    } else {
                        console.error("response failed to send to content script")
                    }
                })
            }
        }
    };

    webSocket.onclose = (event) => {
        console.log('websocket connection closed');
        webSocket = null;
    };
}

function disconnect() {
    if (webSocket == null) {
        return;
    }
    webSocket.close();
}

connect();

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "ws_send") {
        if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
            sendResponse({ wsStatus: false })
        } else {
            request.value = JSON.parse(request.value)
            if (request.value.type === "input") {
                request.value.value.tabId = sender.tab ? sender.tab.id : await chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => tabs[0].id)
            }
            request.value = JSON.stringify(request.value)
            console.log("ws_send", request.value)
            webSocket.send(request.value)
            sendResponse({ wsStatus: true })
        }
    } else if (request.action === "ws_status") {
        if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
            connect()
            sendResponse({ wsStatus: false })
        } else {
            sendResponse({ wsStatus: true })

        }
    } else if (request.action === "focus") {
        console.log(focus_state)
        sendResponse({ focus_state })
    }
});

