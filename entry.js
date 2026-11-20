(() => {
  'use strict';
  const form = document.querySelector('form[data-radar-entry], form[action="./view.html"]');
  const input = form?.elements.namedItem('room');
  const status = form?.querySelector('[data-room-status]') || document.getElementById('room-status');
  if (!input || !status) return;
  const button = form.querySelector('button[type="submit"]');
  const defaultStatus = status.textContent;
  const validRoom = /^\d{4}$/;
  const query = new URLSearchParams(location.search);
  const initialRoom = query.get('room') || '';

  function updateStatus(ended = false) {
    const length = input.value.length;
    const complete = validRoom.test(input.value);
    if (form.hasAttribute('data-complete-room')) button.disabled = !complete;
    status.classList.toggle('error', ended);
    if (ended) {
      status.textContent = '房间已关闭。请在共享设备上重新开启，或输入其他房间号。';
    } else if (form.hasAttribute('data-room-hints') && length > 0) {
      status.textContent = complete ? '房间号已填好，可连接雷达' : `还需输入 ${4 - length} 位数字`;
    } else {
      status.textContent = defaultStatus;
    }
  }

  if (validRoom.test(initialRoom)) input.value = initialRoom;
  updateStatus(query.has('ended') || query.has('expired'));
  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 4);
    updateStatus();
  });
})();
