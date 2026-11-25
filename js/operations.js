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
    act,
    iconBtn,
    avatar,
    byId,
    person,
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
    confirm,
    refresh,
    render,
    go,
    today,
    monthStep,
    monthName,
    empOptions,
    options,
  } = D;
  const statusTone = (status) =>
    ['Done', 'Approved', 'Available', 'Finalized', 'Ok'].includes(status)
      ? 'emerald'
      : ['Rejected', 'Lost', 'Over', 'Cancelled'].includes(status)
        ? 'rose'
        : ['Pending', 'SelfPending', 'InRepair', 'Warning'].includes(status)
          ? 'amber'
          : 'indigo';
  const statusTag = (prefix, status) =>
    chip(raw(prefix + '.status.' + status) || status, statusTone(status));
  const department = (data, id) => byId(data, 'departments', id)?.name || '—';
  const empName = (data, id) => person(data, id)?.fullName || '—';
  const lookupTask = (data, id) => byId(data, 'tasks', id);
  const accountCell = (data, personId, interactive = true) => {
    const employee = person(data, personId);
    return employee
      ? '<div class="person-cell">' +
          avatar(employee.fullName, 'sm') +
          '<div>' +
          (interactive
            ? act('employee|' + employee.id, employee.fullName, '', 'plain-button')
            : '<strong>' + h(employee.fullName) + '</strong>') +
          (employee.jobTitle ? '<small>' + h(employee.jobTitle) + '</small>' : '') +
          '</div></div>'
      : '—';
  };
  const definitions = (rows) =>
    '<dl class="details">' +
    rows.map(([term, value]) => '<dt>' + h(term) + '</dt><dd>' + value + '</dd>').join('') +
    '</dl>';
  const actionsRow = (body) => '<div class="row-actions">' + body + '</div>';
  const errorPage = (title, route, label) => header(title, '', link(route, label, 'arrow_back'));
  const logTask = (data, log) => {
    const task = lookupTask(data, log.taskId);
    return task ? act('task|' + task.id, task.code + ' · ' + task.title, '', 'plain-button') : '—';
  };
  const monthToolbar = (name, date) =>
    '<div class="row-actions">' +
    iconBtn('shiftMonth|' + name + '|-1', 'Tháng trước', 'chevron_left') +
    '<strong>' +
    monthName(date) +
    '</strong>' +
    iconBtn('shiftMonth|' + name + '|1', 'Tháng sau', 'chevron_right') +
    (date.slice(0, 7) === today().slice(0, 7)
      ? ''
      : act('view|' + name + '|' + today(), raw('worklogs.thisMonth'), '', 'btn sm')) +
    '</div>';
  const rowsInMonth = (rows, date) =>
    rows.filter((row) => row.workDate.startsWith(date.slice(0, 7)));
  const sumMinutes = (rows) => rows.reduce((sum, row) => sum + row.minutes, 0);

  function logForm(date, taskId, logId) {
    const data = MockApi.snapshot();
    const row = byId(data, 'worklogs', logId) || {};
    const projects = new Set(
      data.projects
        .filter((project) =>
          byId(data, 'workspaces', project.workspaceId)?.memberIds.includes(data.currentUserId),
        )
        .map((project) => project.id),
    );
    const taskOptions = data.tasks
      .filter((task) => projects.has(task.projectId))
      .map((task) => [task.id, task.code + ' · ' + task.title]);
    show(
      row.id ? 'Chỉnh sửa giờ làm' : raw('worklogs.add'),
      field('Công việc', 'taskId', row.taskId || taskId, {
        options: [['', 'Chọn công việc'], ...taskOptions],
        required: true,
      }) +
        '<div class="field-grid">' +
        field('Ngày làm việc', 'workDate', row.workDate || date || today(), {
          type: 'date',
          required: true,
          max: today(),
        }) +
        field('Thời lượng', 'minutes', row.minutes ? row.minutes + 'm' : '1h', {
          required: true,
          placeholder: '1h30, 45m, 1:30…',
        }) +
        '</div>' +
        '<div class="toolbar">' +
        ['30m', '1h', '2h', '4h', '8h']
          .map((value) => act('logPreset|' + value, value, '', 'btn sm'))
          .join('') +
        '</div>' +
        field('Ghi chú', 'note', row.note, { type: 'textarea' }),
      {
        glyph: 'more_time',
        submitLabel: 'Gửi duyệt',
        submit: (values) => {
          MockApi.saveWorklog({ ...values, minutes: D.parseDuration(values.minutes) }, row.id);
          refresh('Đã ghi giờ làm và chuyển sang chờ duyệt.');
        },
      },
    );
  }
  function logDetail(id) {
    const data = MockApi.snapshot();
    const row = byId(data, 'worklogs', id);
    if (!row) return;
    const own = row.userId === data.currentUserId;
    show(
      'Giờ làm đã ghi',
      definitions([
        ['Công việc', logTask(data, row)],
        ['Nhân viên', h(empName(data, row.userId))],
        ['Ngày', fmtDate(row.workDate)],
        ['Thời lượng', hours(row.minutes)],
        ['Trạng thái', statusTag('worklogs', row.status)],
        ['Ghi chú', h(row.note || '—')],
        ...(row.reason ? [['Lý do từ chối', h(row.reason)]] : []),
      ]) +
        (own && row.status !== 'Approved'
          ? actionsRow(
              act(
                'editLog|' + id,
                row.status === 'Rejected' ? 'Sửa và gửi lại' : raw('common.edit'),
                'edit',
                'btn primary',
              ) + act('logRemove|' + id, 'Xóa giờ làm', 'delete', 'btn danger'),
            )
          : ''),
      { glyph: 'schedule' },
    );
  }
  function approveControls(key, row) {
    return row.status !== 'Pending'
      ? '<span class="muted">' + h(row.reason || '') + '</span>'
      : actionsRow(
          state.route === 'worklogs'
            ? iconBtn('approve|' + key + '|' + row.id, 'Duyệt', 'check', 'review-approve') +
                iconBtn('reject|' + key + '|' + row.id, 'Từ chối', 'close', 'review-reject')
            : act('approve|' + key + '|' + row.id, 'Duyệt', 'check', 'btn sm') +
                act('reject|' + key + '|' + row.id, 'Từ chối', 'close', 'btn sm danger'),
        );
  }
  function logReview(data, date) {
    const rows = rowsInMonth(data.worklogs, date).filter(
      (row) =>
        MockApi.canReview(data, row.userId) &&
        (!state.view.reviewStatus || row.status === state.view.reviewStatus) &&
        (!state.view.reviewPerson || row.userId === state.view.reviewPerson) &&
        (!state.view.reviewProject ||
          lookupTask(data, row.taskId)?.projectId === state.view.reviewProject) &&
        (!state.view.reviewWorkspace ||
          byId(data, 'projects', lookupTask(data, row.taskId)?.projectId)?.workspaceId ===
            state.view.reviewWorkspace) &&
        matches(
          state.view.reviewQuery,
          empName(data, row.userId),
          lookupTask(data, row.taskId)?.title,
        ),
    );
    const page = paginate('reviewPage', rows);
    return (
      '<div class="toolbar">' +
      filter('reviewWorkspace', 'Workspace', [
        ['', 'Tất cả workspace'],
        ...options(data.workspaces),
      ]) +
      filter('reviewProject', 'Dự án', [['', 'Tất cả dự án'], ...options(data.projects)]) +
      filter('reviewPerson', 'Nhân viên', empOptions(data, undefined, 'Tất cả nhân viên')) +
      searchField('reviewQuery', 'Tìm nhân viên hoặc công việc…') +
      filter('reviewStatus', 'Trạng thái', [
        ['', 'Tất cả trạng thái'],
        ...['Pending', 'Approved', 'Rejected'].map((status) => [
          status,
          raw('worklogs.status.' + status),
        ]),
      ]) +
      (state.view.logSelection?.size
        ? act(
            'logApproveSelected',
            'Duyệt ' + state.view.logSelection.size + ' mục',
            'check',
            'btn primary',
          )
        : '') +
      '</div>' +
      panel(
        table(
          ['Chọn', 'Nhân viên', 'Công việc', 'Ngày', 'Thời lượng', 'Trạng thái', 'Thao tác'],
          page.rows.map((row) => [
            row.status === 'Pending'
              ? '<input type="checkbox" aria-label="Chọn giờ làm của ' +
                h(empName(data, row.userId)) +
                '" data-act="logSelect|' +
                h(row.id) +
                '"' +
                (state.view.logSelection?.has(row.id) ? ' checked' : '') +
                '>'
              : '—',
            accountCell(data, row.userId),
            logTask(data, row),
            fmtDate(row.workDate),
            h(hours(row.minutes)),
            statusTag('worklogs', row.status),
            approveControls('worklogs', row),
          ]),
          'Không có giờ làm trong kỳ này.',
        ) + page.foot,
      )
    );
  }
  function reportRows(data, date) {
    const scope = state.view.reportScope || 'mine';
    const visible = data.projects.filter((project) =>
      ['Owner', 'Admin', 'Manager'].includes(
        D.roleOf(byId(data, 'workspaces', project.workspaceId), data.currentUserId),
      ),
    );
    return rowsInMonth(data.worklogs, date).filter((row) => {
      const projectId = lookupTask(data, row.taskId)?.projectId;
      if (scope === 'workspace')
        return visible.some(
          (project) =>
            project.id === projectId &&
            (!state.view.reportWorkspace || project.workspaceId === state.view.reportWorkspace) &&
            ['Owner', 'Admin'].includes(
              D.roleOf(byId(data, 'workspaces', project.workspaceId), data.currentUserId),
            ),
        );
      if (scope === 'project')
        return visible.some(
          (project) =>
            project.id === projectId &&
            (!state.view.reportProject || project.id === state.view.reportProject),
        );
      return row.userId === data.currentUserId;
    });
  }
  function logReport(data, date, timesheet) {
    if (timesheet) return D.timesheet(data, date, monthToolbar);
    const rows = reportRows(data, date);
    const scope = state.view.reportScope || 'mine';
    const allowed = data.workspaces.filter((ws) =>
      ['Owner', 'Admin'].includes(D.roleOf(ws, data.currentUserId)),
    );
    const projects = data.projects.filter((project) =>
      ['Owner', 'Admin', 'Manager'].includes(
        D.roleOf(byId(data, 'workspaces', project.workspaceId), data.currentUserId),
      ),
    );
    const states = ['Approved', 'Pending', 'Rejected'];
    const aggregate = (list, key) =>
      states.map((status) =>
        sumMinutes(rows.filter((log) => log[key] === list && log.status === status)),
      );
    const list = (title, entries, label, key) =>
      panel(
        '<h2>' +
          h(title) +
          '</h2>' +
          table(
            [title, 'Đã duyệt', 'Chờ duyệt', 'Bị từ chối'],
            entries.map((item) => [
              label(item),
              ...aggregate(item, key).map((value) => h(hours(value))),
            ]),
            'Chưa có giờ làm.',
          ),
      );
    const period = D.datesBetween(date.slice(0, 7) + '-01', 31).filter((day) =>
      day.startsWith(date.slice(0, 7)),
    );
    const daily = period.map((day) =>
      ['Approved', 'Pending'].map((status) =>
        sumMinutes(rows.filter((row) => row.workDate === day && row.status === status)),
      ),
    );
    const ceiling = Math.max(1, ...daily.map(([approved, pending]) => approved + pending));
    return (
      '<div class="toolbar">' +
      filter('reportScope', 'Phạm vi', [
        ['mine', 'Cá nhân của tôi'],
        ...(allowed.length ? [['workspace', 'Toàn workspace']] : []),
        ...(projects.length ? [['project', 'Theo dự án']] : []),
      ]) +
      (scope === 'workspace'
        ? filter('reportWorkspace', 'Workspace', [['', 'Tất cả workspace'], ...options(allowed)])
        : scope === 'project'
          ? filter('reportProject', 'Dự án', [['', 'Tất cả dự án'], ...options(projects)])
          : '') +
      '<span class="spacer"></span>' +
      act('exportReport|' + date, 'Xuất CSV', 'download') +
      '</div>' +
      stats(
        states.map((status, i) =>
          stat(
            raw('worklogs.status.' + status),
            hours(sumMinutes(rows.filter((row) => row.status === status))),
            ['check_circle', 'schedule', 'cancel'][i],
            ['emerald', 'amber', 'rose'][i],
          ),
        ),
      ) +
      panel(
        '<div class="report-chart-head"><h2>Theo ngày</h2><div class="report-legend">' +
          '<span>' +
          t('worklogs.status.Approved') +
          '</span><span>' +
          t('worklogs.status.Pending') +
          '</span></div></div><div class="report-axis">' +
          daily
            .map(
              ([approved, pending], i) =>
                '<div title="' +
                h(fmtDate(period[i]) + ' · ' + hours(approved + pending)) +
                '"><div class="report-day-stack"><i style="height:' +
                (approved * 100) / ceiling +
                '%"></i><i style="height:' +
                (pending * 100) / ceiling +
                '%"></i></div><small>' +
                (i + 1) +
                '</small></div>',
            )
            .join('') +
          '</div>',
      ) +
      list(
        'Công việc',
        [...new Set(rows.map((row) => row.taskId))],
        (id) => {
          const task = lookupTask(data, id);
          return act('task|' + id, task?.code + ' · ' + task?.title, '', 'plain-button');
        },
        'taskId',
      ) +
      list(
        'Nhân viên',
        [...new Set(rows.map((row) => row.userId))],
        (id) => accountCell(data, id),
        'userId',
      )
    );
  }
  function worklogMonth(data, date) {
    const month = date.slice(0, 7);
    const first = D.monday(month + '-01');
    const dates = D.datesBetween(first, 42);
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const logs = data.worklogs.filter(
      (row) =>
        row.userId === data.currentUserId && row.workDate >= first && row.workDate <= dates.at(-1),
    );
    const weeks = Array.from({ length: 6 }, (_, i) => dates.slice(i * 7, i * 7 + 7));
    const renderLog = (log) => {
      const task = lookupTask(data, log.taskId);
      const project = byId(data, 'projects', task?.projectId);
      return (
        '<button type="button" class="pill pill--' +
        h(log.status) +
        '" data-act="logDetail|' +
        h(log.id) +
        '" title="' +
        h(task?.title || '') +
        '"><span class="pill__bar" style="background:' +
        h(project?.color || '#6366f1') +
        '"></span><span class="pill__code">' +
        h(task?.code || '—') +
        '</span><span class="pill__time">' +
        h(hours(log.minutes)) +
        '</span></button>'
      );
    };
    return (
      '<div class="worklog-month-reference"><div class="month"><div class="month__head">' +
      days.map((day) => '<span>' + day + '</span>').join('') +
      '<span class="month__total-head">Tuần</span></div>' +
      weeks
        .map((week, index) => {
          const items = logs.filter((row) => week.includes(row.workDate));
          const total = sumMinutes(items.filter((row) => row.status !== 'Rejected'));
          return (
            '<div class="week">' +
            week
              .map((day, col) => {
                const current = items.filter((row) => row.workDate === day);
                const active = current.filter((row) => row.status !== 'Rejected');
                const minutes = sumMinutes(active);
                const pending = active.some((row) => row.status === 'Pending');
                const expanded = state.view.expandedLogDay === day;
                const classes = [
                  'cell',
                  day === today() && 'cell--today',
                  day > today() && 'cell--future',
                  !day.startsWith(month) && 'cell--outside',
                  expanded && 'cell--expanded',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  '<div class="' +
                  classes +
                  '" style="--i:' +
                  (index * 7 + col) +
                  '"><div class="cell__top"><span class="cell__date">' +
                  Number(day.slice(-2)) +
                  '</span>' +
                  (minutes
                    ? '<span class="cell__sum' +
                      (pending ? ' cell__sum--pending' : '') +
                      '">' +
                      h(hours(minutes)) +
                      '</span>'
                    : '') +
                  (day <= today()
                    ? '<button type="button" class="cell__add" data-act="logForm|' +
                      day +
                      '" aria-label="Log work ngày ' +
                      h(day) +
                      '">' +
                      icon('add') +
                      '</button>'
                    : '') +
                  '</div>' +
                  (expanded ? current : current.slice(0, 3)).map(renderLog).join('') +
                  (current.length > 3
                    ? act(
                        'toggleLogDay|' + day,
                        expanded ? 'Thu gọn' : '+ ' + (current.length - 3) + ' log',
                        '',
                        'more',
                      )
                    : '') +
                  '</div>'
                );
              })
              .join('') +
            '<div class="total' +
            (total ? '' : ' total--empty') +
            '"><strong>' +
            h(hours(total).slice(0, -1)) +
            '</strong><small>giờ</small></div></div>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }
  function worklogs(data) {
    const tab = state.view.logTab || 'mine';
    const date = state.view.logMonth || today();
    const userLogs = rowsInMonth(data.worklogs, date).filter(
      (row) => row.userId === data.currentUserId,
    );
    const toolbar =
      '<div class="toolbar">' +
      tabs(
        'logTab',
        [
          ['mine', raw('worklogs.tabs.mine'), 'calendar_month'],
          ['review', raw('worklogs.tabs.review'), 'fact_check'],
          ['timesheet', raw('worklogs.tabs.timesheet'), 'table_view'],
          ['report', raw('worklogs.tabs.report'), 'insights'],
        ],
        tab,
      ) +
      '<span class="spacer"></span>' +
      (tab === 'timesheet' ? '' : monthToolbar('logMonth', date)) +
      '</div>';
    let body;
    if (tab === 'review') body = logReview(data, date);
    else if (tab !== 'mine') body = logReport(data, date, tab === 'timesheet');
    else
      body =
        '<div class="log-status">' +
        ['Approved', 'Pending', 'Rejected']
          .map((status) =>
            chip(
              hours(sumMinutes(userLogs.filter((row) => row.status === status))) +
                ' · ' +
                raw('worklogs.status.' + status),
              statusTone(status),
            ),
          )
          .join('') +
        '</div>' +
        worklogMonth(data, date);
    return (
      header(
        raw('worklogs.title'),
        raw('worklogs.subtitle'),
        act('logForm|' + today(), raw('worklogs.add'), 'more_time', 'btn primary'),
      ) +
      toolbar +
      body
    );
  }
  function leaveRows(data, list, review) {
    return table(
      ['Nhân viên', 'Loại nghỉ', 'Thời gian', 'Trạng thái', review ? 'Thao tác' : 'Lý do'],
      list.map((row) => [
        accountCell(data, row.userId),
        h(row.type),
        fmtDate(row.startDate) + ' – ' + fmtDate(row.endDate),
        statusTag('leaves', row.status),
        review ? approveControls('leave', row) : h(row.reason),
      ]),
      'Chưa có đơn nghỉ phép.',
    );
  }
  function approvals(data) {
    const tab = state.view.approvalTab || 'worklogs';
    const date = state.view.approvalMonth || today();
    const count = (key, prefix) =>
      raw('approvals.kinds.' + prefix) +
      ' · ' +
      data[key].filter((row) => row.status === 'Pending' && MockApi.canReview(data, row.userId))
        .length;
    return (
      header(raw('approvals.title'), raw('approvals.subtitle')) +
      '<div class="toolbar">' +
      tabs(
        'approvalTab',
        [
          ['worklogs', count('worklogs', 'worklogs'), 'schedule'],
          ['leaves', count('leave', 'leaves'), 'beach_access'],
        ],
        tab,
      ) +
      '<span class="spacer"></span>' +
      (tab === 'worklogs' ? monthToolbar('approvalMonth', date) : '') +
      '</div>' +
      (tab === 'worklogs'
        ? logReview(data, date)
        : '<div class="toolbar">' +
          filter('leaveApprovalStatus', 'Trạng thái', [
            ['', 'Tất cả'],
            ['Pending', 'Chờ duyệt'],
            ['Approved', 'Đã duyệt'],
            ['Rejected', 'Bị từ chối'],
          ]) +
          '</div>' +
          panel(
            leaveRows(
              data,
              data.leave.filter(
                (row) =>
                  MockApi.canReview(data, row.userId) &&
                  (!state.view.leaveApprovalStatus ||
                    row.status === state.view.leaveApprovalStatus),
              ),
              true,
            ),
          ))
    );
  }
  function leaves(data) {
    return D.leavesView(data);
  }
  function assetStats(data) {
    const rows = data.assets;
    const num = (status) => rows.filter((row) => row.status === status).length;
    return stats([
      stat(
        'Tài sản · ' + money(rows.reduce((total, row) => total + row.price, 0)),
        rows.length,
        'inventory_2',
        'indigo',
      ),
      stat(raw('assets.status.Available'), num('Available'), 'check_circle', 'emerald'),
      stat(
        'Đang bàn giao · ' +
          rows.filter((row) => row.status === 'Assigned' && !row.confirmed).length +
          ' chờ xác nhận',
        num('Assigned'),
        'person',
        'indigo',
      ),
      stat(raw('assets.status.InRepair'), num('InRepair'), 'build', 'amber'),
      stat(
        'Cần thu hồi',
        rows.filter(
          (row) =>
            row.status === 'Assigned' &&
            ((row.expectedReturnOn && row.expectedReturnOn < today()) ||
              person(data, row.holderId)?.locked),
        ).length,
        'assignment_return',
        'rose',
      ),
    ]);
  }
  function assetWarnings(data, row) {
    const labels = [];
    if (row.status === 'Disposed') return labels;
    if (row.warrantyUntil && row.warrantyUntil <= D.shift(today(), 30))
      labels.push(row.warrantyUntil < today() ? 'Hết bảo hành' : 'Sắp hết bảo hành');
    if (
      (row.maintenance || []).some(
        (item) => item.status === 'Đã lên lịch' && item.date <= D.shift(today(), 7),
      )
    )
      labels.push('Bảo trì sắp đến hạn');
    if (row.status === 'InRepair') labels.push('Đang bảo trì');
    if (row.status === 'Assigned') {
      if (!row.confirmed) labels.push('Chờ xác nhận');
      if (row.expectedReturnOn && row.expectedReturnOn < today()) labels.push('Quá hạn trả');
      if (person(data, row.holderId)?.locked) labels.push('Người giữ bị khóa');
    }
    return labels;
  }
  const assetStatuses = ['Available', 'Assigned', 'InRepair', 'Disposed', 'Lost'];
  const returnWarnings = ['Quá hạn trả', 'Người giữ bị khóa', 'Chờ xác nhận'];
  const assetGlyph = (row) =>
    ({ laptop: 'laptop_mac', display: 'monitor', phone: 'smartphone' })[row.categoryId] ||
    'devices_other';
  const assetLink = (row) =>
    '<a class="asset-name" href="#/assets/' +
    h(row.id) +
    '">' +
    '<span class="asset-symbol">' +
    icon(assetGlyph(row)) +
    '</span><span class="stack"><strong>' +
    h(row.name) +
    '</strong><small>' +
    h(row.code) +
    '</small></span></a>';
  function assetAttention(data) {
    const affected = data.assets.map((row) => ({ row, labels: assetWarnings(data, row) }));
    const warningPanel = (title, glyph, tone, select) => {
      const rows = affected
        .map(({ row, labels }) => ({ row, labels: labels.filter(select) }))
        .filter(({ labels }) => labels.length);
      return panel(
        '<h2>' +
          icon(glyph) +
          h(title) +
          chip(rows.length, tone) +
          '</h2>' +
          (rows
            .map(
              ({ row, labels }) =>
                '<div class="asset-warning-row">' +
                assetLink(row) +
                '<div class="row-actions">' +
                labels.map((label) => chip(label, tone)).join('') +
                '</div></div>',
            )
            .join('') || placeholder('Không có tài sản cần xử lý.', 'check_circle')),
        'asset-warning-panel asset-warning-panel--' + tone,
      );
    };
    return (
      '<div class="split asset-warnings">' +
      warningPanel(
        'Cảnh báo bảo hành & bảo trì',
        'notifications_active',
        'amber',
        (label) => !returnWarnings.includes(label),
      ) +
      warningPanel('Cần thu hồi / xác nhận', 'assignment_return', 'rose', (label) =>
        returnWarnings.includes(label),
      ) +
      '</div>'
    );
  }
  function assets(data, id, auditId) {
    if (id === 'audits') return D.auditScreen(data, auditId);
    if (id) {
      const row = byId(data, 'assets', id);
      return row
        ? assetPage(data, row)
        : errorPage('Không tìm thấy tài sản', 'assets', 'Về kho tài sản');
    }
    const tab = state.view.assetTab || 'inventory';
    const group = [
      ['inventory', 'inventory_2'],
      ['attention', 'warning'],
      ['audits', 'fact_check'],
      ['categories', 'category'],
    ];
    const topAction =
      tab === 'categories'
        ? act('categoryForm', 'Thêm danh mục', 'add', 'btn primary')
        : tab === 'audits'
          ? act('startAudit', 'Bắt đầu kiểm kê', 'fact_check', 'btn primary')
          : act('assetPrint', 'In tem QR', 'qr_code_2') +
            act('assetForm', raw('assets.add'), 'add', 'btn primary');
    const toolbar =
      '<div class="toolbar">' +
      tabs(
        'assetTab',
        group.map(([key, glyph]) => [
          key,
          raw('assets.tabs.' + key),
          glyph,
          key === 'attention'
            ? data.assets.filter((row) => assetWarnings(data, row).length).length
            : 0,
        ]),
        tab,
      ) +
      '</div>';
    let body;
    if (tab === 'categories') {
      body =
        '<div class="asset-categories">' +
        data.categories
          .map((row) =>
            panel(
              '<div class="asset-category-heading"><span class="asset-symbol">' +
                icon('category') +
                '</span><div class="stack"><strong>' +
                h(row.name) +
                '</strong><small>' +
                data.assets.filter((item) => item.categoryId === row.id).length +
                ' tài sản</small></div>' +
                iconBtn('categoryForm|' + row.id, 'Sửa danh mục', 'edit') +
                '</div><p class="muted">' +
                icon('schedule') +
                (row.intervalMonths
                  ? h('Bảo trì mỗi ' + row.intervalMonths + ' tháng')
                  : 'Chưa thiết lập chu kỳ bảo trì') +
                '</p>',
            ),
          )
          .join('') +
        '</div>';
    } else if (tab === 'audits') {
      body = panel(
        table(
          ['Đợt kiểm kê', 'Ngày', 'Đã kiểm tra'],
          data.audits.map((row) => [
            link('assets/audits/' + row.id, row.name, 'fact_check', 'plain-button'),
            fmtDate(row.date),
            String(row.checked.length),
          ]),
          'Chưa có đợt kiểm kê.',
        ),
        'reference-table',
      );
    } else if (tab === 'attention') {
      body = assetAttention(data);
    } else {
      const rows = data.assets.filter(
        (row) =>
          (!state.view.assetStatus || row.status === state.view.assetStatus) &&
          (!state.view.assetCategory || row.categoryId === state.view.assetCategory) &&
          matches(
            state.view.assetQuery,
            row.code,
            row.name,
            row.serial,
            empName(data, row.holderId),
          ),
      );
      const page = paginate('assetPage', rows);
      const statusChoices = [
        ['all', 'Tất cả trạng thái'],
        ...assetStatuses.map((status) => [status, raw('assets.status.' + status)]),
      ];
      body =
        '<div class="toolbar asset-filters">' +
        searchField('assetQuery', raw('assets.search')) +
        filter('assetCategory', 'Danh mục', [
          ['', 'Tất cả danh mục'],
          ...options(data.categories),
        ]) +
        '<div class="status-pills" role="group" aria-label="Trạng thái tài sản">' +
        statusChoices
          .map(([status, label]) => {
            const selected = (state.view.assetStatus || 'all') === status;
            return (
              '<button type="button" class="status-pill' +
              (selected ? ' is-selected' : '') +
              '" data-act="assetFilter|' +
              h(status) +
              '" aria-pressed="' +
              selected +
              '">' +
              h(label) +
              '</button>'
            );
          })
          .join('') +
        '</div></div>' +
        panel(
          table(
            [
              'Tài sản',
              'Danh mục',
              'Serial',
              'Người đang giữ',
              'Trạng thái',
              'Bảo hành đến',
              'Giá mua',
            ],
            page.rows.map((row) => [
              assetLink(row),
              h(byId(data, 'categories', row.categoryId)?.name || '—'),
              '<span class="asset-serial">' + h(row.serial || '—') + '</span>',
              row.holderId ? accountCell(data, row.holderId, false) : '—',
              statusTag('assets', row.status),
              fmtDate(row.warrantyUntil),
              h(money(row.price)),
            ]),
          ) + page.foot,
          'reference-table asset-inventory',
        );
    }
    return (
      header(raw('assets.title'), raw('assets.subtitle'), topAction) +
      assetStats(data) +
      toolbar +
      body
    );
  }
  function assetInfo(data, row, manager) {
    return definitions([
      ['Mã tài sản', h(row.code)],
      ['Danh mục', h(byId(data, 'categories', row.categoryId)?.name)],
      ['Trạng thái', statusTag('assets', row.status)],
      ['Serial', h(row.serial || '—')],
      ['Tình trạng', h(row.condition || 'Tốt')],
      ['Vị trí', h(row.location || '—')],
      ['Người đang giữ', h(empName(data, row.holderId))],
      ...(row.holderId
        ? [
            ['Ngày bàn giao', fmtDate(row.assignedOn)],
            ['Hạn trả', fmtDate(row.expectedReturnOn)],
            ['Xác nhận nhận', row.confirmed ? 'Đã xác nhận' : 'Chờ xác nhận'],
          ]
        : []),
      ...(manager
        ? [
            ['Giá mua', h(money(row.price))],
            ['Ngày mua', fmtDate(row.purchasedOn)],
            ['Nhà cung cấp', h(row.supplier || '—')],
            ['Bảo hành đến', fmtDate(row.warrantyUntil)],
            ['Chu kỳ bảo trì', row.interval ? h(row.interval + ' ngày') : 'Theo danh mục'],
          ]
        : []),
    ]);
  }
  function assetPage(data, row) {
    const holder = person(data, row.holderId);
    const category = byId(data, 'categories', row.categoryId);
    const facts = [
      ['Mã tài sản', '<span class="mono">' + h(row.code) + '</span>'],
      ['Danh mục', h(category?.name || '—')],
      ['Serial', '<span class="mono">' + h(row.serial || '—') + '</span>'],
      ['Tình trạng', h(row.condition || 'Tốt')],
      ['Vị trí', h(row.location || '—')],
      ['Ngày mua', fmtDate(row.purchasedOn)],
      ['Giá mua', h(money(row.price))],
      ['Nhà cung cấp', h(row.supplier || '—')],
      ['Bảo hành đến', fmtDate(row.warrantyUntil)],
      ['Chu kỳ bảo trì', row.interval ? h(row.interval + ' ngày') : 'Theo danh mục'],
    ];
    const controls =
      (row.status === 'Disposed' ? '' : act('assetForm|' + row.id, raw('common.edit'), 'edit')) +
      (row.status === 'Available'
        ? act('maintenanceForm|' + row.id, 'Lập lịch bảo trì', 'build') +
          act('handover|' + row.id, 'Bàn giao', 'assignment_ind', 'btn primary')
        : row.status === 'Assigned'
          ? act('returnAsset|' + row.id, 'Thu hồi', 'assignment_return', 'btn primary')
          : row.status === 'InRepair'
            ? act(
                'assetStatus|' + row.id + '|finish',
                'Ghi nhận sửa xong',
                'build_circle',
                'btn primary',
              )
            : row.status === 'Lost'
              ? act(
                  'assetStatus|' + row.id + '|found',
                  'Đã tìm thấy',
                  'travel_explore',
                  'btn primary',
                )
              : '') +
      D.assetDetailActions(row);
    const history = (row.history || []).slice().reverse();
    return (
      '<div class="asset-reference">' +
      link('assets', raw('assets.title'), 'arrow_back', 'back') +
      '<header class="page-header asset-header"><div class="head__title">' +
      '<span class="head__icon">' +
      icon(assetGlyph(row)) +
      '</span><div><small class="head__code">' +
      h(row.code) +
      '</small><h1>' +
      h(row.name) +
      '</h1><div class="tags">' +
      statusTag('assets', row.status) +
      (category ? chip(category.name) : '') +
      '</div></div></div><div class="row-actions">' +
      controls +
      '</div></header>' +
      '<div class="layout"><div class="main">' +
      panel(
        '<h2>Đang giữ</h2>' +
          (holder
            ? '<div class="asset-holder">' +
              accountCell(data, holder.id) +
              chip(
                row.confirmed ? 'Đã xác nhận' : 'Chờ xác nhận',
                row.confirmed ? 'emerald' : 'amber',
              ) +
              '</div><p class="muted">Bàn giao ' +
              fmtDate(row.assignedOn) +
              ' · Hạn trả ' +
              fmtDate(row.expectedReturnOn) +
              '</p>'
            : '<p class="muted">Chưa bàn giao cho nhân viên.</p>'),
      ) +
      panel(
        '<h2>' +
          t('assets.detail.info') +
          '</h2><dl class="facts">' +
          facts
            .map(([label, value]) => '<div><dt>' + h(label) + '</dt><dd>' + value + '</dd></div>')
            .join('') +
          '</dl>' +
          (row.note ? '<p class="note">' + h(row.note) + '</p>' : ''),
      ) +
      D.assetMaintenancePanel(row) +
      '</div><aside class="side">' +
      D.assetQrPanel(row) +
      panel(
        '<h2>' +
          t('assets.detail.history') +
          '</h2>' +
          (history.length
            ? '<ol class="timeline">' +
              history
                .map(
                  (event) =>
                    '<li class="event"><span class="event__dot">' +
                    icon('history') +
                    '</span><div class="event__body"><strong>' +
                    h(event.text) +
                    '</strong><p class="muted">' +
                    fmtDate(event.date) +
                    '</p></div></li>',
                )
                .join('') +
              '</ol>'
            : '<p class="muted">Chưa có lịch sử.</p>'),
      ) +
      '</aside></div></div>'
    );
  }
  function myAssets(data) {
    const rows = data.assets.filter((row) => row.holderId === data.currentUserId);
    const cards = rows.map((row) => {
      const category = byId(data, 'categories', row.categoryId);
      const facts = [
        ['Số serial', h(row.serial || '—')],
        ['Tình trạng', h(row.condition || 'Tốt')],
        ['Ngày bàn giao', fmtDate(row.assignedOn)],
        ['Hạn trả', row.expectedReturnOn ? fmtDate(row.expectedReturnOn) : 'Dùng lâu dài'],
      ];
      return panel(
        '<div class="my-asset-heading">' +
          '<button type="button" class="asset-name" data-act="asset|' +
          h(row.id) +
          '">' +
          '<span class="asset-symbol">' +
          icon(assetGlyph(row)) +
          '</span><span class="stack"><small>' +
          h(row.code) +
          '</small><strong>' +
          h(row.name) +
          '</strong></span></button>' +
          (category ? chip(category.name, 'slate') : '') +
          '</div>' +
          '<dl>' +
          facts
            .map(([label, value]) => '<div><dt>' + h(label) + '</dt><dd>' + value + '</dd></div>')
            .join('') +
          '</dl>' +
          (row.note ? '<p class="my-asset-note">' + h(row.note) + '</p>' : '') +
          actionsRow(
            row.confirmed
              ? chip('Đã xác nhận', 'emerald')
              : act('confirmAsset|' + row.id, 'Xác nhận đã nhận', 'check', 'btn sm primary'),
          ),
        'my-asset' + (row.confirmed ? '' : ' my-asset--pending'),
      );
    });
    return (
      header(
        raw('nav.myAssets'),
        'Thiết bị công ty đã bàn giao cho bạn. Hãy xác nhận khi đã nhận.',
      ) +
      (cards.length
        ? '<div class="card-grid my-asset-grid">' + cards.join('') + '</div>'
        : panel(placeholder('Hiện bạn chưa giữ tài sản nào.', 'devices')))
    );
  }
  function budgetStatus(value) {
    return !value.limit
      ? 'NoBudget'
      : value.percent >= 100
        ? 'Over'
        : value.percent >= 80
          ? 'Warning'
          : 'Ok';
  }
  function budgetDetail(data, project, standalone = true) {
    const info = MockApi.budget(data, project);
    const remaining = info.limit - info.spent;
    const taskIds = new Set(
      data.tasks.filter((row) => row.projectId === project.id).map((row) => row.id),
    );
    const projected = data.worklogs
      .filter((row) => row.status === 'Pending' && taskIds.has(row.taskId))
      .reduce(
        (sum, row) =>
          sum + Math.round((row.minutes * D.rateAt(data, row.userId, row.workDate)) / 60),
        0,
      );
    const widthOf = (amount) =>
      Math.min(100, Math.max(0, (amount / (info.limit || info.spent || 1)) * 100));
    const summary = panel(
      '<div class="toolbar"><h2>Ngân sách dự án</h2>' +
        statusTag('budgets', budgetStatus(info)) +
        '<span class="spacer"></span>' +
        act('setBudget|' + project.id, 'Đặt ngân sách', 'edit', 'btn sm') +
        '</div><dl class="budget-figures">' +
        [
          ['Ngân sách', info.limit],
          ['Đã chi', info.spent],
          ['Còn lại', remaining],
          ['Dự kiến thêm', projected],
        ]
          .map(
            ([label, value]) =>
              '<div><dt>' + h(label) + '</dt><dd>' + h(money(value)) + '</dd></div>',
          )
          .join('') +
        '</dl><div class="budget-legend"><span>' +
        h(t('budgets.list.usage')) +
        '</span><strong>' +
        Math.round(info.percent) +
        '%</strong></div><div class="budget-spend" aria-hidden="true"><i style="width:' +
        widthOf(info.labor) +
        '%"></i><i style="width:' +
        Math.min(100 - widthOf(info.labor), widthOf(info.other)) +
        '%"></i></div><div class="budget-legend budget-legend--items"><span>Nhân công ' +
        h(money(info.labor)) +
        '</span><span>Chi phí khác ' +
        h(money(info.other)) +
        '</span></div>',
      'budget-summary',
    );
    const details = panel(
      '<div class="toolbar"><strong>Chi phí khác</strong><span class="spacer"></span>' +
        act('expenseForm|' + project.id, 'Thêm chi phí', 'add', 'btn sm primary') +
        '</div>' +
        table(
          ['Chi phí', 'Ngày', 'Số tiền', ''],
          info.expenses.map((row) => [
            h(row.title),
            fmtDate(row.date),
            h(money(row.amount)),
            actionsRow(
              iconBtn('expenseForm|' + project.id + '|' + row.id, 'Sửa chi phí', 'edit') +
                iconBtn('deleteExpense|' + row.id, 'Xóa chi phí', 'delete'),
            ),
          ]),
          'Chưa có chi phí khác.',
        ),
    );
    return (
      (standalone
        ? crumbs([
            ['budgets', raw('budgets.title')],
            [null, project.name],
          ]) +
          header(
            project.name,
            raw('budgets.subtitle'),
            link('projects/' + project.id, 'Mở dự án', 'open_in_new'),
          )
        : '') +
      summary +
      D.budgetReports(data, project) +
      details
    );
  }
  function budgets(data, id) {
    if (id) {
      const row = byId(data, 'projects', id);
      return row
        ? budgetDetail(data, row)
        : errorPage('Không tìm thấy ngân sách', 'budgets', raw('budgets.title'));
    }
    const all = data.projects.map((project) => [project, MockApi.budget(data, project)]);
    return (
      header(
        raw('budgets.title'),
        raw('budgets.subtitle'),
        link('admin/cost-rates', raw('nav.costRates'), 'price_change'),
      ) +
      stats([
        stat(
          'Tổng ngân sách',
          money(all.reduce((sum, [, row]) => sum + row.limit, 0)),
          'account_balance_wallet',
          'indigo',
        ),
        stat(
          raw('budgets.list.spent'),
          money(all.reduce((sum, [, row]) => sum + row.spent, 0)),
          'payments',
          'emerald',
        ),
        stat(
          raw('budgets.list.warning'),
          all.filter(([, row]) => budgetStatus(row) === 'Warning').length,
          'warning',
          'amber',
        ),
        stat(
          raw('budgets.list.over'),
          all.filter(([, row]) => budgetStatus(row) === 'Over').length,
          'error',
          'rose',
        ),
      ]) +
      '<div class="toolbar">' +
      searchField('budgetQuery', 'Tìm dự án…') +
      '</div>' +
      panel(
        table(
          ['Dự án', 'Ngân sách', 'Đã chi', 'Đã dùng', 'Tình trạng'],
          all
            .filter(([row]) => matches(state.view.budgetQuery, row.name, row.key))
            .map(([project, value]) => [
              '<div class="budget-project"><span class="budget-key">' +
                h(project.key) +
                '</span><div class="stack">' +
                link('budgets/' + project.id, project.name, '', 'plain-button') +
                '<small>' +
                h(byId(data, 'workspaces', project.workspaceId)?.name || '') +
                '</small></div></div>',
              h(money(value.limit)),
              h(money(value.spent)),
              '<span class="budget-usage">' +
                bar(
                  value.percent,
                  budgetStatus(value) === 'Over'
                    ? '#e11d48'
                    : budgetStatus(value) === 'Warning'
                      ? '#d97706'
                      : '#6366f1',
                ) +
                '<strong>' +
                Math.round(value.percent) +
                '%</strong></span>',
              statusTag('budgets', budgetStatus(value)),
            ]),
        ),
      )
    );
  }
  function requestTemplateCard(data, row) {
    return panel(
      '<h3>' +
        h(row.name) +
        '</h3><p class="muted">' +
        h(department(data, row.departmentId)) +
        ' · ' +
        row.fields.length +
        ' trường</p>' +
        actionsRow(
          chip(row.active ? 'Đang dùng' : 'Đã tắt', row.active ? 'emerald' : 'amber') +
            iconBtn('templateForm|' + row.id, 'Sửa mẫu', 'edit'),
        ),
    );
  }
  function requestBadge(row) {
    const glyphs = {
      Pending: 'schedule',
      Approved: 'sync_alt',
      Done: 'check_circle',
      Rejected: 'cancel',
      Cancelled: 'block',
    };
    return (
      '<span class="status status--' +
      h(row.status) +
      '" title="' +
      t('requests.status.' + row.status) +
      '">' +
      icon(glyphs[row.status] || 'info') +
      t('requests.status.' + row.status) +
      '</span>'
    );
  }
  function requestPriority(row) {
    const label = { High: 'Cao', Urgent: 'Khẩn cấp', Low: 'Thấp' }[row.priority];
    return label
      ? '<span class="row__priority row__priority--' + h(row.priority) + '">' + h(label) + '</span>'
      : '';
  }
  function requests(data, id) {
    const selected = state.view.requestSelected || id;
    const item = byId(data, 'requests', selected);
    const tab = item
      ? item.requesterId === data.currentUserId
        ? 'mine'
        : 'inbox'
      : state.view.requestTab || 'mine';
    const own = data.requests.filter((row) => row.requesterId === data.currentUserId);
    const inbox = data.requests.filter((row) => row.requesterId !== data.currentUserId);
    const toolbar = tabs(
      'requestTab',
      [
        [
          'mine',
          raw('requests.tabs.mine'),
          'outbox',
          own.filter((row) => ['Pending', 'Approved'].includes(row.status)).length,
        ],
        [
          'inbox',
          raw('requests.tabs.inbox'),
          'move_to_inbox',
          inbox.filter((row) => row.status === 'Pending').length,
        ],
        ['templates', raw('requests.tabs.templates'), 'dynamic_form'],
      ],
      tab,
    );
    const action =
      tab === 'templates'
        ? act('templateForm', 'Mẫu yêu cầu mới', 'dynamic_form', 'btn primary')
        : act('newRequest', raw('requests.new.button') || 'Tạo yêu cầu', 'add', 'btn primary');
    const head = header(raw('requests.title'), raw('requests.subtitle'), action) + toolbar;
    if (tab === 'templates')
      return (
        '<div class="requests-reference">' +
        head +
        '<div class="templates">' +
        data.templates.map((row) => requestTemplateCard(data, row)).join('') +
        '</div></div>'
      );
    const filtered = (tab === 'mine' ? own : inbox).filter(
      (row) =>
        (!state.view.requestStatus || row.status === state.view.requestStatus) &&
        matches(state.view.requestQuery, row.title, row.code),
    );
    const page = paginate('requestPage', filtered);
    const statuses = [
      ['', 'Tất cả'],
      ...['Pending', 'Approved', 'Done', 'Rejected', 'Cancelled'].map((status) => [
        status,
        raw('requests.status.' + status),
      ]),
    ];
    const list =
      '<section class="list"><div class="filters">' +
      searchField('requestQuery', raw('requests.search')) +
      '<div class="statuses" aria-label="Trạng thái">' +
      statuses
        .map(
          ([value, label]) =>
            '<button class="chip' +
            (value === (state.view.requestStatus || '') ? ' chip--on' : '') +
            '" type="button" data-act="requestFilter|' +
            h(value) +
            '" aria-pressed="' +
            (value === (state.view.requestStatus || '')) +
            '">' +
            h(label) +
            '</button>',
        )
        .join('') +
      '</div></div>' +
      (page.rows.length
        ? '<ul class="rows">' +
          page.rows
            .map(
              (row) =>
                '<li><button type="button" class="row' +
                (row.id === selected ? ' row--on' : '') +
                '" data-act="request|' +
                h(row.id) +
                '"><span class="row__icon">' +
                icon(row.templateId === 'equipment' ? 'devices' : 'description') +
                '</span><span class="row__body"><span class="row__top"><span class="row__code">' +
                h(row.code) +
                '</span>' +
                requestPriority(row) +
                '</span><strong class="row__title">' +
                h(row.title) +
                '</strong><span class="row__meta">' +
                h(empName(data, row.requesterId) + ' · ' + department(data, row.departmentId)) +
                '</span></span><span class="request-row-aside"><small>' +
                fmtDate(row.createdAt) +
                '</small>' +
                requestBadge(row) +
                '</span></button></li>',
            )
            .join('') +
          '</ul>'
        : placeholder('Chưa có yêu cầu phù hợp.')) +
      page.foot +
      '</section>';
    const missing = selected && !item;
    return (
      '<div class="requests-reference">' +
      head +
      '<div class="layout' +
      (item || missing ? ' layout--detail' : '') +
      '">' +
      list +
      (item
        ? requestDetail(data, item)
        : missing
          ? '<section class="pane">' +
            iconBtn('requestClose', 'Đóng chi tiết', 'close') +
            placeholder('Yêu cầu đã thay đổi hoặc không còn trong dữ liệu demo.') +
            '</section>'
          : '') +
      '</div></div>'
    );
  }
  function openRequest(id) {
    state.view.requestSelected = id;
    const data = MockApi.snapshot();
    const item = byId(data, 'requests', id);
    if (item) state.view.requestTab = item.requesterId === data.currentUserId ? 'mine' : 'inbox';
    render();
  }
  function requestDetail(data, row) {
    const id = row.id;
    const task = row.taskId ? lookupTask(data, row.taskId) : null;
    const template = byId(data, 'templates', row.templateId);
    let controls = '';
    if (row.status === 'Pending')
      controls +=
        act(
          'requestAction|' + id + '|approve',
          raw('requests.detail.approve'),
          'check',
          'btn primary',
        ) +
        (row.requesterId === data.currentUserId
          ? act('requestAction|' + id + '|cancel', raw('requests.detail.cancel'), 'close')
          : '');
    if (['Pending', 'Approved'].includes(row.status))
      controls += act('requestReject|' + id, raw('requests.detail.reject'), 'close', 'btn danger');
    if (row.status === 'Approved')
      controls +=
        act(
          'requestAction|' + id + '|done',
          raw('requests.detail.complete'),
          'done_all',
          'btn primary',
        ) +
        (!task ? act('requestConvert|' + id, raw('requests.detail.convert'), 'task_alt') : '') +
        act('requestAssign|' + id, raw('requests.detail.assignee'), 'person_add') +
        (row.templateId === 'equipment' && data.assets.some((asset) => asset.status === 'Available')
          ? act('requestHandover|' + id, raw('requests.detail.handOverAsset'), 'inventory_2')
          : '');
    const steps = [
      ['Đã gửi', 'send'],
      ['Tiếp nhận', 'move_to_inbox'],
      ['Hoàn thành', 'check_circle'],
    ];
    const stage = row.status === 'Done' ? 2 : row.status === 'Approved' ? 1 : 0;
    const flow =
      '<ol class="request-flow" aria-label="Tiến độ yêu cầu">' +
      steps
        .map(
          ([label, glyph], index) =>
            '<li class="' +
            (index <= stage ? 'passed' : index === stage + 1 ? 'next' : '') +
            '"><span>' +
            icon(glyph) +
            '</span>' +
            h(label) +
            '</li>',
        )
        .join('') +
      '</ol>';
    const facts = [
      [raw('requests.detail.requester'), empName(data, row.requesterId)],
      [raw('requests.detail.department'), department(data, row.departmentId)],
      [raw('requests.detail.handlers'), empName(data, row.assigneeId)],
      [raw('requests.detail.sentAt'), fmtDate(row.createdAt)],
    ];
    return (
      '<section class="pane request-pane" aria-label="Chi tiết yêu cầu"><header class="request-pane-heading"><span class="request-pane-icon">' +
      icon(row.templateId === 'equipment' ? 'devices' : 'description') +
      '</span><div><small>' +
      h(row.code + (template ? ' · ' + template.name : '')) +
      '</small><h2>' +
      h(row.title) +
      '</h2><div class="row-actions">' +
      requestBadge(row) +
      requestPriority(row) +
      '</div></div>' +
      iconBtn('requestClose', 'Đóng chi tiết', 'close') +
      '</header>' +
      flow +
      '<dl class="request-facts">' +
      facts
        .map(([label, value]) => '<div><dt>' + h(label) + '</dt><dd>' + h(value) + '</dd></div>')
        .join('') +
      '</dl>' +
      (controls ? '<div class="request-controls">' + actionsRow(controls) + '</div>' : '') +
      (task
        ? '<p>' +
          act('task|' + task.id, task.code + ' · ' + task.title, 'task_alt', 'plain-button') +
          '</p>'
        : '') +
      '<h3>' +
      t('requests.detail.answers') +
      '</h3>' +
      definitions(
        row.answers.map((answer) => [
          answer.label,
          answer.files?.length ? D.attachmentRows(answer.files) : h(answer.value || '—'),
        ]),
      ) +
      '<h3>' +
      t('requests.detail.history') +
      '</h3>' +
      row.history
        .map(
          (event) =>
            '<div class="item-line"><div class="stack"><strong>' +
            h(event.text) +
            '</strong><small>' +
            fmtDate(event.date) +
            '</small></div></div>',
        )
        .join('') +
      '<div class="request-comment-action">' +
      act('requestComment|' + id, 'Viết bình luận', 'chat_bubble_outline', 'btn sm') +
      '</div></section>'
    );
  }
  function newRequest() {
    const data = MockApi.snapshot();
    const templates = data.templates.filter((row) => row.active);
    if (!templates.length) {
      show('Tạo yêu cầu', placeholder('Chưa có mẫu yêu cầu đang hoạt động.'));
      return;
    }
    const initial = templates[0];
    show(
      'Tạo yêu cầu',
      field('Mẫu yêu cầu', 'templateId', initial.id, {
        options: templates.map((row) => [
          row.id,
          department(data, row.departmentId) + ' · ' + row.name,
        ]),
      }) +
        field('Tiêu đề', 'title', '', { required: true }) +
        field('Mức ưu tiên', 'priority', 'Normal', {
          options: [
            ['Low', 'Thấp'],
            ['Normal', 'Bình thường'],
            ['High', 'Cao'],
            ['Urgent', 'Khẩn cấp'],
          ],
        }) +
        '<div id="request-fields"></div>',
      {
        glyph: 'dynamic_form',
        wide: true,
        submitLabel: 'Gửi yêu cầu',
        submit: async (values, form) => {
          const selected = byId(data, 'templates', values.templateId);
          const formData = new FormData(form);
          const requestFiles = {};
          for (const [index, field] of selected.fields.entries()) {
            if (field.type === 'file')
              requestFiles[index] = await D.saveAttachments(formData.getAll('answer' + index));
          }
          const row = MockApi.saveRequest({ ...values, requestFiles });
          state.view.requestTab = 'mine';
          refresh('Đã gửi ' + row.code + '.');
          openRequest(row.id);
        },
      },
    );
    const load = (id) => {
      const template = byId(data, 'templates', id);
      D.dialog.querySelector('#request-fields').innerHTML = template.fields
        .map((row, i) =>
          row.type === 'file'
            ? '<label class="field"><span>' +
              h(row.label) +
              '</span><input type="file" multiple name="answer' +
              i +
              '"' +
              (row.required ? ' required' : '') +
              '></label>'
            : field(row.label, 'answer' + i, '', {
                type: row.type,
                required: row.required,
                options:
                  row.type === 'select'
                    ? [['', 'Chọn…'], ...row.options.map((value) => [value, value])]
                    : undefined,
              }),
        )
        .join('');
    };
    D.dialog
      .querySelector('[name="templateId"]')
      .addEventListener('change', (event) => load(event.target.value));
    load(initial.id);
  }
  function templateForm(id) {
    const data = MockApi.snapshot();
    const item = byId(data, 'templates', id) || {};
    const fields = item.fields?.map((row) => ({ ...row })) || [
      { label: '', type: 'text', required: true },
    ];
    const fieldTypes = [
      ['text', 'Văn bản'],
      ['textarea', 'Đoạn văn'],
      ['number', 'Số'],
      ['date', 'Ngày'],
      ['select', 'Lựa chọn'],
      ['file', 'Tệp'],
    ];
    show(
      item.id ? 'Sửa mẫu yêu cầu' : 'Mẫu yêu cầu mới',
      field('Tên mẫu', 'name', item.name, { required: true }) +
        field('Mô tả', 'description', item.description, { type: 'textarea' }) +
        field('Bộ phận phụ trách', 'departmentId', item.departmentId || data.departments[0]?.id, {
          options: options(data.departments),
          required: true,
        }) +
        field('Người xử lý mặc định', 'defaultHandler', item.defaultHandler, {
          options: empOptions(data, undefined, 'Theo phòng ban'),
        }) +
        field('Đang sử dụng', 'active', item.active ?? true, { type: 'checkbox' }) +
        '<h3>Các trường trong mẫu</h3><div id="template-fields"></div>' +
        '<button type="button" class="btn sm" id="append-template-field">' +
        icon('add') +
        'Thêm trường</button>',
      {
        glyph: 'dynamic_form',
        wide: true,
        submit: (values) => {
          const mapped = fields.map((_, i) => {
            const type = values['type' + i];
            const options =
              type === 'select'
                ? values['choices' + i]
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean)
                : [];
            if (type === 'select' && !options.length)
              throw Error('Trường lựa chọn cần ít nhất một giá trị.');
            return {
              label: values['label' + i],
              type,
              required: values['required' + i] === 'on',
              options,
            };
          });
          MockApi.saveTemplate(
            { ...values, active: values.active === 'on', fields: mapped },
            item.id,
          );
          refresh('Đã lưu mẫu yêu cầu.');
        },
      },
    );
    const container = D.dialog.querySelector('#template-fields');
    function draw() {
      container.innerHTML = fields
        .map(
          (row, i) =>
            '<fieldset class="template-field"><legend>Trường ' +
            (i + 1) +
            '</legend><div class="field-grid">' +
            field('Tên trường', 'label' + i, row.label, { required: true }) +
            field('Loại', 'type' + i, row.type, { options: fieldTypes }) +
            '</div>' +
            '<div data-field-choices="' +
            i +
            '"' +
            (row.type !== 'select' ? ' hidden' : '') +
            '>' +
            field('Các lựa chọn, phân cách bằng dấu phẩy', 'choices' + i, row.options?.join(', ')) +
            '</div>' +
            actionsRow(
              field('Bắt buộc', 'required' + i, row.required, { type: 'checkbox' }) +
                (fields.length > 1
                  ? '<button type="button" class="btn sm danger" data-remove-field="' +
                    i +
                    '">Xóa trường</button>'
                  : ''),
            ) +
            '</fieldset>',
        )
        .join('');
    }
    function collect() {
      const form = new FormData(container.closest('form'));
      fields.forEach((row, i) =>
        Object.assign(row, {
          label: form.get('label' + i),
          type: form.get('type' + i),
          required: form.has('required' + i),
          options: String(form.get('choices' + i))
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      );
    }
    container.addEventListener('change', (event) => {
      if (event.target.name.startsWith('type'))
        container.querySelector(
          '[data-field-choices="' + event.target.name.slice(4) + '"]',
        ).hidden = event.target.value !== 'select';
    });
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-field]');
      if (button) {
        collect();
        fields.splice(Number(button.dataset.removeField), 1);
        draw();
      }
    });
    D.dialog.querySelector('#append-template-field').addEventListener('click', () => {
      if (fields.length >= 30) return;
      collect();
      fields.push({ label: '', type: 'text', required: false });
      draw();
    });
    draw();
  }
  function performance(data, section, id) {
    if (section === 'reviews') return D.reviewScreen(data, id);
    if (section === 'cycles') return D.cycleScreen(data, id);
    const rights = D.access(data);
    const groups = ['mine', 'team', 'peers', 'history', 'dashboard', 'cycles', 'templates'].filter(
      (key) => {
        if (['cycles', 'templates'].includes(key)) return rights.hr;
        if (['team', 'dashboard'].includes(key))
          return (
            rights.hr ||
            rights.manager ||
            data.reviews.some((row) => row.reviewerId === data.currentUserId)
          );
        return true;
      },
    );
    const tab = groups.includes(state.view.performanceTab) ? state.view.performanceTab : 'mine';
    const controls =
      tab === 'cycles'
        ? act('newCycle', 'Tạo kỳ đánh giá', 'add', 'btn primary')
        : tab === 'templates'
          ? act('newReviewTemplate', 'Tạo mẫu đánh giá', 'add', 'btn primary')
          : '';
    const toolbar =
      '<div class="toolbar">' +
      tabs(
        'performanceTab',
        groups.map((key) => [key, raw('performance.tabs.' + key)]),
        tab,
      ) +
      '</div>';
    let body;
    if (tab === 'cycles')
      body = panel(
        table(
          ['Kỳ đánh giá', 'Bắt đầu', 'Hạn chót', 'Trạng thái'],
          data.cycles.map((row) => [
            link('performance/cycles/' + row.id, row.name, 'insights', 'plain-button'),
            fmtDate(row.startDate),
            fmtDate(row.dueDate),
            chip(D.cycleStatus?.(row.status) || row.status, 'indigo'),
          ]),
        ),
      );
    else if (tab === 'templates')
      body =
        '<div class="card-grid">' +
        data.reviewTemplates
          .map((row) =>
            panel(
              '<h3>' +
                h(row.name) +
                '</h3><p class="muted">' +
                h(row.description) +
                '</p>' +
                (row.criteria || [])
                  .map(
                    (item) =>
                      '<div class="item-line">' + h(item.name) + ' · ' + item.weight + '%</div>',
                  )
                  .join('') +
                act('newReviewTemplate|' + row.id, 'Chỉnh sửa mẫu', 'edit', 'btn sm'),
            ),
          )
          .join('') +
        '</div>';
    else if (tab === 'peers') body = D.peerReviews(data);
    else if (tab === 'dashboard') body = D.performanceDashboard(data);
    else if (tab === 'mine') {
      const own = data.reviews.filter((row) => row.employeeId === data.currentUserId);
      body = own.length
        ? '<div class="card-grid">' +
          own
            .map((row) => {
              const cycle = byId(data, 'cycles', row.cycleId);
              return panel(
                '<h2>' +
                  h(cycle?.name) +
                  '</h2>' +
                  statusTag('performance', row.status) +
                  '<p class="muted">Người đánh giá · ' +
                  h(empName(data, row.reviewerId)) +
                  '</p><p class="muted">Hạn tự đánh giá · ' +
                  fmtDate(cycle?.dueDate) +
                  '</p>' +
                  link(
                    'performance/reviews/' + row.id,
                    row.status === 'SelfPending' ? 'Bắt đầu tự đánh giá' : 'Xem đánh giá',
                    'assignment_ind',
                    'btn primary',
                  ),
              );
            })
            .join('') +
          '</div>'
        : panel(placeholder('Chưa có đánh giá.', 'insights'));
    } else
      body = panel(
        reviewTable(
          data,
          data.reviews.filter((row) =>
            tab === 'team'
              ? row.employeeId !== data.currentUserId && row.status !== 'Finalized'
              : tab === 'history'
                ? row.status === 'Finalized'
                : true,
          ),
        ),
      );
    return header(raw('performance.title'), raw('performance.subtitle'), controls) + toolbar + body;
  }
  function reviewTable(data, rows) {
    return table(
      ['Nhân viên', 'Kỳ đánh giá', 'Trạng thái', 'Điểm', ''],
      rows.map((row) => [
        accountCell(data, row.employeeId),
        h(byId(data, 'cycles', row.cycleId)?.name),
        statusTag('performance', row.status),
        h(row.managerScore || row.selfScore ? (row.managerScore || row.selfScore) + '/5' : '—'),
        link('performance/reviews/' + row.id, 'Xem đánh giá', 'assignment_ind', 'btn sm'),
      ]),
      'Chưa có đánh giá phù hợp.',
    );
  }
  function download(name, content, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  Object.assign(views, {
    worklogs,
    approvals,
    leaves,
    assets,
    'my-assets': myAssets,
    budgets,
    requests,
    performance,
  });
  Object.assign(D.labels, {
    worklogs: 'nav.worklogs',
    approvals: 'nav.approvals',
    leaves: 'nav.leaves',
    departments: 'nav.departments',
    'admin/users': 'nav.admin',
    assets: 'nav.assets',
    'my-assets': 'nav.myAssets',
    budgets: 'nav.budgets',
    'admin/cost-rates': 'nav.costRates',
    requests: 'nav.requests',
    performance: 'nav.performance',
    notifications: 'nav.notifications',
  });
  Object.assign(D, { budgetDetail, download, accountCell, definitions, statusTag });
  const str = (value) => (typeof value === 'string' ? value : '');
  const returnToRequest = (id, message) => {
    openRequest(id);
    D.showToast(message);
  };
  Object.assign(actions, {
    logForm: (date) => logForm(str(date) || today()),
    assetFilter: (status) => {
      state.view.assetStatus = status === 'all' ? '' : status;
      delete state.view.assetPage;
      render();
    },
    toggleLogDay: (day) => {
      state.view.expandedLogDay = state.view.expandedLogDay === day ? '' : day;
      render();
    },
    logFor: (id) => logForm(today(), id),
    logDetail,
    editLog: (id) => logForm(today(), '', id),
    shiftMonth: (name, delta) => {
      state.view[name] = monthStep(state.view[name] || today(), Number(delta));
      render();
    },
    approve: (key, id) =>
      confirm(
        'Duyệt yêu cầu?',
        'Quyết định của quản lý sẽ được lưu vào dữ liệu demo.',
        () => {
          MockApi.decide(key, id, 'Approved');
          refresh('Đã duyệt.');
        },
        'Duyệt',
      ),
    reject: (key, id) =>
      show(
        'Từ chối yêu cầu',
        field('Lý do từ chối', 'reason', '', { type: 'textarea', required: true }),
        {
          glyph: 'cancel',
          submitLabel: 'Từ chối',
          submit: (values) => {
            MockApi.decide(key, id, 'Rejected', values.reason);
            refresh('Đã từ chối.');
          },
        },
      ),
    exportReport: (date) => {
      const data = MockApi.snapshot();
      D.csv('TeamFlow-Bao-cao-gio-' + date.slice(0, 7) + '.csv', [
        ['Nhân viên', 'Ngày', 'Công việc', 'Phút', 'Trạng thái'],
        ...reportRows(data, date).map((row) => [
          empName(data, row.userId),
          row.workDate,
          lookupTask(data, row.taskId)?.code,
          row.minutes,
          raw('worklogs.status.' + row.status),
        ]),
      ]);
    },
    employee: (id) => {
      const data = MockApi.snapshot();
      const row = person(data, id);
      if (row)
        show(
          row.fullName,
          accountCell(data, id, false) +
            definitions([
              ['Email', h(row.email)],
              ['Phòng ban', h(department(data, row.departmentId))],
              [
                'Workspace',
                h(
                  data.workspaces
                    .filter((item) => item.memberIds.includes(row.id))
                    .map((item) => item.name)
                    .join(', ') || '—',
                ),
              ],
            ]),
          { glyph: 'person', drawer: true },
        );
    },
    assetForm: (id) => {
      const data = MockApi.snapshot();
      const row = byId(data, 'assets', str(id)) || {};
      show(
        row.id ? 'Sửa tài sản' : raw('assets.add'),
        field('Tên tài sản', 'name', row.name, { required: true }) +
          '<div class="field-grid">' +
          field('Danh mục', 'categoryId', row.categoryId || data.categories[0]?.id, {
            options: options(data.categories),
            required: true,
          }) +
          field('Serial', 'serial', row.serial) +
          field('Giá mua (VNĐ)', 'price', row.price ?? 0, {
            type: 'number',
            min: 0,
            required: true,
          }) +
          field('Ngày mua', 'purchasedOn', row.purchasedOn, { type: 'date' }) +
          '</div>' +
          field('Vị trí', 'location', row.location) +
          D.assetExtraFields(row),
        {
          glyph: 'inventory_2',
          submit: (values) => {
            MockApi.saveAsset(values, row.id);
            refresh('Đã lưu tài sản.');
          },
        },
      );
    },
    asset: (id) => {
      const data = MockApi.snapshot();
      const row = byId(data, 'assets', id);
      if (!row) return;
      show(
        row.name,
        assetInfo(data, row, state.route.startsWith('assets')) +
          (row.holderId === data.currentUserId && !row.confirmed
            ? act('confirmAsset|' + id, 'Xác nhận đã nhận', 'check', 'btn primary')
            : ''),
        { glyph: 'devices', drawer: true },
      );
    },
    handover: (id) => {
      const data = MockApi.snapshot();
      show(
        'Bàn giao tài sản',
        field('Người nhận', 'holderId', '', {
          options: empOptions(data, null, 'Chọn nhân viên'),
          required: true,
        }) +
          '<div class="field-grid">' +
          field('Ngày bàn giao', 'assignedOn', today(), {
            type: 'date',
            required: true,
            max: D.shift(today(), 30),
          }) +
          field('Hạn trả', 'expectedReturnOn', '', { type: 'date' }) +
          '</div>' +
          D.assetCondition('Tốt') +
          field('Ghi chú', 'note', '', { type: 'textarea' }),
        {
          glyph: 'assignment_ind',
          submitLabel: 'Bàn giao',
          submit: (values) => {
            MockApi.handoverAsset(id, values);
            refresh('Đã bàn giao tài sản.');
          },
        },
      );
    },
    returnAsset: (id) =>
      show(
        'Thu hồi tài sản',
        field('Ngày thu hồi', 'date', today(), { type: 'date', max: today(), required: true }) +
          D.assetCondition('Tốt') +
          field('Ghi chú', 'note', '', { type: 'textarea' }) +
          field('Chuyển bảo trì', 'toRepair', false, { type: 'checkbox' }),
        {
          glyph: 'assignment_return',
          submitLabel: 'Thu hồi',
          submit: (values) => {
            MockApi.returnAsset(id, values);
            refresh('Đã thu hồi tài sản về kho.');
          },
        },
      ),
    confirmAsset: (id) => {
      MockApi.confirmAsset(id);
      D.close();
      refresh('Đã xác nhận nhận tài sản.');
    },
    categoryForm: (id) => {
      const row = byId(MockApi.snapshot(), 'categories', str(id)) || {};
      show(
        row.id ? 'Sửa danh mục' : 'Thêm danh mục',
        field('Tên danh mục', 'name', row.name, { required: true }) +
          field('Biểu tượng', 'glyph', row.glyph || 'devices', {
            options: [
              ['devices', 'Thiết bị'],
              ['laptop', 'Laptop'],
              ['monitor', 'Màn hình'],
              ['smartphone', 'Điện thoại'],
            ],
          }) +
          field('Chu kỳ bảo trì mặc định (tháng)', 'intervalMonths', row.intervalMonths || '', {
            type: 'number',
            min: 1,
            max: 120,
          }),
        {
          glyph: 'category',
          submit: (values) => {
            MockApi.saveCategory(values, row.id);
            refresh('Đã lưu danh mục.');
          },
        },
      );
    },
    setBudget: (id) => {
      const row = byId(MockApi.snapshot(), 'projects', id);
      show(
        'Đặt ngân sách',
        field('Ngân sách (VNĐ)', 'amount', row.budget, { type: 'number', min: 0, required: true }),
        {
          glyph: 'account_balance_wallet',
          submit: (values) => {
            MockApi.setBudget(id, values.amount);
            refresh('Đã cập nhật ngân sách.');
          },
        },
      );
    },
    expenseForm: (projectId, id) => {
      const row = byId(MockApi.snapshot(), 'expenses', str(id)) || {};
      show(
        row.id ? 'Sửa chi phí' : 'Thêm chi phí',
        field('Tên chi phí', 'title', row.title, { required: true }) +
          field('Số tiền (VNĐ)', 'amount', row.amount, { type: 'number', min: 1, required: true }) +
          field('Ngày phát sinh', 'date', row.date || today(), { type: 'date', required: true }),
        {
          glyph: 'receipt_long',
          submit: (values) => {
            MockApi.saveExpense(projectId, values, row.id);
            refresh('Đã lưu chi phí.');
          },
        },
      );
    },
    deleteExpense: (id) =>
      confirm(
        'Xóa chi phí?',
        'Ngân sách dự án sẽ được cập nhật sau khi xóa.',
        () => {
          MockApi.deleteExpense(id);
          refresh('Đã xóa chi phí.');
        },
        'Xóa',
      ),
    request: (id) => openRequest(id),
    requestFilter: (status) => {
      state.view.requestStatus = status;
      delete state.view.requestPage;
      render();
    },
    requestClose: () => {
      delete state.view.requestSelected;
      if (state.route.startsWith('requests/')) {
        const row = byId(MockApi.snapshot(), 'requests', state.route.split('/')[1]);
        const tab = row && row.requesterId !== MockApi.snapshot().currentUserId ? 'inbox' : 'mine';
        go('requests', 'view:requestTab:' + tab);
      } else render();
    },
    newRequest,
    templateForm: (id) => templateForm(str(id)),
    requestAction: (id, action) => {
      MockApi.requestAction(id, action);
      returnToRequest(id, 'Đã cập nhật yêu cầu.');
    },
    requestReject: (id) =>
      show(
        'Từ chối yêu cầu',
        field('Lý do từ chối', 'note', '', { type: 'textarea', required: true }),
        {
          submitLabel: 'Từ chối',
          submit: (values) => {
            MockApi.requestAction(id, 'reject', values);
            returnToRequest(id, 'Đã từ chối yêu cầu.');
          },
        },
      ),
    requestComment: (id) =>
      show('Viết bình luận', field('Nội dung', 'note', '', { type: 'textarea', required: true }), {
        submitLabel: 'Gửi',
        submit: (values) => {
          MockApi.requestAction(id, 'comment', values);
          returnToRequest(id, 'Đã gửi bình luận.');
        },
      }),
    requestAssign: (id) => {
      const data = MockApi.snapshot();
      const row = byId(data, 'requests', id);
      show(
        'Giao người xử lý',
        field('Người xử lý', 'assigneeId', row.assigneeId, {
          options: empOptions(
            data,
            data.employees
              .filter((employee) => employee.departmentId === row.departmentId)
              .map((employee) => employee.id),
          ),
          required: true,
        }),
        {
          submit: (values) => {
            MockApi.requestAction(id, 'assign', values);
            returnToRequest(id, 'Đã giao người xử lý.');
          },
        },
      );
    },
    requestConvert: (id) => {
      const data = MockApi.snapshot();
      show(
        'Chuyển thành task',
        field('Dự án', 'projectId', '', {
          options: [['', 'Chọn dự án'], ...options(data.projects)],
          required: true,
        }) + field('Hạn hoàn thành', 'dueDate', '', { type: 'date' }),
        {
          glyph: 'task_alt',
          submit: (values) => {
            MockApi.requestAction(id, 'convert', values);
            returnToRequest(id, 'Đã tạo công việc từ yêu cầu.');
          },
        },
      );
    },
    requestHandover: (id) => {
      const data = MockApi.snapshot();
      show(
        'Bàn giao tài sản theo yêu cầu',
        field('Tài sản', 'assetId', '', {
          options: [
            ['', 'Chọn tài sản'],
            ...options(data.assets.filter((row) => row.status === 'Available')),
          ],
          required: true,
        }) +
          field('Ngày bàn giao', 'assignedOn', today(), {
            type: 'date',
            required: true,
            max: today(),
          }) +
          field('Hạn trả', 'expectedReturnOn', '', { type: 'date' }),
        {
          glyph: 'inventory_2',
          submit: (values) => {
            MockApi.requestAction(id, 'handover', values);
            returnToRequest(id, 'Đã bàn giao và hoàn thành yêu cầu.');
          },
        },
      );
    },
    notice: (id) => {
      const row = byId(MockApi.snapshot(), 'notifications', id);
      if (!row) return;
      MockApi.markRead(id);
      refresh();
      go(row.route, row.target);
    },
  });
})();
