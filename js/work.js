'use strict';

(() => {
  const D = Demo;
  const {
    state,
    views,
    actions,
    h,
    t,
    raw,
    icon,
    link,
    rawLink,
    act,
    iconBtn,
    avatar,
    byId,
    person,
    matches,
    fmtDate,
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
    confirm,
    refresh,
    render,
    go,
    today,
    shift,
    from,
    key,
  } = D;
  const statuses = ['Todo', 'InProgress', 'Done'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  const statusIcons = {
    Todo: 'radio_button_unchecked',
    InProgress: 'pending',
    Done: 'check_circle',
  };
  const priorityIcons = {
    Low: 'keyboard_arrow_down',
    Medium: 'remove',
    High: 'keyboard_arrow_up',
    Urgent: 'keyboard_double_arrow_up',
  };
  const empOptions = (data, ids, blank = '—') => [
    ['', blank],
    ...data.employees
      .filter((row) => !ids || ids.includes(row.id))
      .map((row) => [row.id, row.fullName]),
  ];
  const options = (rows) => rows.map((row) => [row.id, row.name || row.title]);
  const shortDate = (day) => fmtDate(day, { day: '2-digit', month: '2-digit' });
  const dateFields = (start, end, startName = 'startDate', endName = 'dueDate') =>
    '<div class="field-grid">' +
    field('Ngày bắt đầu', startName, start, { type: 'date' }) +
    field('Hạn hoàn thành', endName, end, { type: 'date' }) +
    '</div>';
  const progressOf = (rows) =>
    rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0;
  const taskStatus = (task) => raw('tasks.status.' + task.status);
  const time = (value) => value?.slice(11, 16) || '';
  const wrap = (body, className) => '<div class="' + className + '">' + body + '</div>';
  const projectFor = (data, task) => byId(data, 'projects', task.projectId);
  const taskAvatar = (data, task) =>
    task.assigneeId
      ? avatar(person(data, task.assigneeId)?.fullName, 'sm')
      : icon('person_add', 'row__unassigned');
  const due = (task, tone) =>
    task.dueDate
      ? '<span class="due due--' +
        (tone ||
          (task.status !== 'Done' && task.dueDate < today()
            ? 'overdue'
            : task.dueDate === today()
              ? 'today'
              : 'calm')) +
        '">' +
        icon('event') +
        shortDate(task.dueDate) +
        '</span>'
      : '';
  const checkCount = (task) =>
    task.checklist.length
      ? '<span class="due">' +
        icon('checklist') +
        task.checklist.filter((row) => row.done).length +
        '/' +
        task.checklist.length +
        '</span>'
      : '';

  function home(data) {
    const user = person(data, data.currentUserId);
    const date = today();
    const open = data.tasks.filter((row) => row.assigneeId === user.id && row.status !== 'Done');
    const overdue = open.filter((row) => row.dueDate && row.dueDate < date);
    const dueNow = open.filter((row) => row.dueDate === date);
    const meetings = data.meetings
      .filter(
        (row) =>
          row.startAt.slice(0, 10) >= date &&
          row.startAt.slice(0, 10) <= shift(date, 7) &&
          row.response !== 'Declined',
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    const invites = meetings.filter((row) => row.response === 'Pending');
    const focus = state.view.home || '';
    const hour = new Date().getHours();
    const greeting = t(
      'home.greeting.' +
        (hour < 11 ? 'morning' : hour < 14 ? 'noon' : hour < 18 ? 'afternoon' : 'evening'),
    );
    const headlineKey =
      overdue.length && dueNow.length
        ? 'overdueToday'
        : overdue.length
          ? 'overdueOnly'
          : dueNow.length
            ? 'todayOnly'
            : open.length
              ? 'openNoRush'
              : 'nothing';
    const welcome = `<section class="welcome"><div class="welcome__text"><span class="welcome__date">${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      <h1>${greeting}, <span class="welcome__name">${h(user.fullName)}</span></h1><p class="welcome__line">${t('home.' + headlineKey, { open: open.length, overdue: overdue.length, today: dueNow.length })}</p></div>
      <div class="welcome__actions">${overdue.length || dueNow.length ? link('my-work', raw('nav.myWork'), 'checklist', 'btn primary') : ''}${link('calendar', raw('home.bookMeeting'), 'calendar_add_on', 'ghost')}</div></section>`;
    const summary =
      '<section class="stats" aria-label="Tổng quan">' +
      [
        stat(raw('home.stats.open'), open.length, 'checklist', 'indigo'),
        stat(
          raw('home.stats.overdue'),
          overdue.length,
          'event_busy',
          'rose',
          'homeFilter|overdue',
          focus === 'overdue',
        ),
        stat(
          raw('home.stats.today'),
          dueNow.length,
          'today',
          'amber',
          'homeFilter|today',
          focus === 'today',
        ),
        stat(
          raw('home.stats.invites'),
          invites.length,
          'mark_email_unread',
          'emerald',
          'homeFilter|invites',
          focus === 'invites',
        ),
      ].join('') +
      '</section>';
    const groups = [
      ['overdue', 'danger', overdue],
      ['today', 'warn', dueNow],
      [
        'week',
        'accent',
        open.filter((task) => task.dueDate > date && task.dueDate <= shift(date, 7)),
      ],
      ['later', 'calm', open.filter((task) => task.dueDate > shift(date, 7))],
      ['none', 'calm', open.filter((task) => !task.dueDate)],
    ];
    const taskRows = groups
      .filter(
        ([group, , rows]) =>
          rows.length && (!['overdue', 'today'].includes(focus) || group === focus),
      )
      .map(
        ([group, tone, rows]) =>
          '<section class="group"><h3 class="group__title group__title--' +
          tone +
          '">' +
          t('home.groups.' + group) +
          ' <span>' +
          rows.length +
          '</span></h3><ul>' +
          rows
            .map((task) => {
              const project = projectFor(data, task);
              return `<li><div class="task">${iconBtn('completeTask|' + task.id, raw('home.tasks.complete'), 'check', 'check')}${icon(statusIcons[task.status], 'task__status status--' + task.status)}
        <button type="button" class="task__main" data-act="task|${h(task.id)}"><span class="task__title">${h(task.title)}</span><span class="task__meta"><span class="project"><i style="background:${h(project.color)}"></i>${h(project.name)}</span><span class="code">${h(task.code)}</span></span></button>
        <button type="button" class="pill" style="--p:${task.progress}%" data-act="taskProgress|${h(task.id)}" aria-label="${t('home.tasks.updateProgress')}">${task.progress}%</button>
        ${icon(priorityIcons[task.priority], 'task__priority priority--' + task.priority)}${due(task, ['danger', 'warn'].includes(tone) ? tone : 'muted')}</div></li>`;
            })
            .join('') +
          '</ul></section>',
      )
      .join('');
    const main =
      '<section class="panel panel--main home-tasks"><header class="head"><h2>' +
      t('home.tasks.title') +
      ' <span class="count">' +
      open.length +
      '</span></h2>' +
      (['overdue', 'today'].includes(focus)
        ? act('homeFilter|' + focus, raw('home.groups.' + focus), 'close', 'clear')
        : '') +
      '</header>' +
      (taskRows ||
        placeholder(
          raw(
            focus === 'overdue'
              ? 'home.tasks.emptyOverdue'
              : focus === 'today'
                ? 'home.tasks.emptyToday'
                : 'home.tasks.empty',
          ),
          'task_alt',
        )) +
      '</section>';
    const agenda =
      '<section class="panel home-agenda' +
      (focus === 'invites' ? ' panel--focus' : '') +
      '"><header class="head"><h2>' +
      icon('event') +
      t(focus === 'invites' ? 'home.agenda.invites' : 'home.agenda.week') +
      '</h2>' +
      link('calendar', raw('home.agenda.open'), '', '') +
      '</header>' +
      ((focus === 'invites' ? invites : meetings)
        .map(
          (row) =>
            '<article class="meeting"><span class="meeting__bar" style="background:var(--tf-indigo-500)"></span><div class="meeting__body">' +
            act('meeting|' + row.id, row.title, '', 'meeting__title plain-button') +
            '<span class="meeting__when">' +
            shortDate(row.startAt) +
            ' · ' +
            time(row.startAt) +
            '–' +
            time(row.endAt) +
            '</span>' +
            (row.response === 'Pending'
              ? '<div class="actions">' +
                act(
                  'meetingReply|' + row.id + '|Accepted',
                  raw('home.agenda.accept'),
                  'check',
                  'answer answer--yes',
                ) +
                act(
                  'meetingReply|' + row.id + '|Declined',
                  raw('home.agenda.decline'),
                  'close',
                  'answer answer--no',
                ) +
                '</div>'
              : '') +
            '</div></article>',
        )
        .join('') ||
        '<p class="muted">' +
          t(focus === 'invites' ? 'home.agenda.allAnswered' : 'home.agenda.none') +
          '</p>') +
      '</section>';
    const projects =
      '<section class="panel home-projects"><header class="head"><h2>' +
      icon('folder_open') +
      t('home.projects.title') +
      '</h2>' +
      link('timeline', raw('home.projects.timeline'), '', '') +
      '</header>' +
      data.projects
        .map((project) => {
          const rows = data.tasks.filter((task) => task.projectId === project.id);
          const progress = progressOf(rows);
          const workspace = byId(data, 'workspaces', project.workspaceId);
          const mine = open.filter((task) => task.projectId === project.id).length;
          return rawLink(
            'projects/' + project.id,
            '<span class="project__key" style="background:' +
              h(project.color) +
              '">' +
              h(project.key) +
              '</span><span class="project__body"><span class="project__name">' +
              h(project.name) +
              '</span><span class="project__meta">' +
              h(workspace?.name) +
              (mine ? ' · <strong>' + t('home.projects.mine', { count: mine }) + '</strong>' : '') +
              '</span><span class="bar"><span style="width:' +
              progress +
              '%;background:' +
              h(project.color) +
              '"></span></span></span><span class="project__percent">' +
              progress +
              '%</span>',
            'project',
          );
        })
        .join('') +
      '</section>';
    return wrap(
      welcome +
        summary +
        '<div class="layout">' +
        main +
        '<aside class="side">' +
        agenda +
        projects +
        '</aside></div>',
      'home',
    );
  }

  function workspaceList(data) {
    const rows = data.workspaces.filter((row) =>
      matches(state.view.workspaceQuery, row.name, row.description),
    );
    return wrap(
      header(
        'Workspace',
        raw('workspaces.subtitle'),
        act('workspaceForm', raw('workspaces.create'), 'add', 'btn primary create'),
      ) +
        (data.workspaces.length > 3
          ? '<div class="toolbar">' +
            searchField('workspaceQuery', raw('workspaces.search')) +
            '</div>'
          : '') +
        '<div class="grid">' +
        rows
          .map((row) =>
            rawLink(
              'workspaces/' + row.id,
              '<div class="card__top">' +
                avatar(row.name, 'lg', '', true) +
                chip(row.ownerId === data.currentUserId ? 'Chủ sở hữu' : 'Thành viên', 'indigo') +
                '</div><h3>' +
                h(row.name) +
                '</h3><p class="card__description">' +
                h(row.description) +
                '</p><div class="card__meta"><span>' +
                icon('group') +
                row.memberIds.length +
                ' thành viên</span><span>' +
                icon('view_kanban') +
                data.projects.filter((item) => item.workspaceId === row.id).length +
                ' dự án</span><span>' +
                icon('calendar_today') +
                fmtDate(row.createdAt) +
                '</span></div>' +
                icon('arrow_forward', 'card__arrow'),
              'card',
            ),
          )
          .join('') +
        '<button type="button" class="card card--new" data-act="workspaceForm"><span class="card--new__icon">' +
        icon('add') +
        '</span><strong>Tạo workspace mới</strong><span>Không gian chung cho nhóm của bạn</span></button></div>',
      'workspace-list',
    );
  }

  function hero(data, item, extra, controls, color = '#6366f1') {
    const mark = item.key
      ? '<span class="hero__key" style="background:' + h(color) + '">' + h(item.key) + '</span>'
      : avatar(item.name, 'lg', color, true);
    return (
      '<section class="hero" style="--hero-color:' +
      h(color) +
      '">' +
      mark +
      '<div class="hero-body hero__body"><h1>' +
      h(item.name) +
      '</h1><p class="hero__description">' +
      h(item.description || raw('common.noDescription') || 'Chưa có mô tả.') +
      '</p><div class="row-actions meta hero__meta">' +
      extra +
      '<span>' +
      icon('calendar_today') +
      ' ' +
      fmtDate(item.createdAt) +
      '</span></div></div><div class="row-actions hero__actions">' +
      controls +
      '</div></section>'
    );
  }
  const projectTile = (data, project) => {
    const tasks = data.tasks.filter((row) => row.projectId === project.id);
    return rawLink(
      'projects/' + project.id,
      '<div class="person-cell">' +
        avatar(project.key, 'lg', project.color, true) +
        '<div><strong>' +
        h(project.name) +
        '</strong><small>' +
        h(project.key) +
        ' · ' +
        tasks.length +
        ' công việc</small></div></div><p class="muted">' +
        h(project.description) +
        '</p>' +
        bar(progressOf(tasks), project.color),
      'surface card-link',
    );
  };
  function workspaceDetail(data, id) {
    const item = byId(data, 'workspaces', id);
    if (!item)
      return header('Không tìm thấy workspace', '', link('workspaces', 'Tất cả workspace'));
    const projects = data.projects.filter((row) => row.workspaceId === id);
    const tab = state.view.workspaceTab || 'projects';
    return (
      crumbs([
        ['workspaces', 'Workspace'],
        [null, item.name],
      ]) +
      hero(
        data,
        item,
        chip(item.memberIds.length + ' thành viên') + chip(projects.length + ' dự án'),
        D.workspaceButtons(data, item),
      ) +
      '<div class="toolbar">' +
      tabs(
        'workspaceTab',
        [
          ['projects', raw('workspaces.detail.projectsTab'), 'folder_open'],
          ['members', raw('workspaces.detail.membersTab'), 'group'],
        ],
        tab,
      ) +
      '<span class="spacer"></span>' +
      (tab === 'projects'
        ? act('projectForm|' + id, 'Tạo dự án', 'add', 'btn primary')
        : act('addMember|' + id, 'Thêm thành viên', 'person_add', 'btn primary')) +
      '</div>' +
      (tab === 'projects'
        ? projects.length
          ? '<div class="card-grid">' +
            projects.map((row) => projectTile(data, row)).join('') +
            '</div>'
          : panel(placeholder('Workspace chưa có dự án.', 'folder_open'))
        : panel(
            table(
              ['Thành viên', 'Chức danh', 'Vai trò'],
              item.memberIds.map((memberId) => {
                const member = person(data, memberId);
                return [
                  '<span class="person-cell">' +
                    avatar(member.fullName, 'sm') +
                    act('employee|' + member.id, member.fullName, '', 'plain-button') +
                    '</span>',
                  h(member.jobTitle),
                  D.workspaceMemberControls(data, item, member),
                ];
              }),
            ),
          ))
    );
  }
  function workspaceForm(id) {
    const data = MockApi.snapshot();
    const row = byId(data, 'workspaces', id) || {};
    show(
      row.id ? 'Chỉnh sửa workspace' : raw('workspaces.create'),
      field('Tên workspace', 'name', row.name, { required: true }) +
        field('Mô tả', 'description', row.description, { type: 'textarea' }),
      {
        glyph: 'group',
        submit: (values) => {
          const item = MockApi.saveWorkspace(values, row.id);
          go('workspaces/' + item.id);
          refresh('Đã lưu workspace.');
        },
      },
    );
  }
  function projectForm(workspaceId, id) {
    const row = byId(MockApi.snapshot(), 'projects', id) || {};
    show(
      row.id ? 'Chỉnh sửa dự án' : 'Tạo dự án',
      field('Tên dự án', 'name', row.name, { required: true }) +
        field('Mã dự án', 'key', row.key, {
          required: true,
          placeholder: 'VD: PORTAL',
        }) +
        field('Mô tả', 'description', row.description, { type: 'textarea' }) +
        field('Màu dự án', 'color', row.color || '#6366f1', { type: 'color' }),
      {
        glyph: 'folder_open',
        submit: (values) => {
          const item = MockApi.saveProject({ ...values, workspaceId }, row.id);
          go('projects/' + item.id);
          refresh('Đã lưu dự án.');
        },
      },
    );
  }
  function taskList(data, projectId, rows) {
    const output = statuses
      .map((status) => {
        if (state.view.taskStatus && status !== state.view.taskStatus) return '';
        const tasks = rows.filter((row) => row.status === status);
        const collapsed = !!state.view['group' + status];
        return (
          '<section class="group"><header class="group__header"><button class="group__toggle" type="button" data-act="taskGroup|' +
          status +
          '" aria-expanded="' +
          !collapsed +
          '">' +
          icon(collapsed ? 'chevron_right' : 'expand_more', 'group__chevron') +
          icon(statusIcons[status], 'status--' + status) +
          h(raw('tasks.status.' + status)) +
          '<span class="group__count">' +
          tasks.length +
          '</span></button>' +
          (projectId
            ? iconBtn('newTask|' + projectId + '|' + status, raw('tasks.add'), 'add', 'group__add')
            : '') +
          '</header>' +
          (collapsed
            ? ''
            : '<ul class="rows">' +
              (tasks
                .map(
                  (task) =>
                    '<li><button type="button" class="row' +
                    (task.status === 'Done' ? ' row--done' : '') +
                    '" data-act="task|' +
                    h(task.id) +
                    '">' +
                    icon(priorityIcons[task.priority], 'row__priority priority--' + task.priority) +
                    '<span class="row__code">' +
                    h(task.code) +
                    '</span><span class="row__title">' +
                    h(task.title) +
                    '</span>' +
                    (task.progress && task.status !== 'Done'
                      ? '<span class="row__progress" style="--p:' +
                        task.progress +
                        '%">' +
                        task.progress +
                        '%</span>'
                      : '') +
                    checkCount(task) +
                    due(task) +
                    taskAvatar(data, task) +
                    '</button></li>',
                )
                .join('') || '<li class="rows__empty">' + t('tasks.list.noMatch') + '</li>') +
              '</ul>') +
          '</section>'
        );
      })
      .join('');
    return wrap(output, 'task-list');
  }
  const boardCard = (data, task) =>
    '<article class="card" draggable="true" data-drag-task="' +
    h(task.id) +
    '" data-act="task|' +
    h(task.id) +
    '" tabindex="0" role="button" aria-label="' +
    h(task.code + ' ' + task.title) +
    '">' +
    '<div class="card__top"><span class="card__code">' +
    h(task.code) +
    '</span>' +
    icon(priorityIcons[task.priority], 'card__priority priority--' + task.priority) +
    '</div><p class="card__title' +
    (task.status === 'Done' ? ' card__title--done' : '') +
    '">' +
    h(task.title) +
    '</p>' +
    (task.progress && task.status !== 'Done'
      ? '<div class="card__progress"><span class="card__track"><span style="width:' +
        task.progress +
        '%"></span></span><small>' +
        task.progress +
        '%</small></div>'
      : '') +
    '<div class="card__bottom">' +
    checkCount(task) +
    due(task) +
    '<span class="spacer"></span>' +
    taskAvatar(data, task) +
    '</div></article>';
  function board(data, project, rows) {
    return (
      '<section class="task-board"><div class="board">' +
      statuses
        .map((status) => {
          const tasks = rows.filter((row) => row.status === status);
          const action = 'newTask|' + project.id + '|' + status;
          return (
            '<section class="column column--' +
            status +
            '"><header class="column__header">' +
            icon(statusIcons[status], 'status--' + status) +
            '<h3>' +
            t('tasks.status.' + status) +
            '</h3><span class="column__count">' +
            tasks.length +
            '</span>' +
            iconBtn(action, raw('tasks.add'), 'add', 'column__add') +
            '</header><div class="column__cards" data-drop-status="' +
            status +
            '">' +
            (tasks.map((row) => boardCard(data, row)).join('') ||
              '<p class="column__empty">' + t('tasks.board.dropHere') + '</p>') +
            '</div>' +
            act(action, raw('tasks.board.addCard'), 'add', 'column__quick-add') +
            '</section>'
          );
        })
        .join('') +
      '</div></section>'
    );
  }
  function projectDetail(data, id) {
    const item = byId(data, 'projects', id);
    if (!item) return header('Không tìm thấy dự án', '', link('workspaces', 'Workspace'));
    const workspace = byId(data, 'workspaces', item.workspaceId);
    const all = data.tasks.filter((row) => row.projectId === id);
    const tab = state.view.projectTab || 'tasks';
    const mode = state.view.taskMode || DemoStorage.preference('taskMode') || 'list';
    const rows = all.filter(
      (row) =>
        matches(state.view.taskQuery, row.title, row.code) &&
        (!state.view.taskMine || row.assigneeId === data.currentUserId),
    );
    let area = '';
    if (tab === 'budget') area = D.budgetDetail(data, item, false);
    else if (tab === 'files') area = projectFiles(data, item);
    else {
      const tax =
        mode === 'list'
          ? statuses.map((status) => [
              status,
              raw('tasks.status.' + status) +
                ' ' +
                all.filter((row) => row.status === status).length,
              statusIcons[status],
            ])
          : [];
      area =
        '<div class="toolbar">' +
        tabs(
          'taskMode',
          [
            ['list', raw('tasks.view.list'), 'view_list'],
            ['board', raw('tasks.view.board'), 'view_kanban'],
          ],
          mode,
        ) +
        searchField('taskQuery', raw('tasks.search')) +
        '<span class="spacer"></span>' +
        act('newTask|' + id + '|Todo', raw('tasks.add'), 'add', 'btn primary') +
        '</div><div class="toolbar">' +
        tax
          .map(([status, label, glyph]) =>
            act(
              'taskStatus|' + status,
              label,
              glyph,
              'btn sm' + (state.view.taskStatus === status ? ' selected' : ''),
            ),
          )
          .join('') +
        act(
          'taskMine',
          raw('tasks.mine'),
          'person',
          'btn sm' + (state.view.taskMine ? ' selected' : ''),
        ) +
        (state.view.taskMine || state.view.taskStatus || state.view.taskQuery
          ? act('taskClear', 'Bỏ lọc', 'close', 'btn sm')
          : '') +
        '</div>' +
        (mode === 'board' ? board(data, item, rows) : taskList(data, id, rows));
    }
    const sections = [
      ['tasks', 'task_alt', all.length],
      ['files', 'folder_open', data.files.filter((file) => file.projectId === id).length],
      ...(D.projectCanBudget(data, item) ? [['budget', 'account_balance_wallet']] : []),
    ];
    const names = { tasks: 'tasksTab', files: 'filesTab', budget: 'budgetTab' };
    const navigation =
      '<div class="sections" role="tablist">' +
      sections
        .map(
          ([value, glyph, count]) =>
            '<button type="button" role="tab" class="section' +
            (tab === value ? ' section--on' : '') +
            '" aria-selected="' +
            (tab === value) +
            '" data-act="view|projectTab|' +
            value +
            '">' +
            icon(glyph) +
            t('projects.detail.' + names[value]) +
            (count === undefined ? '' : '<span class="section__count">' + count + '</span>') +
            '</button>',
        )
        .join('') +
      '</div>';
    return wrap(
      crumbs([
        ['workspaces', 'Workspace'],
        ['workspaces/' + workspace.id, workspace.name],
        [null, item.name],
      ]) +
        hero(
          data,
          item,
          '<span>' +
            icon('task_alt') +
            ' ' +
            all.length +
            ' công việc</span><span>' +
            icon('person') +
            ' ' +
            h(person(data, data.currentUserId)?.fullName) +
            '</span>',
          D.projectButtons(data, workspace, item),
          item.color,
        ) +
        navigation +
        area,
      'project-page',
    );
  }
  function taskForm(projectId, status, taskId) {
    const data = MockApi.snapshot();
    const task = byId(data, 'tasks', taskId) || {};
    const project = byId(data, 'projects', projectId);
    if (!project) return;
    const workspace = byId(data, 'workspaces', project.workspaceId);
    show(
      task.id ? task.code + ' · Chỉnh sửa công việc' : raw('tasks.add'),
      field('Tiêu đề', 'title', task.title, { required: true }) +
        field('Mô tả', 'description', task.description, { type: 'textarea' }) +
        '<div class="field-grid">' +
        field('Trạng thái', 'status', task.status || status || 'Todo', {
          options: statuses.map((value) => [value, raw('tasks.status.' + value)]),
        }) +
        field('Độ ưu tiên', 'priority', task.priority || 'Medium', {
          options: priorities.map((value) => [value, raw('tasks.priority.' + value)]),
        }) +
        '</div>' +
        field('Người phụ trách', 'assigneeId', task.assigneeId, {
          options: empOptions(data, workspace.memberIds, raw('tasks.unassigned')),
        }) +
        dateFields(task.startDate, task.dueDate) +
        field('Ước tính số giờ', 'estimateHours', task.estimateHours ?? '', {
          type: 'number',
          step: 0.25,
          min: 0,
          max: 10000,
        }) +
        (task.id
          ? field('Tiến độ (%)', 'progress', task.progress, { type: 'number', min: 0, max: 100 })
          : ''),
      {
        glyph: 'task_alt',
        wide: true,
        submit: (values) => {
          const saved = MockApi.saveTask({ ...values, projectId }, task.id);
          refresh(task.id ? 'Đã cập nhật công việc.' : 'Đã tạo công việc ' + saved.code + '.');
        },
      },
    );
  }
  function projectFiles(data, project) {
    return D.projectFiles(data, project);
  }

  const monday = (date) => shift(date, -((from(date).getDay() + 6) % 7));
  const monthStep = (date, amount) => {
    const current = from(date);
    return key(new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };
  const monthName = (date) => fmtDate(date, { month: 'long', year: 'numeric' });
  const datesBetween = (start, count) =>
    Array.from({ length: count }, (_, index) => shift(start, index));
  function dayGrid(data, date, type, rows, itemDate, renderItem, createAction) {
    const month = monthStep(date, 0);
    const first = type === 'week' ? monday(date) : monday(month);
    const days = datesBetween(first, type === 'week' ? 7 : 42);
    const weekLabels = datesBetween('2025-06-02', 7).map((day) =>
      fmtDate(day, { weekday: 'short' }),
    );
    return (
      '<div class="calendar-scroll"><div class="calendar-grid ' +
      (type === 'week' ? 'calendar-week' : '') +
      '">' +
      weekLabels.map((label) => '<div class="calendar-label">' + h(label) + '</div>').join('') +
      days
        .map(
          (day) =>
            '<div class="calendar-day' +
            (day === today() ? ' today' : '') +
            (type !== 'week' && day.slice(0, 7) !== month.slice(0, 7) ? ' outside' : '') +
            '"><div class="calendar-date"><strong>' +
            Number(day.slice(8)) +
            '</strong>' +
            act(createAction + '|' + day, '', 'add', 'btn text sm') +
            '</div>' +
            rows
              .filter((item) => itemDate(item) === day)
              .map(renderItem)
              .join('') +
            '</div>',
        )
        .join('') +
      '</div></div>'
    );
  }
  const hourHeight = 48;
  const asMinutes = (value) => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
  const timeLabel = (minutes) =>
    String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  function weekSegments(rows, date) {
    const segments = rows
      .filter((row) => row.startAt < shift(date, 1) + 'T00:00' && row.endAt > date + 'T00:00')
      .map((row) => ({
        row,
        start: row.startAt.startsWith(date) ? asMinutes(row.startAt) : 0,
        end: row.endAt.startsWith(date) ? asMinutes(row.endAt) : 1440,
      }))
      .sort((a, b) => a.start - b.start || a.end - b.end);
    let group = [];
    let laneEnds = [];
    let groupEnd = -1;
    function finish() {
      for (const segment of group) segment.lanes = laneEnds.length;
      group = [];
      laneEnds = [];
    }
    for (const segment of segments) {
      if (segment.start >= groupEnd) finish();
      let lane = laneEnds.findIndex((end) => end <= segment.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = segment.end;
      groupEnd = Math.max(groupEnd, segment.end);
      group.push(segment);
      segment.lane = lane;
    }
    finish();
    return segments;
  }
  function calendarWeek(data, date) {
    const days = datesBetween(monday(date), 7);
    const desiredScroll = 8 * hourHeight;
    const current = new Date();
    const head = days
      .map(
        (day, index) =>
          '<div class="head' +
          (day === today() ? ' head--today' : '') +
          (index > 4 ? ' head--weekend' : '') +
          '"><span class="head__weekday">' +
          fmtDate(day, { weekday: 'short' }) +
          '</span><span class="head__date">' +
          Number(day.slice(-2)) +
          '</span></div>',
      )
      .join('');
    const columns = days
      .map((day, index) => {
        const events = weekSegments(data.meetings, day);
        const items = events
          .map(({ row, start, end, lane, lanes }, eventIndex) => {
            const color = byId(data, 'projects', row.projectId)?.color || '#6366f1';
            const height = Math.max(((end - start) * hourHeight) / 60, 20);
            const style =
              'top:' +
              (start * hourHeight) / 60 +
              'px;height:' +
              height +
              'px;left:calc(' +
              (lane / lanes) * 100 +
              '% + 2px);width:calc(' +
              100 / lanes +
              '% - 4px);--event:' +
              color +
              ';--i:' +
              eventIndex;
            return (
              '<button type="button" class="event event--' +
              h(row.response) +
              (height < 44 ? ' event--short' : '') +
              '" data-act="meeting|' +
              h(row.id) +
              '" style="' +
              h(style) +
              '" title="' +
              h(row.title) +
              '"><span class="event__title"><span class="event__name">' +
              h(row.title) +
              '</span></span><span class="event__time">' +
              time(row.startAt) +
              '–' +
              time(row.endAt) +
              '</span></button>'
            );
          })
          .join('');
        const now =
          day === today()
            ? '<span class="now" style="top:' +
              ((current.getHours() * 60 + current.getMinutes()) * hourHeight) / 60 +
              'px" aria-hidden="true"></span>'
            : '';
        return (
          '<div class="day' +
          (day === today() ? ' day--today' : '') +
          (index > 4 ? ' day--weekend' : '') +
          '" data-meeting-day="' +
          day +
          '">' +
          items +
          now +
          '</div>'
        );
      })
      .join('');
    const marks = Array.from(
      { length: 24 },
      (_, hour) =>
        '<span class="hours__label" style="top:' +
        hour * hourHeight +
        'px">' +
        (hour ? timeLabel(hour * 60) : '') +
        '</span>',
    ).join('');
    return (
      '<div class="calendar-scroll calendar-week-page"><div class="week"><div class="week__head"><span></span>' +
      head +
      '</div><div class="week__scroll" data-scroll-default="' +
      desiredScroll +
      '"><div class="week__body" style="height:' +
      hourHeight * 24 +
      'px;--hour:' +
      hourHeight +
      'px"><div class="hours" aria-hidden="true">' +
      marks +
      '</div>' +
      columns +
      '</div></div></div></div>'
    );
  }
  function calendar(data) {
    const date = state.view.calendarDate || today();
    const mode = state.view.calendarMode || DemoStorage.preference('calendarMode') || 'week';
    const pending = data.meetings.filter(
      (row) => row.attendeeIds.includes(data.currentUserId) && row.response === 'Pending',
    );
    const inviteRows = panel(
      '<h2>' +
        icon('mark_email_unread') +
        t('calendar.invites') +
        '</h2>' +
        (pending
          .map(
            (row) =>
              '<div class="item-line"><div class="stack">' +
              act('meeting|' + row.id, row.title, '', 'plain-button') +
              '<small>' +
              fmtDate(row.startAt) +
              ' · ' +
              time(row.startAt) +
              '</small><small>' +
              t('calendar.from', { name: person(data, row.organizerId)?.fullName }) +
              '</small></div><div class="row-actions">' +
              act(
                'meetingReply|' + row.id + '|Accepted',
                raw('calendar.accept'),
                'check',
                'btn sm',
              ) +
              act(
                'meetingReply|' + row.id + '|Declined',
                raw('calendar.decline'),
                'close',
                'btn sm',
              ) +
              '</div></div>',
          )
          .join('') || '<p class="muted">' + t('calendar.allAnswered') + '</p>'),
      pending.length ? 'invite-panel--attention' : '',
    );
    const upcoming = data.meetings
      .filter((row) => row.startAt.slice(0, 10) >= today() && row.response !== 'Declined')
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 6);
    const upcomingRows = panel(
      '<h2>' +
        icon('upcoming') +
        t('calendar.upcoming') +
        '</h2>' +
        (upcoming
          .map(
            (row) =>
              '<div class="item-line"><div class="stack">' +
              act('meeting|' + row.id, row.title, '', 'plain-button') +
              '<small>' +
              fmtDate(row.startAt) +
              ' · ' +
              time(row.startAt) +
              '</small></div></div>',
          )
          .join('') || '<p class="muted">' + t('calendar.noUpcoming') + '</p>'),
    );
    const controls =
      '<div class="toolbar">' +
      act('view|calendarDate|' + today(), raw('common.today'), '', 'btn sm') +
      iconBtn('calendarShift|-1', 'Trước', 'chevron_left') +
      iconBtn('calendarShift|1', 'Sau', 'chevron_right') +
      '<strong class="calendar-period">' +
      (mode === 'week'
        ? shortDate(monday(date)) + ' – ' + fmtDate(shift(monday(date), 6))
        : monthName(date)) +
      '</strong><span class="spacer"></span>' +
      tabs(
        'calendarMode',
        [
          ['week', 'Tuần', 'calendar_view_week'],
          ['month', 'Tháng', 'calendar_month'],
        ],
        mode,
      ) +
      '</div>';
    const calendarBody =
      mode === 'week'
        ? calendarWeek(data, date)
        : dayGrid(
            data,
            date,
            mode,
            data.meetings,
            (row) => row.startAt.slice(0, 10),
            (row) => act('meeting|' + row.id, time(row.startAt) + ' ' + row.title, '', 'cal-entry'),
            'meetingForm',
          );
    return (
      header(
        raw('calendar.title'),
        raw('calendar.subtitle'),
        act('meetingForm|' + date, raw('calendar.book'), 'calendar_add_on', 'btn primary'),
      ) +
      controls +
      '<div class="calendar-layout">' +
      calendarBody +
      '<aside class="calendar-side">' +
      inviteRows +
      upcomingRows +
      '</aside></div>'
    );
  }
  function meetingForm(date, meetingId, startingMinute = 540) {
    const data = MockApi.snapshot();
    const row = byId(data, 'meetings', meetingId) || {};
    const availableWorkspaces = data.workspaces.filter((item) =>
      item.memberIds.includes(data.currentUserId),
    );
    const workspaceId = row.workspaceId || availableWorkspaces[0]?.id;
    if (!workspaceId) {
      D.showToast('Bạn cần tham gia workspace để đặt lịch.', true);
      return;
    }
    const form =
      field('Tiêu đề', 'title', row.title, { required: true }) +
      field('Workspace', 'workspaceId', workspaceId, {
        options: options(availableWorkspaces),
        required: true,
      }) +
      '<div id="meeting-project"></div>' +
      '<div class="field-grid">' +
      field('Bắt đầu', 'startAt', row.startAt || date + 'T' + timeLabel(startingMinute), {
        type: 'datetime-local',
        required: true,
        step: 900,
      }) +
      field(
        'Kết thúc',
        'endAt',
        row.endAt ||
          (startingMinute + 60 < 1440
            ? date + 'T' + timeLabel(startingMinute + 60)
            : shift(date, 1) + 'T' + timeLabel(startingMinute + 60 - 1440)),
        { type: 'datetime-local', required: true, step: 900 },
      ) +
      '</div>' +
      field('Link họp online', 'onlineUrl', row.onlineUrl, {
        type: 'url',
        placeholder: 'https://…',
      }) +
      field('Mô tả', 'description', row.description, { type: 'textarea' }) +
      '<fieldset><legend>Người tham dự</legend><div id="attendees"></div></fieldset><div id="meeting-busy" class="muted"></div><button class="btn sm" type="button" id="meeting-free">Tìm giờ trống</button>';
    show(row.id ? 'Chỉnh sửa cuộc họp' : raw('calendar.book'), form, {
      glyph: 'calendar_add_on',
      wide: true,
      submit: (values, formNode) => {
        MockApi.saveMeeting(
          { ...values, attendeeIds: new FormData(formNode).getAll('attendee') },
          row.id,
        );
        refresh(row.id ? 'Đã cập nhật lịch họp.' : 'Đã đặt lịch họp.');
      },
    });
    const update = (selectedId) => {
      const workspace = byId(data, 'workspaces', selectedId);
      D.dialog.querySelector('#meeting-project').innerHTML = field(
        'Dự án',
        'projectId',
        row.projectId,
        {
          options: [
            ['', 'Không chọn'],
            ...options(data.projects.filter((item) => item.workspaceId === selectedId)),
          ],
        },
      );
      D.dialog.querySelector('#attendees').innerHTML =
        data.employees
          .filter((row) => workspace?.memberIds.includes(row.id) && row.id !== data.currentUserId)
          .map(
            (employee) =>
              '<label class="form-check"><input type="checkbox" name="attendee" value="' +
              h(employee.id) +
              '"' +
              (row.attendeeIds?.includes(employee.id) ? ' checked' : '') +
              '>' +
              h(employee.fullName) +
              '</label>',
          )
          .join('') || '<p class="muted">Workspace chưa có thành viên khác.</p>';
    };
    const node = D.dialog.querySelector('form');
    const busy = (values, start, end) => {
      const ids = new Set([data.currentUserId, ...values.getAll('attendee')]);
      return data.meetings.filter(
        (other) =>
          other.id !== row.id &&
          other.startAt < end &&
          other.endAt > start &&
          (ids.has(other.organizerId) || other.attendeeIds.some((id) => ids.has(id))),
      );
    };
    const updateBusy = () => {
      const values = new FormData(node);
      const results = busy(values, values.get('startAt'), values.get('endAt'));
      node.querySelector('#meeting-busy').innerHTML = results.length
        ? '<p class="form-error">Trùng lịch · ' +
          results
            .map((item) => h(item.title + ' ' + time(item.startAt) + '–' + time(item.endAt)))
            .join(', ') +
          '</p>'
        : '<p>Giờ hành chính 07:00–21:00 · Chưa phát hiện trùng lịch trong dữ liệu demo.</p>';
    };
    update(workspaceId);
    D.dialog
      .querySelector('[name="workspaceId"]')
      .addEventListener('change', (event) => update(event.target.value));
    node.addEventListener('change', updateBusy);
    node.querySelector('#meeting-free').onclick = () => {
      const values = new FormData(node);
      const day = String(values.get('startAt') || date).slice(0, 10);
      const length = Math.max(
        15,
        Math.round((new Date(values.get('endAt')) - new Date(values.get('startAt'))) / 60000) || 60,
      );
      for (let minutes = 420; minutes + length <= 1260; minutes += 15) {
        const start = day + 'T' + timeLabel(minutes);
        const end = day + 'T' + timeLabel(minutes + length);
        if (!busy(values, start, end).length) {
          node.elements.startAt.value = start;
          node.elements.endAt.value = end;
          updateBusy();
          return;
        }
      }
      node.querySelector('#meeting-busy').textContent =
        'Chưa tìm được giờ trống trong ngày đã chọn.';
    };
    updateBusy();
  }
  function meetingDetail(id) {
    const data = MockApi.snapshot();
    const row = byId(data, 'meetings', id);
    if (!row) return;
    const organizer = row.organizerId === data.currentUserId;
    show(
      row.title,
      '<p class="muted">' +
        fmtDate(row.startAt) +
        ' · ' +
        time(row.startAt) +
        '–' +
        time(row.endAt) +
        '</p><p class="pre-wrap">' +
        h(row.description) +
        '</p>' +
        '<dl class="details"><dt>Người tổ chức</dt><dd>' +
        h(person(data, row.organizerId)?.fullName) +
        '</dd><dt>Workspace</dt><dd>' +
        h(byId(data, 'workspaces', row.workspaceId)?.name) +
        '</dd><dt>Dự án</dt><dd>' +
        h(byId(data, 'projects', row.projectId)?.name || '—') +
        '</dd><dt>Người tham dự</dt><dd>' +
        h(row.attendeeIds.map((id) => person(data, id)?.fullName).join(', ') || '—') +
        '</dd></dl><div class="row-actions">' +
        link('meetings/' + row.id + '/room', 'Vào phòng họp', 'videocam', 'btn primary') +
        (/^https?:\/\//i.test(row.onlineUrl || '')
          ? '<a class="btn" href="' +
            h(row.onlineUrl) +
            '" target="_blank" rel="noopener">' +
            icon('open_in_new') +
            'Mở link họp</a>'
          : '') +
        (organizer
          ? act(
              'meetingForm|' + row.startAt.slice(0, 10) + '|' + row.id,
              raw('common.edit'),
              'edit',
            ) + act('deleteMeeting|' + row.id, raw('common.delete'), 'delete', 'btn danger')
          : row.attendeeIds.includes(data.currentUserId)
            ? act('meetingReply|' + id + '|Accepted|detail', raw('calendar.accept'), 'check') +
              act('meetingReply|' + id + '|Declined|detail', raw('calendar.decline'), 'close')
            : '') +
        '</div>',
      { glyph: 'event' },
    );
  }

  function timeline(data) {
    const anchor = state.view.ganttDate || today();
    const duration = Number(state.view.ganttSize) || 21;
    const dates = datesBetween(shift(anchor, -5), duration);
    const all = data.tasks.filter(
      (task) => !state.view.ganttMine || task.assigneeId === data.currentUserId,
    );
    const inProgress = all.filter((row) => row.status === 'InProgress').length;
    const overdue = all.filter(
      (row) => row.status !== 'Done' && row.dueDate && row.dueDate < today(),
    ).length;
    const projects = data.projects.filter(
      (row) => !state.view.ganttWorkspace || state.view.ganttWorkspace === row.workspaceId,
    );
    const toolbar =
      '<div class="toolbar">' +
      tabs(
        'ganttSize',
        [
          ['14', 'Ngày', 'today'],
          ['21', 'Tuần', 'calendar_view_week'],
          ['35', 'Tháng', 'calendar_month'],
        ],
        String(duration),
      ) +
      filter('ganttWorkspace', 'Workspace', [
        ['', 'Tất cả workspace'],
        ...options(data.workspaces),
      ]) +
      act(
        'ganttMine',
        'Chỉ việc của tôi',
        'person',
        'btn sm' + (state.view.ganttMine ? ' selected' : ''),
      ) +
      filter('ganttStatus', 'Trạng thái', [
        ['', 'Tất cả trạng thái'],
        ...statuses.map((status) => [status, raw('tasks.status.' + status)]),
      ]) +
      '<span class="spacer"></span>' +
      iconBtn('ganttShift|-1', 'Giai đoạn trước', 'chevron_left') +
      act('view|ganttDate|' + today(), raw('common.today'), '', 'btn sm') +
      iconBtn('ganttShift|1', 'Giai đoạn sau', 'chevron_right') +
      '</div>';
    let lines =
      '<div class="gantt-label head">Dự án / công việc</div>' +
      dates
        .map(
          (date) =>
            '<div class="gantt-day' +
            (date === today() ? ' today' : '') +
            '">' +
            shortDate(date) +
            '</div>',
        )
        .join('');
    let line = 1;
    for (const project of projects) {
      const rows = all.filter(
        (task) =>
          task.projectId === project.id &&
          (!state.view.ganttStatus || state.view.ganttStatus === task.status),
      );
      lines +=
        '<div class="gantt-group" style="grid-column:1/-1;grid-row:' +
        ++line +
        '">' +
        link('projects/' + project.id, project.key + ' · ' + project.name, '', '') +
        ' ' +
        chip(rows.length + ' công việc') +
        '</div>';
      for (const meeting of data.meetings.filter((row) => row.projectId === project.id)) {
        const column = dates.indexOf(meeting.startAt.slice(0, 10));
        if (column < 0) continue;
        lines +=
          '<button class="gantt-meeting" type="button" data-act="meeting|' +
          h(meeting.id) +
          '" style="grid-row:' +
          line +
          ';grid-column:' +
          (column + 2) +
          '" title="' +
          h(meeting.title + ' · ' + time(meeting.startAt)) +
          '" aria-label="' +
          h(meeting.title) +
          '">' +
          icon('event') +
          '</button>';
      }
      for (const task of rows) {
        line++;
        lines +=
          '<button type="button" class="gantt-label" style="grid-row:' +
          line +
          ';grid-column:1" data-act="task|' +
          h(task.id) +
          '">' +
          h(task.code) +
          ' · ' +
          h(task.title) +
          '</button><div class="gantt-band" style="grid-row:' +
          line +
          ';grid-column:2/-1"></div>';
        const start = dates.findIndex((value) => value >= (task.startDate || task.dueDate));
        const end = dates.findLastIndex((value) => value <= (task.dueDate || task.startDate));
        if ((task.startDate || task.dueDate) && start >= 0 && end >= start) {
          lines +=
            '<button type="button" class="gantt-bar" draggable="true" data-gantt-task="' +
            h(task.id) +
            '" data-act="task|' +
            h(task.id) +
            '" title="' +
            h(task.title + ' · ' + fmtDate(task.startDate) + ' – ' + fmtDate(task.dueDate)) +
            '" style="--bar-color:' +
            h(project.color) +
            ';grid-row:' +
            line +
            ';grid-column:' +
            (start + 2) +
            '/' +
            (end + 3) +
            '">' +
            h(task.code) +
            ' · ' +
            task.progress +
            '%</button>';
        }
      }
    }
    return (
      header(
        raw('timeline.title'),
        'Toàn cảnh mọi dự án trên một dòng thời gian. Kéo thanh để dời lịch hoặc mở công việc để chỉnh ngày.',
      ) +
      stats([
        stat('Dự án · ' + all.length + ' công việc', data.projects.length, 'folder_open', 'indigo'),
        stat(raw('timeline.stats.inProgress'), inProgress, 'pending', 'amber'),
        stat(raw('timeline.stats.overdue'), overdue, 'event_busy', 'rose'),
        stat('Tiến độ trung bình', progressOf(all) + '%', 'task_alt', 'emerald'),
      ]) +
      toolbar +
      (projects.length
        ? '<div class="gantt-scroll"><div class="gantt" style="--days:' +
          duration +
          '">' +
          lines +
          '</div></div>'
        : panel(placeholder('Chưa có dự án.', 'view_timeline')))
    );
  }

  function myWork(data) {
    const rows = data.tasks.filter(
      (task) =>
        task.assigneeId === data.currentUserId &&
        (!state.view.mineProject || task.projectId === state.view.mineProject) &&
        matches(state.view.mineQuery, task.title, task.code),
    );
    return (
      header(raw('myWork.title'), raw('myWork.subtitle')) +
      '<div class="toolbar">' +
      searchField('mineQuery', raw('myWork.search')) +
      filter('mineProject', 'Dự án', [['', raw('myWork.allProjects')], ...options(data.projects)]) +
      '</div>' +
      taskList(data, '', rows)
    );
  }
  function weekly(data) {
    const anchor = state.view.weekDate || today();
    const dates = datesBetween(monday(anchor), 7);
    const rows = data.tasks.filter(
      (row) =>
        row.dueDate >= dates[0] &&
        row.dueDate <= dates[6] &&
        matches(state.view.weekQuery, row.title, row.code, person(data, row.assigneeId)?.fullName),
    );
    return (
      header(raw('weekly.title'), raw('weekly.subtitle')) +
      '<div class="toolbar">' +
      iconBtn('weekShift|-1', 'Tuần trước', 'chevron_left') +
      '<strong>' +
      shortDate(dates[0]) +
      ' – ' +
      fmtDate(dates[6]) +
      '</strong>' +
      iconBtn('weekShift|1', 'Tuần sau', 'chevron_right') +
      act('view|weekDate|' + today(), 'Tuần này', '', 'btn sm') +
      searchField('weekQuery', 'Tìm công việc hoặc thành viên') +
      '</div>' +
      panel(
        table(
          ['Thành viên', ...dates.map(shortDate)],
          data.employees.map((row) => [
            '<div class="person-cell">' + avatar(row.fullName, 'sm') + h(row.fullName) + '</div>',
            ...dates.map(
              (date) =>
                rows
                  .filter((task) => task.dueDate === date && task.assigneeId === row.id)
                  .map((task) => act('task|' + task.id, task.code, '', 'btn sm'))
                  .join(' ') || '<span class="muted">—</span>',
            ),
          ]),
        ),
      )
    );
  }
  function workload(data) {
    return (
      header(raw('nav.workload'), 'Khối lượng công việc và giờ làm theo thành viên.') +
      '<div class="toolbar">' +
      searchField('loadQuery', 'Tìm thành viên…') +
      filter('loadProject', 'Dự án', [['', 'Tất cả dự án'], ...options(data.projects)]) +
      '</div>' +
      panel(
        table(
          ['Thành viên', 'Cần làm', 'Đang làm', 'Hoàn thành', 'Giờ đã ghi'],
          data.employees
            .filter((row) => matches(state.view.loadQuery, row.fullName, row.jobTitle))
            .map((row) => {
              const rows = data.tasks.filter(
                (task) =>
                  task.assigneeId === row.id &&
                  (!state.view.loadProject || task.projectId === state.view.loadProject),
              );
              const logRows = data.worklogs.filter(
                (log) =>
                  log.userId === row.id &&
                  (!state.view.loadProject ||
                    projectFor(data, byId(data, 'tasks', log.taskId))?.id ===
                      state.view.loadProject),
              );
              return [
                '<div class="person-cell">' +
                  avatar(row.fullName, 'sm') +
                  h(row.fullName) +
                  '</div>',
                ...statuses.map((status) =>
                  chip(
                    rows.filter((task) => task.status === status).length,
                    status === 'Done' ? 'emerald' : 'indigo',
                  ),
                ),
                hours(logRows.reduce((sum, log) => sum + log.minutes, 0)),
              ];
            }),
        ),
      )
    );
  }
  Object.assign(views, {
    '': home,
    workspaces: (data, id) => (id ? workspaceDetail(data, id) : workspaceList(data)),
    projects: projectDetail,
    'my-work': myWork,
    weekly,
    workload,
    timeline,
    calendar,
    meetings: (data, id) => {
      const item = byId(data, 'meetings', id);
      return (
        header(
          item?.title || 'Phòng họp',
          'Phòng họp TeamFlow',
          link('calendar', 'Về lịch', 'edit_calendar'),
        ) +
        panel(
          placeholder(
            'Phòng họp ở chế độ xem thử. Video, âm thanh, phòng chờ và ghi hình LiveKit cần máy chủ.',
            'videocam_off',
          ),
        )
      );
    },
  });
  Object.assign(D.labels, {
    '': 'nav.overview',
    workspaces: 'nav.workspaces',
    projects: 'projects.detail.tasksTab',
    'my-work': 'nav.myWork',
    weekly: 'nav.weekly',
    workload: 'nav.workload',
    timeline: 'nav.timeline',
    calendar: 'nav.calendar',
  });
  Object.assign(actions, {
    workspaceForm: (id) => workspaceForm(typeof id === 'string' ? id : ''),
    projectForm: (workspaceId, id) => projectForm(workspaceId, typeof id === 'string' ? id : ''),
    addMember: (id) => {
      const data = MockApi.snapshot();
      const workspace = byId(data, 'workspaces', id);
      show(
        'Thêm thành viên',
        field('Nhân viên', 'employee', '', {
          options: empOptions(
            data,
            data.employees
              .filter((row) => !workspace.memberIds.includes(row.id))
              .map((row) => row.id),
            'Chọn nhân viên',
          ),
          required: true,
        }),
        {
          glyph: 'person_add',
          submit: (values) => {
            MockApi.addMember(id, values.employee);
            refresh('Đã thêm thành viên.');
          },
        },
      );
    },
    homeFilter: (value) => {
      state.view.home = state.view.home === value ? '' : value;
      render();
    },
    taskStatus: (status) => {
      state.view.taskStatus = state.view.taskStatus === status ? '' : status;
      render();
    },
    taskMine: () => {
      state.view.taskMine = !state.view.taskMine;
      render();
    },
    taskGroup: (status) => {
      state.view['group' + status] = !state.view['group' + status];
      render();
    },
    newTask: (projectId, status) =>
      taskForm(projectId, typeof status === 'string' ? status : 'Todo'),
    editTask: (projectId, id) => taskForm(projectId, '', id),
    taskProgress: (id) => {
      const task = byId(MockApi.snapshot(), 'tasks', id);
      show(
        'Cập nhật tiến độ',
        field('Tiến độ (%)', 'progress', task.progress, {
          type: 'number',
          min: 0,
          max: 100,
          required: true,
        }),
        {
          submit: (values) => {
            MockApi.progress(id, values.progress);
            refresh('Đã cập nhật tiến độ.');
          },
        },
      );
    },
    deleteTask: (id) =>
      confirm(
        'Xóa công việc?',
        'Công việc sẽ bị xóa khỏi bản demo.',
        () => {
          MockApi.deleteTask(id);
          refresh('Đã xóa công việc.');
        },
        'Xóa',
      ),
    deleteFile: (id) =>
      confirm(
        'Xóa tài liệu?',
        'Tài liệu sẽ bị xóa khỏi dữ liệu demo.',
        () => {
          MockApi.deleteFile(id);
          refresh('Đã xóa tài liệu.');
        },
        'Xóa',
      ),
    calendarShift: (delta) => {
      const date = state.view.calendarDate || today();
      state.view.calendarDate =
        state.view.calendarMode === 'month'
          ? monthStep(date, Number(delta))
          : shift(date, Number(delta) * 7);
      render();
    },
    meetingForm: (date, id) =>
      meetingForm(typeof date === 'string' ? date : today(), typeof id === 'string' ? id : ''),
    meeting: meetingDetail,
    meetingReply: (id, response, context) => {
      MockApi.respondMeeting(id, response);
      refresh(response === 'Accepted' ? 'Đã nhận lời.' : 'Đã từ chối lời mời.');
      if (context === 'detail') meetingDetail(id);
    },
    deleteMeeting: (id) =>
      confirm(
        'Hủy cuộc họp?',
        'Cuộc họp sẽ được xóa khỏi lịch demo.',
        () => {
          MockApi.deleteMeeting(id);
          refresh('Đã hủy cuộc họp.');
        },
        'Hủy cuộc họp',
      ),
    ganttShift: (delta) => {
      state.view.ganttDate = shift(state.view.ganttDate || today(), Number(delta) * 7);
      render();
    },
    weekShift: (delta) => {
      state.view.weekDate = shift(state.view.weekDate || today(), Number(delta) * 7);
      render();
    },
  });
  let dragging;
  document.addEventListener('dragstart', (event) => {
    const card = event.target.closest('[data-drag-task]');
    const gantt = event.target.closest('[data-gantt-task]');
    if (!card && !gantt) return;
    const bounds = gantt?.getBoundingClientRect();
    dragging = card
      ? { id: card.dataset.dragTask }
      : {
          id: gantt.dataset.ganttTask,
          gantt: true,
          start: event.clientX,
          edge:
            bounds.width > 30 && event.clientX < bounds.left + 7
              ? 'start'
              : bounds.width > 30 && event.clientX > bounds.right - 7
                ? 'end'
                : 'move',
          cell: gantt.closest('.gantt').querySelector('.gantt-day').offsetWidth,
        };
    event.dataTransfer.setData('text/plain', dragging.id);
    event.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', (event) => {
    if (!dragging) return;
    const target = event.target.closest(dragging.gantt ? '.gantt' : '[data-drop-status]');
    if (!target) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!dragging.gantt) {
      document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
      target.classList.add('drag-over');
    }
  });
  document.addEventListener('drop', (event) => {
    if (!dragging) return;
    try {
      const column = event.target.closest('[data-drop-status]');
      const gantt = event.target.closest('.gantt');
      if (column && !dragging.gantt) {
        event.preventDefault();
        MockApi.moveTask(
          dragging.id,
          column.dataset.dropStatus,
          event.target.closest('[data-drag-task]')?.dataset.dragTask,
        );
        refresh('Đã cập nhật trạng thái công việc.');
      } else if (gantt && dragging.gantt) {
        event.preventDefault();
        const offset = Math.round((event.clientX - dragging.start) / Math.max(1, dragging.cell));
        if (!offset) return;
        const task = byId(MockApi.snapshot(), 'tasks', dragging.id);
        MockApi.saveTask(
          {
            ...task,
            startDate:
              task.startDate && dragging.edge !== 'end'
                ? shift(task.startDate, offset)
                : task.startDate,
            dueDate:
              task.dueDate && dragging.edge !== 'start'
                ? shift(task.dueDate, offset)
                : task.dueDate,
          },
          task.id,
        );
        refresh('Đã dời lịch công việc.');
      }
    } catch (error) {
      D.showToast(error.message, true);
    } finally {
      dragging = null;
      document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
    }
  });
  document.addEventListener('dragend', () => {
    dragging = null;
    document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('[data-drag-task]') && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.target.click();
    }
  });
  document.addEventListener('click', (event) => {
    const day = event.target.closest('[data-meeting-day]');
    if (!day || event.target.closest('[data-act]')) return;
    const minutes = ((event.clientY - day.getBoundingClientRect().top) * 60) / hourHeight;
    meetingForm(
      day.dataset.meetingDay,
      '',
      Math.min(1425, Math.max(0, Math.floor(minutes / 15) * 15)),
    );
  });
  Object.assign(D, {
    empOptions,
    options,
    shortDate,
    dateFields,
    dayGrid,
    monthStep,
    monthName,
    taskList,
    projectTile,
    datesBetween,
    taskForm,
  });
})();
