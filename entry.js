(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const room = query.get('room') || '';
  if (/^\d{4}$/.test(room)) document.getElementById('room').value = room;
  if (query.has('ended') || query.has('expired')) {
    document.getElementById('room-status').textContent = '房间已关闭。请在共享设备上重新开启，或输入其他房间号。';
  }
})();
