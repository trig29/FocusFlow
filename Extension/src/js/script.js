const welcome = document.getElementById('welcome');
const sequence = document.getElementById('sequence');
const mainScreen = document.getElementById('main-screen');
const focusImg = document.getElementById('focus-img');
const focusText = document.getElementById('focus-text');
const successText = document.getElementById('success-text');

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

// 点击“Send”按钮弹出通知
document.getElementById('send-btn').addEventListener('click', () => {
  document.getElementById('notification-screen').style.display = 'block';
});

window.onload = () => {
  chrome.storage.session.get('initialized', data => {
    console.log(JSON.stringify(data))
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

