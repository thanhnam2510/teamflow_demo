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
    dayGrid,
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
          act('approve|' + key + '|' + row.id, 'Duyệt', 'check', 'btn sm') +
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
    const values = period.map((day) =>
      sumMinutes(rows.filter((row) => row.workDate === day && row.status !== 'Rejected')),
    );
    const ceiling = Math.max(1, ...values);
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
        '<h2>Theo ngày</h2><div class="report-axis">' +
          values
            .map(
              (value, i) =>
                '<div title="' +
                h(fmtDate(period[i]) + ' · ' + hours(value)) +
                '"><span style="height:' +
                Math.round((value * 100) / ceiling) +
                '%"></span><small>' +
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
        dayGrid(
          data,
          date,
          'month',
          userLogs,
          (row) => row.workDate,
          (row) =>
            act(
              'logDetail|' + row.id,
              hours(row.minutes) + ' · ' + (lookupTask(data, row.taskId)?.code || ''),
              '',
              'cal-entry ' + row.status.toLowerCase(),
            ),
          'logForm',
        );
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
        group.map(([key, glyph]) => [key, raw('assets.tabs.' + key), glyph]),
        tab,
      ) +
      '</div>';
    let body;
    if (tab === 'categories') {
      body = panel(
        table(
          ['Danh mục', 'Số tài sản', 'Chu kỳ bảo trì', ''],
          data.categories.map((row) => [
            h(row.name),
            String(data.assets.filter((item) => item.categoryId === row.id).length),
            row.intervalMonths ? h(row.intervalMonths + ' tháng') : '—',
            iconBtn('categoryForm|' + row.id, 'Sửa danh mục', 'edit'),
          ]),
        ),
      );
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
      );
    } else {
      const rows = data.assets.filter(
        (row) =>
          (tab !== 'attention' || assetWarnings(data, row).length) &&
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
      body =
        '<div class="toolbar">' +
        searchField('assetQuery', raw('assets.search')) +
        filter('assetStatus', 'Trạng thái', [
          ['', 'Tất cả trạng thái'],
          ...['Available', 'Assigned', 'InRepair', 'Disposed', 'Lost'].map((status) => [
            status,
            raw('assets.status.' + status),
          ]),
        ]) +
        filter('assetCategory', 'Danh mục', [
          ['', 'Tất cả danh mục'],
          ...options(data.categories),
        ]) +
        '</div>' +
        panel(
          table(
            ['Mã tài sản', 'Tên tài sản', 'Danh mục', 'Trạng thái', 'Người đang giữ', 'Giá mua'],
            page.rows.map((row) => [
              link('assets/' + row.id, row.code, '', 'plain-button'),
              '<span class="stack"><strong>' +
                h(row.name) +
                '</strong><small>' +
                h(row.serial) +
                '</small></span>' +
                (tab === 'attention'
                  ? assetWarnings(data, row)
                      .map((label) => chip(label, 'amber'))
                      .join(' ')
                  : ''),
              h(byId(data, 'categories', row.categoryId)?.name),
              statusTag('assets', row.status),
              h(empName(data, row.holderId)),
              h(money(row.price)),
            ]),
          ) + page.foot,
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
    return (
      crumbs([
        ['assets', raw('assets.title')],
        [null, row.code],
      ]) +
      header(
        row.name,
        row.code,
        act('assetForm|' + row.id, raw('common.edit'), 'edit') +
          (row.status === 'Available'
            ? act('handover|' + row.id, 'Bàn giao', 'assignment_ind', 'btn primary')
            : row.status === 'Assigned'
              ? act('returnAsset|' + row.id, 'Thu hồi', 'assignment_return', 'btn primary')
              : '') +
          D.assetDetailActions(data, row),
      ) +
      '<div class="split">' +
      panel('<h2>' + t('assets.detail.info') + '</h2>' + assetInfo(data, row, true)) +
      panel(
        '<h2>' +
          t('assets.detail.history') +
          '</h2>' +
          (row.history
            .map(
              (event) =>
                '<div class="item-line"><div class="stack"><strong>' +
                h(event.text) +
                '</strong><small>' +
                fmtDate(event.date) +
                '</small></div></div>',
            )
            .join('') || '<p class="muted">Chưa có lịch sử.</p>'),
      ) +
      '</div>' +
      D.assetDetailPanels(data, row)
    );
  }
  function myAssets(data) {
    const rows = data.assets.filter((row) => row.holderId === data.currentUserId);
    return (
      header(raw('nav.myAssets'), 'Tài sản bạn đang giữ và cần xác nhận đã nhận.') +
      (rows.length
        ? '<div class="card-grid">' +
          rows
            .map((row) =>
              panel(
                '<h2>' +
                  h(row.name) +
                  '</h2><p class="muted">' +
                  h(row.code) +
                  '</p>' +
                  statusTag('assets', row.status) +
                  actionsRow(
                    act('asset|' + row.id, 'Xem chi tiết', 'devices', 'btn sm') +
                      (!row.confirmed
                        ? act(
                            'confirmAsset|' + row.id,
                            'Xác nhận đã nhận',
                            'check',
                            'btn sm primary',
                          )
                        : chip('Đã xác nhận', 'emerald')),
                  ),
              ),
            )
            .join('') +
          '</div>'
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
    const summary = stats([
      stat('Ngân sách', money(info.limit), 'account_balance_wallet', 'indigo'),
      stat('Đã chi', money(info.spent), 'payments', 'amber'),
      stat('Chi phí nhân sự', money(info.labor), 'schedule', 'emerald'),
      stat('Chi phí khác', money(info.other), 'receipt_long', 'rose'),
    ]);
    const details =
      panel(
        '<div class="toolbar"><strong>' +
          t('budgets.list.usage') +
          ' ' +
          Math.round(info.percent) +
          '%</strong>' +
          statusTag('budgets', budgetStatus(info)) +
          '<span class="spacer"></span>' +
          act('setBudget|' + project.id, 'Đặt ngân sách', 'edit', 'btn sm') +
          '</div>' +
          bar(info.percent),
      ) +
      panel(
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
      details +
      D.budgetReports(data, project)
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
              link('budgets/' + project.id, project.name, 'folder_open', 'plain-button'),
              h(money(value.limit)),
              h(money(value.spent)),
              '<strong>' + Math.round(value.percent) + '%</strong>' + bar(value.percent),
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
  function requests(data, id) {
    if (id && state.view.openedRequest !== id) {
      state.view.openedRequest = id;
      queueMicrotask(() => {
        if (state.route === 'requests/' + id) openRequest(id, true);
      });
    }
    const tab =
      state.view.requestTab ||
      (id && byId(data, 'requests', id)?.requesterId !== data.currentUserId ? 'inbox' : 'mine');
    const choices = [
      ['mine', 'outbox'],
      ['inbox', 'move_to_inbox'],
      ['templates', 'dynamic_form'],
    ];
    const toolbar =
      '<div class="toolbar">' +
      tabs(
        'requestTab',
        choices.map(([key, glyph]) => [key, raw('requests.tabs.' + key), glyph]),
        tab,
      ) +
      '</div>';
    const action =
      tab === 'templates'
        ? act('templateForm', 'Mẫu yêu cầu mới', 'dynamic_form', 'btn primary')
        : act('newRequest', raw('requests.new.button') || 'Tạo yêu cầu', 'add', 'btn primary');
    if (tab === 'templates')
      return (
        header(raw('requests.title'), raw('requests.subtitle'), action) +
        toolbar +
        '<div class="card-grid">' +
        data.templates.map((row) => requestTemplateCard(data, row)).join('') +
        '</div>'
      );
    const rows = data.requests.filter(
      (row) =>
        (tab === 'mine'
          ? row.requesterId === data.currentUserId
          : row.requesterId !== data.currentUserId) &&
        (!state.view.requestStatus || row.status === state.view.requestStatus) &&
        matches(state.view.requestQuery, row.title, row.code),
    );
    const page = paginate('requestPage', rows);
    return (
      header(raw('requests.title'), raw('requests.subtitle'), action) +
      toolbar +
      '<div class="toolbar">' +
      searchField('requestQuery', raw('requests.search')) +
      filter('requestStatus', 'Trạng thái', [
        ['', 'Tất cả trạng thái'],
        ...['Pending', 'Approved', 'Done', 'Rejected', 'Cancelled'].map((status) => [
          status,
          raw('requests.status.' + status),
        ]),
      ]) +
      '</div>' +
      panel(
        table(
          ['Mã', 'Tiêu đề', 'Bộ phận', 'Người gửi', 'Trạng thái', 'Ngày gửi'],
          page.rows.map((row) => [
            act('request|' + row.id, row.code, '', 'plain-button'),
            act('request|' + row.id, row.title, '', 'plain-button'),
            h(department(data, row.departmentId)),
            h(empName(data, row.requesterId)),
            statusTag('requests', row.status),
            fmtDate(row.createdAt),
          ]),
          'Chưa có yêu cầu phù hợp.',
        ) + page.foot,
      )
    );
  }
  function openRequest(id, direct = false) {
    const data = MockApi.snapshot();
    const row = byId(data, 'requests', id);
    if (!row) {
      if (direct)
        show(
          'Không tìm thấy yêu cầu',
          placeholder('Yêu cầu đã thay đổi hoặc không còn trong dữ liệu demo.'),
        );
      return;
    }
    const task = row.taskId ? lookupTask(data, row.taskId) : null;
    const unlockedAssets = data.assets.some((asset) => asset.status === 'Available');
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
        (row.templateId === 'equipment' && unlockedAssets
          ? act('requestHandover|' + id, raw('requests.detail.handOverAsset'), 'inventory_2')
          : '');
    show(
      row.code + ' · ' + row.title,
      statusTag('requests', row.status) +
        definitions([
          [raw('requests.detail.requester'), h(empName(data, row.requesterId))],
          [raw('requests.detail.department'), h(department(data, row.departmentId))],
          [raw('requests.detail.handlers'), h(empName(data, row.assigneeId))],
          [raw('requests.detail.sentAt'), fmtDate(row.createdAt)],
          ...(task
            ? [
                [
                  'Công việc',
                  act(
                    'task|' + task.id,
                    task.code + ' · ' + task.title,
                    'task_alt',
                    'plain-button',
                  ),
                ],
              ]
            : []),
        ]) +
        '<h3>' +
        t('requests.detail.answers') +
        '</h3>' +
        definitions(
          row.answers.map((answer) => [
            answer.label,
            answer.files?.length ? D.attachmentRows(answer.files) : h(answer.value || '—'),
          ]),
        ) +
        actionsRow(controls) +
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
        act('requestComment|' + id, 'Viết bình luận', 'chat_bubble_outline', 'btn sm'),
      { glyph: 'move_to_inbox', drawer: true },
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
    refresh(message);
    openRequest(id);
  };
  Object.assign(actions, {
    logForm: (date) => logForm(str(date) || today()),
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
