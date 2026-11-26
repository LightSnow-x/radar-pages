(() => {
  'use strict';

  const form = document.getElementById('join-form');
  const room = form.elements.namedItem('room');
  const status = document.getElementById('room-status');
  const submit = document.getElementById('enter-room');
  const params = new URLSearchParams(location.search);
  const prefill = params.get('room');
  const valid = value => /^[0-9]{4}$/.test(value);

  if (valid(prefill)) room.value = prefill;

  function update(message = '') {
    submit.disabled = !valid(room.value);
    status.textContent = message;
  }

  update(params.has('ended') ? '�����ѹرա������¿�����������������������š�' : '');

  room.addEventListener('input', () => {
    room.value = room.value.replace(/[^0-9]/g, '').slice(0, 4);
    update();
  });
  addEventListener('pageshow', event => {
    if (event.persisted) update();
  });
})();
