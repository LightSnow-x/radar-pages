(() => {
    'use strict';

    const gameNames = {
        uam: '暗区突围', dfm: '三角洲行动', codm: '使命召唤', cfm: '穿越火线',
        lolm: '英雄联盟手游', valorant: '无畏契约',
    };
    const timeFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const updated = document.getElementById('updated');
    const refresh = document.getElementById('refresh');
    const game = document.getElementById('game');
    const search = document.getElementById('search');
    const chatRows = document.getElementById('chat-rows');
    const radarRows = document.getElementById('radar-rows');
    const chatCount = document.getElementById('chat-count');
    const radarCount = document.getElementById('radar-count');
    const radarStatus = document.getElementById('radar-status');
    const operatorPanel = document.getElementById('operator-chat');
    const operatorTitle = document.getElementById('operator-room');
    const operatorProfile = document.getElementById('operator-profile');
    const operatorStatus = document.getElementById('operator-status');
    const operatorMessages = document.getElementById('operator-messages');
    const operatorInput = document.getElementById('operator-text');
    const operatorSend = document.getElementById('operator-send');
    const webMode = document.body.dataset.webAdmin === '1';
    const hostedApi = document.body.dataset.adminApiOrigin;
    const webLogin = document.getElementById('web-admin-login');
    const webPassword = document.getElementById('web-login-password');
    const webLoginStatus = document.getElementById('web-login-status');
    const webLoginSubmit = document.getElementById('web-login-submit');
    const webLogout = document.getElementById('web-admin-logout');
    let data;
    let loading = false;
    let activeChat;
    let webSession;

    function showLogin(message = '', focus = true) {
        webSession = undefined;
        delete document.body.dataset.webSession;
        webLogin.hidden = false;
        webLoginStatus.textContent = message;
        webPassword.value = '';
        data = undefined;
        activeChat = undefined;
        operatorPanel.hidden = true;
        operatorMessages.replaceChildren();
        operatorInput.value = '';
        operatorTitle.textContent = '';
        operatorProfile.textContent = '';
        fill(chatRows, [], 8, '正在读取聊天室');
        fill(radarRows, [], 5, '正在读取雷达房间');
        radarStatus.hidden = true;
        chatCount.textContent = '';
        radarCount.textContent = '';
        updated.textContent = '正在连接';
        if (focus) webPassword.focus();
    }

    function adminFetch(route, options = {}) {
        const requestUrl = new URL((webMode ? '/admin' : '') + route, hostedApi || location.origin);
        const headers = new Headers(options.headers);
        const token = webSession;
        if (webMode) {
            headers.set('X-Worker-Admin-Web', '1');
            if (token) headers.set('Authorization', 'Bearer ' + token);
        }
        const transport = hostedApi ? { credentials: 'omit', redirect: 'error' } : {};
        return fetch(requestUrl, { cache: 'no-store', ...options, ...transport, headers }).then(response => {
            if (webMode && token && token === webSession && response.status === 401) showLogin('会话已结束，请重新输入密码。');
            return response;
        });
    }

    function cell(value, className = '') {
        const element = document.createElement('td');
        element.textContent = value;
        if (className) element.className = className;
        return element;
    }

    function state(value, waiting) {
        const element = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = waiting ? 'state waiting' : 'state available';
        badge.textContent = value;
        element.append(badge);
        return element;
    }

    function row(...cells) {
        const element = document.createElement('tr');
        element.append(...cells);
        return element;
    }

    function fill(tbody, rows, width, emptyText) {
        const output = document.createDocumentFragment();
        if (rows.length) {
            for (const value of rows) output.append(value);
        } else {
            const placeholder = cell(emptyText, 'empty');
            placeholder.colSpan = width;
            output.append(row(placeholder));
        }
        tbody.replaceChildren(output);
    }

    function enterAction(room) {
        const action = document.createElement('td');
        if (room.waiting) return action;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'room-action';
        button.textContent = '进入';
        button.setAttribute('aria-label', `进入${gameNames[room.game]} ${room.code} 聊天室`);
        button.addEventListener('click', () => {
            activeChat = { path: `/api/chat/${room.game}/${room.region}/${room.code}`, cursor: 0, epoch: '' };
            operatorTitle.textContent = `${gameNames[room.game]} · ${room.region === 'cn' ? '国服' : '国际服'} · ${room.code}`;
            operatorProfile.textContent = '';
            operatorStatus.textContent = '正在加入聊天室…';
            operatorInput.value = '';
            operatorMessages.replaceChildren();
            operatorPanel.hidden = false;
            operatorTitle.focus();
            void syncOperator(activeChat);
        });
        action.append(button);
        return action;
    }

    function appendMessage(message) {
        const line = document.createElement('li');
        line.className = message.own ? 'operator-message own' : 'operator-message';
        const author = document.createElement('span');
        author.textContent = message.sender + (message.admin ? ' · 管理员' : '') + (message.own ? ' · 我' : '');
        const body = document.createElement('p');
        body.textContent = message.text;
        line.append(author, body);
        operatorMessages.append(line);
        if (operatorMessages.childElementCount > 120) operatorMessages.firstElementChild.remove();
    }

    async function syncOperator(current, text) {
        if (current.busy || current.ended) return;
        current.busy = true;
        operatorSend.disabled = true;
        const url = new URL(current.path, location.origin);
        if (current.epoch) url.searchParams.set('epoch', current.epoch);
        url.searchParams.set('after', current.cursor);
        const sending = text !== undefined;
        const original = operatorInput.value;
        try {
            const headers = { 'X-Worker-Room-Chat': '1' };
            if (sending) headers['Content-Type'] = 'application/json';
            const response = await adminFetch(url.pathname + url.search, { method: sending ? 'POST' : 'GET', headers,
                body: sending ? JSON.stringify({ text }) : undefined });
            if (activeChat !== current) return;
            if (!response.ok) {
                if (response.status === 404) current.ended = true;
                operatorStatus.textContent = current.ended ? '本局聊天室已关闭。' :
                    response.status === 429 ? '发送太快，草稿已保留。' :
                        response.status === 400 ? '消息无法发送，请检查内容。' :
                            sending ? '发送结果未确认，草稿已保留。' : '连接中断，正在重试。';
                return;
            }
            const room = await response.json();
            if (activeChat !== current) return;
            current.epoch = room.epoch;
            operatorProfile.textContent = `${room.name} · 管理员编号 ${room.number}`;
            const nearBottom = operatorMessages.scrollHeight - operatorMessages.scrollTop - operatorMessages.clientHeight < 60;
            for (const message of room.messages) {
                if (message.id > current.cursor) appendMessage(message);
            }
            current.cursor = room.cursor;
            if (nearBottom || sending) operatorMessages.scrollTop = operatorMessages.scrollHeight;
            if (sending && operatorInput.value === original) operatorInput.value = '';
            operatorStatus.textContent = room.count ? `${room.count} 位同局同行` : '等待同局同行重连';
        } catch {
            if (activeChat === current) operatorStatus.textContent = sending ? '发送结果未确认，草稿已保留。' : '连接中断，正在重试。';
        } finally {
            current.busy = false;
            if (activeChat === current) operatorSend.disabled = !current.epoch || current.ended;
        }
    }

    function render() {
        if (!data) return;
        const term = search.value.trim().toLowerCase();
        const gameFilter = game.value;
        const accepts = (kind, ...parts) => (!gameFilter || kind === gameFilter) &&
            [gameNames[kind], kind, ...parts].some(value => value?.toLowerCase().includes(term));

        const chats = data.chat?.filter(item => accepts(item.game, item.code, item.region === 'cn' ? '国服' : '国际服')) || [];
        chats.sort((left, right) => (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0) || left.code.localeCompare(right.code));
        fill(chatRows, chats.map(item => row(cell(gameNames[item.game]), cell(item.region === 'cn' ? '国服' : '国际服'),
            cell(item.code, 'code'), state(item.waiting ? '等待重连' : '可加入', item.waiting),
            cell(item.count, 'number'), cell(item.browserRecent ? '近期有连接' : '暂无近期连接', 'muted'),
            cell(item.lastMessageAt === null ? '暂无发言' : timeFormat.format(item.lastMessageAt), 'time'), enterAction(item))),
        8, data.chat === null ? '聊天室数据源暂不可用' : '没有符合条件的聊天室');
        chatCount.textContent = data.chat === null ? '数据不可用' : `${chats.length} 间`;

        const services = data.radar.filter(service => !gameFilter || service.game === gameFilter);
        const missing = services.filter(service => service.rooms === null).map(service => gameNames[service.game]);
        radarStatus.hidden = missing.length === 0;
        radarStatus.textContent = missing.length ? `${missing.join('、')} 数据源暂不可用` : '';
        const radar = services.flatMap(service => (service.rooms || []).filter(item =>
            accepts(service.game, item.code, item.ownerName, item.ownerRef)).map(item => ({ ...item, game: service.game })));
        radar.sort((left, right) => right.seen - left.seen || left.code.localeCompare(right.code));
        fill(radarRows, radar.map(item => row(cell(gameNames[item.game]), cell(item.code, 'code'),
            cell(item.ownerName ?? '未上报', item.ownerName ? '' : 'muted'), cell(item.ownerRef, 'identity'),
            cell(timeFormat.format(item.seen), 'time'))),
        5, missing.length === services.length ? '雷达房间暂无法查询' : '没有符合条件的雷达房间');
        radarCount.textContent = missing.length === services.length ? '数据不可用' :
            `${radar.length} 间${missing.length ? ' · 部分数据' : ''}`;
    }

    function loadFailed() {
        updated.textContent = data ? '刷新失败，显示上次查询结果' : '房间查询暂不可用';
        if (!data) {
            fill(chatRows, [], 8, '聊天室数据源暂不可用');
            fill(radarRows, [], 5, '雷达房间暂无法查询');
        }
    }

    async function load() {
        if (loading || (webMode && !webSession)) return;
        const token = webSession;
        loading = true;
        refresh.disabled = true;
        try {
            const response = await adminFetch('/api/rooms');
            if (webMode && token !== webSession) return;
            if (!response.ok) {
                loadFailed();
                return;
            }
            const snapshot = await response.json();
            if (webMode && token !== webSession) return;
            data = snapshot;
            render();
            updated.textContent = `更新于 ${timeFormat.format(data.updatedAt)}`;
        } catch {
            if (!webMode || token === webSession) loadFailed();
        } finally {
            loading = false;
            refresh.disabled = false;
        }
    }

    refresh.addEventListener('click', load);
    game.addEventListener('change', render);
    search.addEventListener('input', render);
    document.getElementById('operator-leave').addEventListener('click', () => {
        activeChat = undefined;
        operatorPanel.hidden = true;
        game.focus();
    });
    document.getElementById('operator-form').addEventListener('submit', event => {
        event.preventDefault();
        const text = operatorInput.value.trim();
        if (activeChat?.epoch && text) void syncOperator(activeChat, text);
    });
    if (webMode) {
        if (hostedApi && location.protocol !== 'https:') {
            showLogin('请使用 GitHub Pages 的 HTTPS 地址打开管理页。', false);
            webPassword.disabled = true;
            webLoginSubmit.disabled = true;
            return;
        }
        webLogout.hidden = false;
        showLogin();
        if (hostedApi) {
            webPassword.disabled = true;
            webLoginSubmit.disabled = true;
            webLoginStatus.textContent = '正在核对后台连接…';
            void adminFetch('/api/rooms').then(response => {
                if (response.status !== 401) {
                    webLoginStatus.textContent = '管理后台还未连通。';
                    return;
                }
                webPassword.disabled = false;
                webLoginSubmit.disabled = false;
                webLoginStatus.textContent = '';
                webPassword.focus();
            }).catch(() => { webLoginStatus.textContent = '管理后台的 HTTPS 入口还未连通。'; });
        }
        document.getElementById('web-login-form').addEventListener('submit', async event => {
            event.preventDefault();
            if (webLoginSubmit.disabled) return;
            const body = JSON.stringify({ password: webPassword.value });
            webPassword.value = '';
            webLoginSubmit.disabled = true;
            webLoginStatus.textContent = '正在验证…';
            try {
                const response = await adminFetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
                if (!response.ok) {
                    webLoginStatus.textContent = response.status === 401 ? '密码不正确。' :
                        response.status === 429 ? '尝试次数过多，请稍后再试。' : '登录暂不可用，请重试。';
                    return;
                }
                const login = await response.json();
                if (typeof login.token !== 'string' || !/^[a-f0-9]{64}$/.test(login.token)) {
                    webLoginStatus.textContent = '登录暂不可用，请重试。';
                    return;
                }
                webSession = login.token;
                webLogin.hidden = true;
                document.body.dataset.webSession = '1';
                await load();
            } catch {
                webLoginStatus.textContent = '登录暂不可用，请重试。';
            } finally {
                webLoginSubmit.disabled = false;
                if (!webSession) webPassword.focus();
            }
        });
        const endSession = focus => {
            if (webSession) void adminFetch('/logout', { method: 'POST', keepalive: true }).catch(() => {});
            showLogin('', focus);
        };
        webLogout.addEventListener('click', () => endSession(true));
        window.addEventListener('pagehide', () => endSession(false));
    } else void load();
    setInterval(() => { if (!document.hidden) void load(); }, 10000);
    setInterval(() => { if (activeChat && !document.hidden) void syncOperator(activeChat); }, 2000);
})();
