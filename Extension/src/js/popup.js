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

function getStatus() {
    let status_display = document.getElementById('status')
    chrome.runtime.sendMessage({ action: 'ws_status' }, response => {
        if (response.wsStatus) {
            status_display.innerHTML = "Connected"
            status_display.style.color = "green"
        } else {
            status_display.innerHTML = "Connecting..."
            status_display.style.color = "orange"
        }
        chrome.runtime.sendMessage({ action: 'ws_send', value: (new Message("focus", {})).encode() })
    })
}

document.addEventListener('DOMContentLoaded', () => {
    let focus_display = document.getElementById('focus')
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "ws_message") {
            request.value = JSON.parse(request.value)
            if (request.value.type === "focus") {
                if (request.value.value) {
                    focus_display.innerHTML = "Focused"
                    focus_display.style.color = "green"
                } else {
                    focus_display.innerHTML = "Not Focused"
                    focus_display.style.color = "red"
                }
            }
        }
    })

    document.getElementById('submitButton').addEventListener('click', () => {
        const msg = new Message("corner", document.getElementById('corner-select').value)
        chrome.runtime.sendMessage({ action: 'ws_send', value: msg.encode() }, function (response) {
            if (response.wsStatus) {
                console.log('Message sent successfully:', response)
            } else {
                console.error('Failed to send message:', response)
            }
        })
    })
    getStatus()
    setInterval(getStatus, 1000)
}
)