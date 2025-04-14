let webSocket = null;

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
        console.log(`websocket received message: ${event.data}`);
        chrome.runtime.sendMessage({ action: 'ws_message', value: event.data })
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ws_send") {
        if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
            sendResponse({ wsStatus: false })
        } else {
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
    }
});

