'use strict';

window.Demo = (() => {
  const root = document.querySelector('#app');
  const dialog = document.querySelector('#dialog');
  const toast = document.querySelector('#toast');
  const { today, from, shift } = DemoDates;
  const state = {
    route: '',
    view: {},
    collapsed: DemoStorage.preference('sidebar') === '1',
    drawer: false,
    menu: '',
    theme: DemoStorage.preference('theme') || 'system',
    lang: DemoStorage.preference('lang') === 'en' ? 'en' : 'vi',
  };
  const views = {};
  const actions = {};
  const labels = {
    messages: 'nav.messages',
    feed: 'nav.feed',
    training: 'nav.training',
    offboarding: 'nav.offboarding',
    profile: 'nav.profile',
    'admin/security': 'nav.security',
    'admin/backups': 'nav.backups',
    system: 'nav.system',
  };
  const h = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char],
    );
  const raw = (key, lang = state.lang) =>
    key.split('.').reduce((value, part) => value?.[part], DemoStrings[lang]);
  const t = (key, params = {}) =>
    h(
      String(raw(key) ?? raw(key, 'vi') ?? key).replace(
        /\{(\w+)\}/g,
        (match, field) => params[field] ?? match,
      ),
    );
  const icon = (name, classes = '') =>
    '<span aria-hidden="true" class="icon ' + h(classes) + '">' + h(name) + '</span>';
  const rawLink = (route, body, cls = '', attrs = '') =>
    '<a href="#/' + h(route) + '" class="' + h(cls) + '" ' + attrs + '>' + body + '</a>';
  const link = (route, label, glyph = '', cls = 'btn') =>
    rawLink(route, (glyph ? icon(glyph) : '') + h(label), cls);
  const act = (action, label, glyph = '', cls = 'btn') =>
    '<button type="button" class="' +
    h(cls) +
    '" data-act="' +
    h(action) +
    '">' +
    (glyph ? icon(glyph) : '') +
    h(label) +
    '</button>';
  const iconBtn = (action, label, glyph, cls = '') =>
    '<button type="button" class="icon-btn ' +
    h(cls) +
    '" data-act="' +
    h(action) +
    '" title="' +
    h(label) +
    '" aria-label="' +
    h(label) +
    '">' +
    icon(glyph) +
    '</button>';
  const person = (data, id) => data.employees.find((row) => row.id === id);
  const byId = (data, key, id) => data[key].find((row) => row.id === id);
  const avatar = (name, size = '', color = '', rounded = false) => {
    const initials =
      String(name || '?')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(-2)
        .map((word) => word[0])
        .join('') || '?';
    return (
      '<span class="avatar ' +
      h(size) +
      (rounded ? ' avatar--rounded' : '') +
      '" title="' +
      h(name) +
      '"' +
      (/^#[\da-f]{6}$/i.test(color) ? ' style="--avatar-color:' + color + '"' : '') +
      '>' +
      h(initials) +
      '</span>'
    );
  };
  const clean = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replaceAll('đ', 'd')
      .toLowerCase()
      .trim();
  const matches = (query, ...values) => values.some((value) => clean(value).includes(clean(query)));
  const fmtDate = (value, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
    value
      ? new Intl.DateTimeFormat(state.lang === 'vi' ? 'vi-VN' : 'en-GB', options).format(
          from(value),
        )
      : '—';
  const money = (value) =>
    new Intl.NumberFormat(state.lang === 'vi' ? 'vi-VN' : 'en-GB', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  const hours = (value) =>
    new Intl.NumberFormat(state.lang === 'vi' ? 'vi-VN' : 'en-GB', {
      maximumFractionDigits: 2,
    }).format(value / 60) + 'h';
  const chip = (label, tone = '') =>
    '<span class="tag tag--' + h(tone) + '">' + h(label) + '</span>';
  const bar = (percent, color = '') =>
    '<span class="progress-track"><span style="width:' +
    Math.max(0, Math.min(100, Number(percent) || 0)) +
    '%' +
    (/^#[\da-f]{6}$/i.test(color) ? ';background:' + color : '') +
    '"></span></span>';
  const placeholder = (text, glyph = 'inbox') =>
    '<div class="blank">' + icon(glyph) + '<p>' + h(text) + '</p></div>';
  const header = (title, subtitle = '', controls = '') =>
    '<header class="page-header"><div><h1>' +
    h(title) +
    '</h1>' +
    (subtitle ? '<p>' + h(subtitle) + '</p>' : '') +
    '</div>' +
    (controls ? '<div class="row-actions">' + controls + '</div>' : '') +
    '</header>';
  const panel = (body, cls = '') =>
    '<section class="surface ' + h(cls) + '">' + body + '</section>';
  const table = (head, rows, empty = 'Không có dữ liệu phù hợp.') =>
    rows.length
      ? '<div class="table-scroll"><table><thead><tr>' +
        head.map((x) => '<th scope="col">' + h(x) + '</th>').join('') +
        '</tr></thead><tbody>' +
        rows
          .map((row) => '<tr>' + row.map((cell) => '<td>' + cell + '</td>').join('') + '</tr>')
          .join('') +
        '</tbody></table></div>'
      : placeholder(empty);
  const option = (value, label, selected) =>
    '<option value="' +
    h(value) +
    '"' +
    (String(selected ?? '') === String(value) ? ' selected' : '') +
    '>' +
    h(label) +
    '</option>';
  const tabs = (name, options, current) =>
    '<div class="tabs" role="tablist" data-tabs="' +
    h(name) +
    '">' +
    options
      .map(
        ([value, label, glyph, count]) =>
          '<button type="button" role="tab" aria-selected="' +
          (current === value) +
          '" data-act="view|' +
          h(name) +
          '|' +
          h(value) +
          '" class="tab' +
          (current === value ? ' tab--active' : '') +
          '">' +
          (glyph ? icon(glyph) : '') +
          h(label) +
          (count ? '<span class="tab__count">' + h(count) + '</span>' : '') +
          '</button>',
      )
      .join('') +
    '</div>';
  const searchField = (name, placeholderValue) =>
    '<label class="filter-search">' +
    icon('search') +
    '<input type="search" data-view="' +
    h(name) +
    '" value="' +
    h(state.view[name]) +
    '" placeholder="' +
    h(placeholderValue) +
    '" aria-label="' +
    h(placeholderValue) +
    '"></label>';
  const filter = (name, label, options) =>
    '<label class="filter-control"><span class="sr-only">' +
    h(label) +
    '</span><select data-view="' +
    h(name) +
    '">' +
    options.map(([value, text]) => option(value, text, state.view[name])).join('') +
    '</select></label>';
  const stat = (name, value, glyph, tone, action = '', active = false) => {
    const tag = action ? 'button' : 'div';
    return (
      '<' +
      tag +
      ' class="stat' +
      (action ? ' stat--button' : '') +
      (active ? ' stat--active' : '') +
      '"' +
      (action ? ' type="button" data-act="' + h(action) + '" aria-pressed="' + active + '"' : '') +
      '><span class="stat__icon stat__icon--' +
      h(tone) +
      '">' +
      icon(glyph) +
      '</span><span class="stat__body"><strong>' +
      h(value) +
      '</strong><small>' +
      h(name) +
      '</small></span></' +
      tag +
      '>'
    );
  };
  const stats = (list) =>
    '<section class="stats metric-grid" aria-label="Tổng quan">' + list.join('') + '</section>';
  const field = (label, name, value = '', settings = {}) => {
    const {
      type = 'text',
      options,
      required,
      min,
      max,
      step,
      placeholder: hint,
      disabled,
    } = settings;
    const attrs =
      ' name="' +
      h(name) +
      '"' +
      (required ? ' required' : '') +
      (disabled ? ' disabled' : '') +
      (min !== undefined ? ' min="' + h(min) + '"' : '') +
      (max !== undefined ? ' max="' + h(max) + '"' : '') +
      (step ? ' step="' + h(step) + '"' : '') +
      (hint ? ' placeholder="' + h(hint) + '"' : '');
    let control;
    if (options)
      control =
        '<select' +
        attrs +
        '>' +
        options.map(([key, text]) => option(key, text, value)).join('') +
        '</select>';
    else if (type === 'textarea')
      control = '<textarea' + attrs + ' rows="3">' + h(value) + '</textarea>';
    else if (type === 'checkbox')
      return (
        '<label class="form-check"><input type="checkbox"' +
        attrs +
        (value ? ' checked' : '') +
        '>' +
        h(label) +
        '</label>'
      );
    else
      control =
        '<input type="' +
        h(type) +
        '"' +
        attrs +
        (type === 'file' ? '' : ' value="' + h(value) + '"') +
        '>';
    return (
      '<label class="field"><span>' +
      h(label) +
      (required ? ' <span aria-hidden="true">*</span>' : '') +
      '</span>' +
      control +
      '</label>'
    );
  };
  const crumbs = (items) =>
    '<nav class="crumbs" aria-label="Đường dẫn">' +
    items
      .map(([route, label]) =>
        route === null ? '<span>' + h(label) + '</span>' : link(route, label, '', ''),
      )
      .join(icon('chevron_right')) +
    '</nav>';
  const paginate = (name, rows, count = 5) => {
    const pages = Math.max(1, Math.ceil(rows.length / count));
    const current = Math.min(Number(state.view[name]) || 1, pages);
    return {
      rows: rows.slice((current - 1) * count, current * count),
      foot:
        rows.length > count
          ? '<div class="pagination"><span>' +
            ((current - 1) * count + 1) +
            '–' +
            Math.min(current * count, rows.length) +
            ' / ' +
            rows.length +
            '</span><button type="button" class="icon-btn" aria-label="Trang trước" data-act="view|' +
            h(name) +
            '|' +
            (current - 1) +
            '"' +
            (current <= 1 ? ' disabled' : '') +
            '>' +
            icon('chevron_left') +
            '</button><button type="button" class="icon-btn" aria-label="Trang sau" data-act="view|' +
            h(name) +
            '|' +
            (current + 1) +
            '"' +
            (current >= pages ? ' disabled' : '') +
            '>' +
            icon('chevron_right') +
            '</button></div>'
          : '',
    };
  };
  const showToast = (message, error = false) => {
    toast.textContent = message;
    toast.className = error ? 'toast toast--error' : 'toast';
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.className = '';
      toast.textContent = '';
    }, 3300);
  };
  let onSubmit;
  function close() {
    if (dialog.open) dialog.close();
  }
  function show(title, body, options = {}) {
    const {
      glyph = '',
      submit,
      submitLabel = raw('common.save') || 'Lưu',
      drawer = false,
      wide = false,
      closeLabel = 'Đóng',
    } = options;
    onSubmit = submit;
    dialog.className = drawer ? 'drawer-dialog' : wide ? 'wide-dialog' : '';
    dialog.setAttribute('aria-labelledby', 'dialog-title');
    dialog.innerHTML =
      '<div class="dialog-head"><h2 id="dialog-title">' +
      (glyph ? '<span class="dialog-mark">' + icon(glyph) + '</span>' : '') +
      h(title) +
      '</h2>' +
      iconBtn('close', closeLabel, 'close') +
      '</div>' +
      (submit
        ? '<form class="dialog-form"><div class="dialog-body">' +
          body +
          '<p class="form-error" role="alert" hidden></p></div><footer class="dialog-footer">' +
          act('close', raw('common.cancel') || 'Hủy', '', 'btn') +
          '<button type="submit" class="btn primary">' +
          h(submitLabel) +
          '</button></footer></form>'
        : '<div class="dialog-body">' + body + '</div>');
    if (!dialog.open) dialog.showModal();
  }
  const confirm = (title, text, callback, label = 'Xác nhận') =>
    show(title, '<p>' + h(text) + '</p>', {
      submit: callback,
      submitLabel: label,
      glyph: 'warning',
    });
  function refresh(message) {
    render();
    if (message) showToast(message);
  }
  function run(action, args, button) {
    try {
      if (actions[action]) actions[action](...args, button);
    } catch (error) {
      showToast(error.message, true);
    }
  }
  function go(route, target) {
    if (state.route === route) {
      if (target) run(...splitTarget(target));
      return;
    }
    state.nextTarget = target;
    location.hash = '#/' + route;
  }
  const splitTarget = (target) => {
    const [action, ...args] = target.split(':');
    return [action, args];
  };
  const groups = [
    [
      'personal',
      [
        ['overview', 'space_dashboard', ''],
        ['myWork', 'checklist', 'my-work'],
        ['weekly', 'calendar_view_week', 'weekly'],
        ['leaves', 'beach_access', 'leaves'],
        ['performance', 'insights', 'performance'],
        ['training', 'school', 'training'],
        ['myAssets', 'devices', 'my-assets'],
        ['notifications', 'notifications', 'notifications'],
      ],
    ],
    [
      'collaborate',
      [
        ['workspaces', 'group', 'workspaces'],
        ['calendar', 'edit_calendar', 'calendar'],
        ['messages', 'chat_bubble_outline', 'messages'],
        ['feed', 'dynamic_feed', 'feed'],
        ['requests', 'move_to_inbox', 'requests'],
      ],
    ],
    [
      'manage',
      [
        ['departments', 'account_tree', 'departments'],
        ['timeline', 'view_timeline', 'timeline'],
        ['worklogs', 'schedule', 'worklogs'],
        ['approvals', 'assignment_turned_in', 'approvals'],
        ['workload', 'bar_chart', 'workload'],
        ['assets', 'inventory_2', 'assets'],
        ['offboarding', 'person_remove', 'offboarding'],
      ],
    ],
    [
      'admin',
      [
        ['admin', 'admin_panel_settings', 'admin/users'],
        ['budgets', 'account_balance_wallet', 'budgets'],
        ['costRates', 'price_change', 'admin/cost-rates'],
        ['security', 'shield', 'admin/security'],
        ['backups', 'backup', 'admin/backups'],
      ],
    ],
  ];
  const brand =
    '<span class="brand"><span class="mark"><svg viewBox="0 0 64 64" aria-hidden="true"><path class="wave" d="M14 22 Q23 13 32 22 T50 22" pathLength="1"/><path class="stem" d="M32 22 V49" pathLength="1"/></svg></span><span class="name">TeamFlow</span></span>';
  const themeIcons = { light: 'light_mode', dark: 'dark_mode', system: 'brightness_auto' };
  function shell(data) {
    const user = person(data, data.currentUserId);
    const access = Demo.access?.(data) || {
      admin: true,
      assets: true,
      review: true,
      offboarding: true,
    };
    const ownOffboarding =
      !access.offboarding &&
      data.offboarding.some(
        (row) =>
          row.employeeId === user.id && !['Hoàn tất', 'Đã hủy', 'Bị từ chối'].includes(row.status),
      );
    const badges = {
      notifications: data.notifications.filter(
        (row) => !row.read && (!row.userId || row.userId === user.id),
      ).length,
      performance: data.reviews.filter(
        (row) => row.employeeId === user.id && row.status === 'SelfPending',
      ).length,
      'my-assets': data.assets.filter((row) => row.holderId === user.id && !row.confirmed).length,
      requests: data.requests.filter(
        (row) => row.status === 'Pending' && row.requesterId !== user.id,
      ).length,
      approvals: [...data.leave, ...data.worklogs].filter(
        (row) => row.status === 'Pending' && MockApi.canReview(data, row.userId),
      ).length,
    };
    const nav = groups
      .map(([key, items], index) => {
        if (key === 'admin' && !access.admin) return '';
        const visible = items.filter(
          ([, , route]) =>
            !(
              (route === 'approvals' && !access.review) ||
              (route === 'assets' && !access.assets) ||
              (route === 'offboarding' && !access.offboarding)
            ),
        );
        if (key === 'personal' && ownOffboarding)
          visible.splice(7, 0, ['myOffboarding', 'badge', 'offboarding']);
        const links = visible
          .map(([name, glyph, route]) => {
            const active =
              route === ''
                ? !state.route
                : state.route === route ||
                  state.route.startsWith(route + '/') ||
                  (route === 'workspaces' && state.route.startsWith('projects/'));
            const body =
              icon(glyph) +
              '<span class="nav__label">' +
              t('nav.' + name) +
              '</span>' +
              (badges[route]
                ? '<span class="nav__badge">' +
                  (badges[route] > 99 ? '99+' : badges[route]) +
                  '</span>'
                : '');
            return rawLink(
              route,
              body,
              'nav__link' + (active ? ' nav__link--active' : ''),
              'title="' + t('nav.' + name) + '"' + (active ? ' aria-current="page"' : ''),
            );
          })
          .join('');
        return (
          '<div class="nav__group" role="group" aria-label="' +
          t('nav.groups.' + key) +
          '">' +
          (index ? '<hr class="nav__divider">' : '') +
          '<span class="nav__heading">' +
          t('nav.groups.' + key) +
          '</span>' +
          links +
          '</div>'
        );
      })
      .join('');
    const menu = (name, contents) =>
      state.menu === name ? '<div class="menu-popup">' + contents + '</div>' : '';
    const menuItem = (name, route, glyph) => link(route, raw('nav.' + name), glyph, 'menu-item');
    const account =
      '<div class="menu-profile">' +
      avatar(user.fullName, 'lg') +
      '<span class="menu-profile__text"><strong>' +
      h(user.fullName) +
      '</strong><span>' +
      h(user.email) +
      '</span><small class="muted">Tài khoản demo</small></span></div>' +
      menuItem('profile', 'profile', 'account_circle') +
      (access.admin
        ? menuItem('admin', 'admin/users', 'admin_panel_settings') +
          menuItem('security', 'admin/security', 'shield') +
          menuItem('backups', 'admin/backups', 'backup')
        : '') +
      menuItem('system', 'system', 'monitor_heart') +
      act('demoAccount', 'Chuyển tài khoản demo', 'switch_account', 'menu-item') +
      menuItem('logout', 'login', 'logout') +
      act('reset', 'Đặt lại dữ liệu demo', 'restart_alt', 'menu-item');
    return `<aside class="sidebar${state.collapsed && !state.drawer ? ' sidebar--collapsed' : ''}${state.drawer ? ' sidebar--open' : ''}" aria-label="${t('nav.main')}">
      ${rawLink('', brand, 'sidebar__brand', 'aria-label="' + t('nav.homeLink') + '"')}
      <nav class="nav">${nav}</nav>
      <button type="button" class="sidebar__toggle" data-act="collapse" aria-label="${t(state.collapsed ? 'nav.expand' : 'nav.collapse')}">${icon(state.collapsed ? 'left_panel_open' : 'left_panel_close')}<span class="nav__label">${t('nav.collapse')}</span></button>
    </aside>
    ${state.drawer ? '<button class="backdrop" type="button" aria-label="Đóng menu" data-act="drawer"></button>' : ''}
    <div class="main">
      <header class="topbar">
        ${iconBtn('drawer', raw('nav.openMenu'), 'menu', 'topbar__menu')}
        ${rawLink('', brand, 'topbar__brand', 'aria-label="' + t('nav.homeLink') + '"')}
        <button type="button" class="search" data-act="search" aria-label="${t('search.trigger')}">${icon('search')}<span class="search__text">${t('search.trigger')}…</span><kbd class="search__keys">${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd></button>
        <span class="spacer"></span>
        <div class="menu-wrap">${iconBtn('menu|theme', raw('theme.title'), themeIcons[state.theme] || themeIcons.system)}${menu(
          'theme',
          Object.keys(themeIcons)
            .map((key) =>
              act(
                'theme|' + key,
                raw('theme.' + key),
                themeIcons[key],
                'menu-item' + (state.theme === key ? ' menu-item--active' : ''),
              ),
            )
            .join(''),
        )}</div>
        <div class="menu-wrap language"><button type="button" class="btn lang-btn" data-act="menu|lang" aria-label="${t('common.language')}">${icon('translate')} ${state.lang === 'vi' ? 'VI' : 'EN'}</button>${menu('lang', act('lang|vi', 'Tiếng Việt', '', 'menu-item') + act('lang|en', 'English', '', 'menu-item'))}</div>
        <div class="menu-wrap"><button class="user" type="button" aria-label="${t('nav.account')}" aria-expanded="${state.menu === 'account'}" data-act="menu|account">${avatar(user.fullName, 'sm user__avatar')}<span class="user__name">${h(user.fullName)}</span>${icon('expand_more', 'user__chevron')}</button>${menu('account', account)}</div>
      </header>
      <main class="content" id="content"></main>
    </div>`;
  }
  function parseRoute() {
    const [pathname, query] = location.hash.replace(/^#\/?/, '').split('?');
    let route = pathname.replace(/\/$/, '');
    try {
      route = decodeURIComponent(route);
    } catch {
      route = '';
    }
    const key = route.startsWith('admin/')
      ? route.split('/').slice(0, 2).join('/')
      : route.split('/')[0];
    return {
      route,
      key,
      parts: route.split('/').slice(key.startsWith('admin/') ? 2 : 1),
      query: new URLSearchParams(query),
    };
  }
  function render(focusName) {
    const { route, key, parts, query } = parseRoute();
    const data = MockApi.snapshot();
    const workspaceIds = new Set(
      data.workspaces
        .filter((row) => row.memberIds.includes(data.currentUserId))
        .map((row) => row.id),
    );
    if (['', 'workspaces', 'projects', 'timeline', 'calendar'].includes(key)) {
      data.projects = data.projects.filter((row) => workspaceIds.has(row.workspaceId));
      const projectIds = new Set(data.projects.map((row) => row.id));
      data.tasks = data.tasks.filter((row) => projectIds.has(row.projectId));
      data.workspaces = data.workspaces.filter((row) => workspaceIds.has(row.id));
      data.meetings = data.meetings.filter(
        (row) =>
          row.organizerId === data.currentUserId || row.attendeeIds.includes(data.currentUserId),
      );
    }
    for (const meeting of data.meetings) {
      meeting.response =
        meeting.responses?.[data.currentUserId] ||
        (meeting.attendeeIds.includes(data.currentUserId)
          ? data.currentUserId === 'lan'
            ? meeting.response
            : 'Pending'
          : 'Accepted');
    }
    const input = focusName ? document.activeElement : null;
    const selection = input?.selectionStart;
    const previousRoute = state.route;
    state.route = route;
    const position = root.querySelector('.sidebar')?.scrollTop || 0;
    const previousCalendar = previousRoute === route ? root.querySelector('.week__scroll') : null;
    const calendarPosition = previousCalendar?.scrollTop;
    const standalone =
      ['login', 'register', 'forgot-password', 'set-password', 'meetings'].includes(key) &&
      Demo.standalone?.[key];
    const access = Demo.access?.(data);
    const forbidden =
      access &&
      (((key.startsWith('admin/') || key === 'budgets') && !access.admin) ||
        (key === 'assets' && !access.assets) ||
        (key === 'approvals' && !access.review));
    root.innerHTML = standalone ? '<main id="content" class="standalone"></main>' : shell(data);
    const sidebar = root.querySelector('.sidebar');
    if (sidebar) sidebar.scrollTop = position;
    const content = root.querySelector('#content');
    content.dataset.page = key || 'home';
    content.innerHTML = (
      standalone ||
      (forbidden
        ? () => header('Bạn chưa có quyền truy cập', '', link('', 'Về tổng quan', 'arrow_back'))
        : null) ||
      views[key] ||
      (() => header('Không tìm thấy trang', '', link('', 'Về tổng quan', 'space_dashboard')))
    )(data, ...parts);
    const calendar = root.querySelector('.week__scroll');
    if (calendar) calendar.scrollTop = calendarPosition ?? Number(calendar.dataset.scrollDefault);
    document.documentElement.lang = state.lang;
    document.title = (labels[key] ? raw(labels[key]) + ' | ' : '') + 'TeamFlow';
    if (
      key === 'projects' &&
      query.has('task') &&
      state.view.openedTaskQuery !== query.get('task')
    ) {
      const task = data.tasks.find(
        (row) => row.projectId === parts[0] && [row.id, row.code].includes(query.get('task')),
      );
      state.view.openedTaskQuery = query.get('task');
      if (task) queueMicrotask(() => actions.task(task.id));
    }
    if (focusName) {
      const field = root.querySelector('[data-view="' + CSS.escape(focusName) + '"]');
      field?.focus({ preventScroll: true });
      if (selection != null) field?.setSelectionRange(selection, selection);
    }
  }
  function searchResults(query) {
    const data = MockApi.snapshot();
    const scope = new Set(
      data.workspaces
        .filter((row) => row.memberIds.includes(data.currentUserId))
        .map((row) => row.id),
    );
    const projectIds = new Set(
      data.projects.filter((row) => scope.has(row.workspaceId)).map((row) => row.id),
    );
    const buckets = [
      [
        'workspaces',
        'group',
        data.workspaces
          .filter((row) => scope.has(row.id))
          .map((row) => [row.name, row.description, 'workspaces/' + row.id]),
      ],
      [
        'projects',
        'folder_open',
        data.projects
          .filter((row) => projectIds.has(row.id))
          .map((row) => [row.name, row.key, 'projects/' + row.id]),
      ],
      [
        'tasks',
        'task_alt',
        data.tasks
          .filter((row) => projectIds.has(row.projectId))
          .map((row) => [row.title, row.code, 'projects/' + row.projectId, 'task:' + row.id]),
      ],
      [
        'people',
        'person',
        data.employees.map((row) => [
          row.fullName,
          row.jobTitle,
          'departments',
          'employee:' + row.id,
        ]),
      ],
      [
        'meetings',
        'event',
        data.meetings
          .filter(
            (row) =>
              row.organizerId === data.currentUserId ||
              row.attendeeIds.includes(data.currentUserId),
          )
          .map((row) => [row.title, fmtDate(row.startAt), 'calendar', 'meeting:' + row.id]),
      ],
      [
        'messages',
        'chat_bubble_outline',
        data.chats.flatMap((chat) =>
          chat.messages.map((row) => [row.text, chat.name, 'messages/' + chat.id]),
        ),
      ],
    ];
    if (query.trim().length < 2)
      return (
        '<p class="muted">' +
        t('search.hint') +
        '</p><div class="row-actions">' +
        buckets.map(([key]) => chip(raw('search.sections.' + key))).join('') +
        '</div>'
      );
    return (
      buckets
        .map(([key, glyph, items]) => {
          const found = items
            .filter(([title, detail]) => matches(query, title, detail))
            .slice(0, 5);
          if (!found.length) return '';
          return (
            '<section><h3>' +
            t('search.sections.' + key) +
            '</h3>' +
            found
              .map(
                ([title, detail, route, target]) =>
                  '<button type="button" class="search-result" data-act="searchGo|' +
                  h(route) +
                  '|' +
                  h(target || '') +
                  '">' +
                  icon(glyph) +
                  '<span><strong>' +
                  h(title) +
                  '</strong><small>' +
                  h(detail) +
                  '</small></span></button>',
              )
              .join('') +
            '</section>'
          );
        })
        .join('') || '<p class="muted">' + t('search.none', { query }) + '</p>'
    );
  }
  function applyTheme() {
    const dark =
      state.theme === 'dark' ||
      (state.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('tf-dark', dark);
  }
  Object.assign(actions, {
    close,
    collapse: () => {
      state.collapsed = !state.collapsed;
      DemoStorage.preference('sidebar', state.collapsed ? '1' : '0');
      render();
    },
    drawer: () => {
      state.drawer = !state.drawer;
      render();
    },
    menu: (name) => {
      state.menu = state.menu === name ? '' : name;
      render();
      root.querySelector('[data-act="menu|' + name + '"]')?.focus({ preventScroll: true });
    },
    theme: (mode) => {
      state.theme = mode;
      state.menu = '';
      DemoStorage.preference('theme', mode);
      applyTheme();
      render();
    },
    lang: (language) => {
      state.lang = language;
      state.menu = '';
      DemoStorage.preference('lang', language);
      render();
    },
    view: (name, value) => {
      state.view[name] = value;
      if (name === 'requestTab') {
        delete state.view.requestSelected;
        delete state.view.requestPage;
        if (location.hash.startsWith('#/requests/')) {
          go('requests', 'view:requestTab:' + value);
          return;
        }
      }
      if (['taskMode', 'calendarMode'].includes(name)) DemoStorage.preference(name, value);
      render();
    },
    reset: () =>
      confirm(
        'Đặt lại dữ liệu demo?',
        'Các thay đổi trong phiên demo trên trình duyệt này sẽ được xóa và dữ liệu mẫu sẽ được khôi phục.',
        () => {
          MockApi.reset();
          state.view = {};
          go('');
          refresh('Đã khôi phục dữ liệu mẫu.');
        },
        'Đặt lại',
      ),
    search: () => {
      show(
        raw('search.trigger'),
        '<label class="filter-search global-search">' +
          icon('search') +
          '<input id="global-search" type="search" autocomplete="off" placeholder="' +
          t('search.placeholder') +
          '" aria-label="' +
          t('search.trigger') +
          '"></label><div id="search-results">' +
          searchResults('') +
          '</div>',
        { wide: true },
      );
      dialog.querySelector('input').focus();
    },
    searchGo: (route, target) => {
      close();
      go(route, target);
    },
  });
  document.addEventListener('click', (event) => {
    const clicked = event.target.closest('[data-act]');
    if (clicked) {
      const [name, ...args] = clicked.dataset.act.split('|');
      run(name, args, clicked);
      return;
    }
    const anchor = event.target.closest('a[href^="#/"]');
    if (anchor) {
      if (anchor.hash === location.hash && (state.drawer || state.menu)) {
        state.drawer = false;
        state.menu = '';
        render();
      }
      if (dialog.open) close();
      return;
    }
    if (event.target === dialog) {
      close();
      return;
    }
    if (state.menu && !event.target.closest('.menu-wrap')) {
      state.menu = '';
      render();
    }
  });
  document.addEventListener('input', (event) => {
    const item = event.target;
    if (item.id === 'global-search')
      dialog.querySelector('#search-results').innerHTML = searchResults(item.value);
    if (item.matches('input[type="search"][data-view]')) {
      state.view[item.dataset.view] = item.value;
      for (const key of Object.keys(state.view)) if (key.endsWith('Page')) delete state.view[key];
      render(item.dataset.view);
    }
  });
  document.addEventListener('change', (event) => {
    const item = event.target;
    if (item.matches('select[data-view]')) {
      state.view[item.dataset.view] = item.value;
      if (item.dataset.view === 'mineWorkspace') delete state.view.mineProject;
      for (const key of Object.keys(state.view)) if (key.endsWith('Page')) delete state.view[key];
      render(item.dataset.view);
    }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      actions.search();
    }
    const searchOpen = dialog.open && dialog.querySelector('#global-search');
    if (searchOpen && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      const results = [...dialog.querySelectorAll('.search-result')];
      if (results.length) {
        event.preventDefault();
        const current = results.indexOf(document.activeElement);
        const next =
          current < 0
            ? event.key === 'ArrowDown'
              ? 0
              : results.length - 1
            : (current + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        results[next].focus();
      }
    }
    if (event.target.id === 'global-search' && event.key === 'Enter')
      dialog.querySelector('.search-result')?.click();
    if (event.key === 'Escape' && !dialog.open && (state.menu || state.drawer)) {
      state.menu = '';
      state.drawer = false;
      render();
    }
  });
  dialog.addEventListener('submit', async (event) => {
    event.preventDefault();
    const callback = onSubmit;
    if (!callback) return;
    const errorMessage = dialog.querySelector('.form-error');
    const submitButton = event.target.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(event.target));
      const result = await callback(values, event.target);
      if (onSubmit === callback && result !== false) close();
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });
  window.addEventListener('hashchange', () => {
    close();
    state.view = {};
    state.menu = '';
    state.drawer = false;
    render();
    window.scrollTo(0, 0);
    if (state.nextTarget) {
      const target = state.nextTarget;
      delete state.nextTarget;
      run(...splitTarget(target));
    }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    render();
  });
  return {
    state,
    views,
    actions,
    labels,
    h,
    raw,
    t,
    icon,
    rawLink,
    link,
    act,
    iconBtn,
    person,
    byId,
    avatar,
    matches,
    fmtDate,
    money,
    hours,
    chip,
    bar,
    placeholder,
    header,
    panel,
    table,
    tabs,
    searchField,
    filter,
    stat,
    stats,
    field,
    crumbs,
    paginate,
    show,
    close,
    confirm,
    refresh,
    render,
    showToast,
    go,
    dialog,
    today,
    shift,
    from,
    key: DemoDates.key,
    brand,
  };
})();
