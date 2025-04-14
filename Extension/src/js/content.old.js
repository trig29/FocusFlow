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

document.addEventListener("scroll", () => {
    let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    let scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    let clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    let scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
    chrome.runtime.sendMessage({ action: 'ws_send', value: (new Message("scroll", { "distance": scrollTop.toFixed(2), "percent": scrollPercent.toFixed(2), "time": new Date().getTime() })).encode() });
})