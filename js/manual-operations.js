'use strict';

(() => {
  const D = Demo;
  const {
    state,
    views,
    actions,
    h,
    raw,
    icon,
    link,
    act,
    iconBtn,
    byId,
    person,
    matches,
    fmtDate,
    money,
    hours,
    chip,
    bar,
    header,
    panel,
    table,
    tabs,
    searchField,
    filter,
    stats,
    stat,
    field,
    show,
    confirm,
    refresh,
    render,
    go,
    today,
    shift,
    from,
    uid,
    clean,
    audit,
    lookup,
    actionRow,
  } = D;
  const { snapshot, commit, canReview, leaveDays, remainingLeave } = MockApi;
  const text = new TextEncoder();
  const str = (value) => (typeof value === 'string' ? value : '');
  const checkBox = (label, name, checked = false) =>
    field(label, name, checked, { type: 'checkbox' });
  function parseDuration(value) {
    const parsed = String(value).trim().toLowerCase().replaceAll(' ', '').replace(',', '.');
    let match;
    if ((match = /^(\d+)(?:h|:)(\d{1,2})?$/.exec(parsed))) {
      const minutes = Number(match[2] || 0);
      if (minutes >= 60) throw Error('Số phút trong giờ phải nhỏ hơn 60.');
      return Number(match[1]) * 60 + minutes;
    }
    if ((match = /^(\d+)(?:m|p)$/.exec(parsed))) return Number(match[1]);
    if (/^\d+\.\d+$/.test(parsed)) return Math.round(Number(parsed) * 60);
    if (/^\d+$/.test(parsed)) return Number(parsed) <= 24 ? Number(parsed) * 60 : Number(parsed);
    throw Error('Nhập thời lượng như 1h30, 45m hoặc 1:30.');
  }
  function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ -1) >>> 0;
  }
  function zip(entries) {
    const content = [];
    const catalog = [];
    let offset = 0;
    let directorySize = 0;
    for (const [path, body] of entries) {
      const name = text.encode(path);
      const bytes = typeof body === 'string' ? text.encode(body) : body;
      const checksum = crc32(bytes);
      const local = new Uint8Array(30);
      const l = new DataView(local.buffer);
      l.setUint32(0, 0x04034b50, true);
      l.setUint16(4, 20, true);
      l.setUint16(6, 0x800, true);
      l.setUint32(14, checksum, true);
      l.setUint32(18, bytes.length, true);
      l.setUint32(22, bytes.length, true);
      l.setUint16(26, name.length, true);
      const directory = new Uint8Array(46);
      const c = new DataView(directory.buffer);
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x800, true);
      c.setUint32(16, checksum, true);
      c.setUint32(20, bytes.length, true);
      c.setUint32(24, bytes.length, true);
      c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      content.push(local, name, bytes);
      catalog.push(directory, name);
      offset += local.length + name.length + bytes.length;
      directorySize += directory.length + name.length;
    }
    const end = new Uint8Array(22);
    const e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, entries.length, true);
    e.setUint16(10, entries.length, true);
    e.setUint32(12, directorySize, true);
    e.setUint32(16, offset, true);
    return new Blob([...content, ...catalog, end]);
  }
  function downloadBlob(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function xlsx(name, sheets) {
    const declarations =
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      sheets
        .map(
          (_, i) =>
            '<Override PartName="/xl/worksheets/sheet' +
            (i + 1) +
            '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
        )
        .join('') +
      '</Types>';
    const relationNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const dir = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const worksheetNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const workbook =
      '<workbook xmlns="' +
      worksheetNS +
      '" xmlns:r="' +
      relationNS +
      '"><sheets>' +
      sheets
        .map(
          ([label], i) =>
            '<sheet name="' + h(label) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>',
        )
        .join('') +
      '</sheets></workbook>';
    const entries = [
      ['[Content_Types].xml', declarations],
      [
        '_rels/.rels',
        '<Relationships xmlns="' +
          dir +
          '"><Relationship Id="rId1" Type="' +
          relationNS +
          '/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ],
      ['xl/workbook.xml', workbook],
      [
        'xl/_rels/workbook.xml.rels',
        '<Relationships xmlns="' +
          dir +
          '">' +
          sheets
            .map((_, i) => {
              const sequence = i + 1;
              return (
                '<Relationship Id="rId' +
                sequence +
                '" Type="' +
                relationNS +
                '/worksheet" Target="worksheets/sheet' +
                sequence +
                '.xml"/>'
              );
            })
            .join('') +
          '</Relationships>',
      ],
    ];
    for (const [i, [, rows]] of sheets.entries())
      entries.push([
        'xl/worksheets/sheet' + (i + 1) + '.xml',
        '<worksheet xmlns="' +
          worksheetNS +
          '"><sheetData>' +
          rows
            .map(
              (row, n) =>
                '<row r="' +
                (n + 1) +
                '">' +
                row
                  .map((value) =>
                    typeof value === 'number' && Number.isFinite(value)
                      ? '<c><v>' + value + '</v></c>'
                      : '<c t="inlineStr"><is><t xml:space="preserve">' +
                        h(
                          String(value ?? '').replace(
                            /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,
                            '',
                          ),
                        ) +
                        '</t></is></c>',
                  )
                  .join('') +
                '</row>',
            )
            .join('') +
          '</sheetData></worksheet>',
      ]);
    downloadBlob(name, zip(entries));
  }
  function reports(data, date) {
    const week = state.view.sheetMode !== 'month';
    const start = week ? D.monday(date) : date.slice(0, 7) + '-01';
    const finish = week ? shift(start, 7) : D.monthStep(start, 1);
    const days = [];
    for (let day = start; day < finish; day = shift(day, 1)) days.push(day);
    const scope = state.view.sheetScope || 'mine';
    const includePending = state.view.sheetPending !== false;
    const list = data.employees.filter(
      (employee) =>
        (scope === 'all'
          ? person(data, data.currentUserId).role === 'Admin'
          : scope === 'team'
            ? canReview(data, employee.id)
            : employee.id === data.currentUserId) &&
        (!state.view.sheetDept || employee.departmentId === state.view.sheetDept),
    );
    const logs = data.worklogs.filter(
      (row) =>
        row.workDate >= start &&
        row.workDate < finish &&
        list.some((employee) => employee.id === row.userId) &&
        (row.status === 'Approved' || (includePending && row.status === 'Pending')) &&
        (!state.view.sheetProject ||
          byId(data, 'tasks', row.taskId)?.projectId === state.view.sheetProject),
    );
    const perPerson = list.map((employee) => {
      const recorded = days.map((day) =>
        logs
          .filter((row) => row.userId === employee.id && row.workDate === day)
          .reduce((total, row) => total + row.minutes, 0),
      );
      const standard = days.map((day) => {
        const weekday = from(day).getDay();
        if (day > today() || weekday === 0 || weekday === 6) return 0;
        const leave = data.leave.find(
          (row) =>
            row.userId === employee.id &&
            row.status === 'Approved' &&
            row.startDate <= day &&
            row.endDate >= day,
        );
        return leave ? (leave.period && leave.period !== 'Cả ngày' ? 240 : 0) : 480;
      });
      const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);
      return { employee, recorded, standard, total: sum(recorded), target: sum(standard) };
    });
    return { set: perPerson, days, logs, start };
  }
  function timesheet(data, date, monthToolbar) {
    const { set, days } = reports(data, date);
    const total = set.reduce((sum, row) => sum + row.total, 0);
    const target = set.reduce((sum, row) => sum + row.target, 0);
    const isWeek = state.view.sheetMode !== 'month';
    const manager = data.employees.some((row) => canReview(data, row.id));
    const admin = person(data, data.currentUserId).role === 'Admin';
    const weekday = new Intl.DateTimeFormat(state.lang === 'vi' ? 'vi-VN' : 'en-GB', {
      weekday: 'short',
    });
    const dayCell = (value, standard, day) => {
      const variant =
        day > today()
          ? 'future'
          : !standard
            ? 'off'
            : !value
              ? 'missing'
              : value < standard
                ? 'short'
                : 'enough';
      const label = value ? h(hours(value)) : '<span aria-label="Chưa ghi giờ">—</span>';
      return '<span class="sheet-day sheet-day--' + variant + '">' + label + '</span>';
    };
    const summary = [
      ['Tổng giờ đã log', hours(total)],
      ['Giờ chuẩn đến hôm nay', hours(target)],
      ['Chênh lệch đến hôm nay', hours(total - target), total < target],
      [
        'Người còn thiếu giờ',
        set.filter((row) => row.total < row.target).length + '/' + set.length,
      ],
    ];
    return (
      '<div class="toolbar sheet-toolbar">' +
      filter('sheetScope', 'Phạm vi', [
        ['mine', 'Của tôi'],
        ...(manager ? [['team', 'Nhóm của tôi']] : []),
        ...(admin ? [['all', 'Toàn công ty']] : []),
      ]) +
      filter('sheetDept', 'Phòng ban', [['', 'Tất cả phòng ban'], ...D.options(data.departments)]) +
      filter('sheetProject', 'Dự án', [['', 'Tất cả dự án'], ...D.options(data.projects)]) +
      act(
        'sheetInclude',
        'Gồm giờ chờ duyệt',
        state.view.sheetPending !== false ? 'toggle_on' : 'toggle_off',
        'btn sm sheet-toggle',
      ) +
      '<span class="spacer"></span>' +
      tabs(
        'sheetMode',
        [
          ['week', 'Tuần'],
          ['month', 'Tháng'],
        ],
        isWeek ? 'week' : 'month',
      ) +
      (isWeek
        ? '<div class="row-actions">' +
          iconBtn('sheetShift|-1', 'Tuần trước', 'chevron_left') +
          '<strong>' +
          fmtDate(days[0]) +
          ' – ' +
          fmtDate(days.at(-1)) +
          '</strong>' +
          iconBtn('sheetShift|1', 'Tuần sau', 'chevron_right') +
          '</div>'
        : monthToolbar('logMonth', date)) +
      '</div><div class="sheet-summary">' +
      summary
        .map(
          ([label, value, warn]) =>
            '<div><strong' +
            (warn ? ' class="sheet-short"' : '') +
            '>' +
            h(value) +
            '</strong><small>' +
            h(label) +
            '</small></div>',
        )
        .join('') +
      act('timesheetXlsx', 'Xuất Excel', 'download', 'btn primary sheet-export') +
      '</div>' +
      panel(
        table(
          [
            'Nhân viên',
            ...days.map((day) =>
              isWeek ? weekday.format(from(day)) + ' ' + D.shortDate(day) : D.shortDate(day),
            ),
            'Tổng',
            'Chuẩn',
            'Chênh lệch',
          ],
          set.map((row) => [
            D.accountCell(data, row.employee.id),
            ...row.recorded.map((value, index) => dayCell(value, row.standard[index], days[index])),
            '<strong>' + h(hours(row.total)) + '</strong>',
            h(hours(row.target)),
            '<strong' +
              (row.total < row.target ? ' class="sheet-short"' : '') +
              '>' +
              h(hours(row.total - row.target)) +
              '</strong>',
          ]),
        ),
        'timesheet-manual reference-table',
      )
    );
  }
  const leaveTypes = ['Nghỉ phép năm', 'Nghỉ ốm', 'Nghỉ không lương', 'Nghỉ khác'];
  function leavesView(data) {
    const mine = data.leave.filter((row) => row.userId === data.currentUserId);
    const year = state.view.leaveYear || today().slice(0, 4);
    const manager = data.employees.some((row) => canReview(data, row.id));
    const admin = person(data, data.currentUserId).role === 'Admin';
    const leaveTab = state.view.leaveTab || 'mine';
    const people = data.employees.filter(
      (row) =>
        canReview(data, row.id) &&
        (!state.view.leaveDept || row.departmentId === state.view.leaveDept),
    );
    const balance = remainingLeave(data, data.currentUserId, year);
    const isAnnual = (row) => row.type === leaveTypes[0] && row.startDate.startsWith(year);
    const used = mine
      .filter((row) => row.status === 'Approved' && isAnnual(row))
      .reduce((sum, row) => sum + leaveDays(row), 0);
    const pending = mine
      .filter((row) => row.status === 'Pending')
      .reduce((sum, row) => sum + leaveDays(row), 0);
    const next = mine
      .filter((row) => row.status === 'Approved' && row.endDate >= today())
      .sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
    const allowance = balance + used;
    const progress = allowance > 0 ? Math.max(0, Math.min(100, (balance * 100) / allowance)) : 0;
    const summary =
      panel(
        '<div class="leave-balance-ring" style="--remaining:' +
          progress +
          '%"><strong>' +
          h(balance) +
          '</strong><small>/ ' +
          h(allowance) +
          '</small></div><div class="leave-balance-main">' +
          '<small>' +
          icon('beach_access') +
          'PHÉP NĂM ' +
          h(year) +
          '</small><strong>Còn ' +
          h(balance + '/' + allowance) +
          ' ngày</strong>' +
          bar(progress, '#0ea5e9') +
          '<p>Đã dùng ' +
          h(used) +
          ' ngày · Đang chờ ' +
          h(pending) +
          ' ngày</p></div>',
        'leave-balance',
      ) +
      stats([
        stat('Đang chờ duyệt', pending + ' ngày', 'schedule', 'amber'),
        stat(
          'Kỳ nghỉ sắp tới',
          next ? fmtDate(next.startDate) : 'Chưa có',
          'event_available',
          'emerald',
        ),
      ]);
    const managing =
      '<div class="toolbar">' +
      filter('leaveDept', 'Phòng ban', [['', 'Tất cả phòng ban'], ...D.options(data.departments)]) +
      filter(
        'leaveYear',
        'Năm',
        [-1, 0, 1].map((delta) => [
          String(Number(today().slice(0, 4)) + delta),
          String(Number(today().slice(0, 4)) + delta),
        ]),
      ) +
      act('leaveExport', 'Xuất Excel', 'download', 'btn primary') +
      '</div>' +
      panel(
        table(
          ['Nhân viên', 'Phòng ban', 'Còn lại', ''],
          people.map((row) => [
            D.accountCell(data, row.id),
            h(byId(data, 'departments', row.departmentId)?.name),
            h(remainingLeave(data, row.id, year) + ' ngày'),
            admin
              ? act('leaveAllowance|' + row.id + '|' + year, 'Chỉnh phép năm', 'edit', 'btn sm')
              : '',
          ]),
        ),
      );
    const own =
      summary +
      panel(
        '<h2>Đơn nghỉ phép của tôi</h2>' +
          table(
            ['Loại nghỉ', 'Thời gian', 'Số ngày', 'Trạng thái', 'Lý do', ''],
            mine.map((row) => [
              h(row.type),
              fmtDate(row.startDate) + ' – ' + fmtDate(row.endDate),
              h(String(leaveDays(row))),
              D.statusTag('leaves', row.status),
              h(row.reason || ''),
              row.status === 'Pending'
                ? act('leaveCancel|' + row.id, 'Hủy đơn', 'close', 'btn sm danger')
                : '',
            ]),
          ),
      );
    return (
      header(
        raw('leaves.title'),
        raw('leaves.subtitle'),
        act('leaveForm', raw('leaves.create'), 'add', 'btn primary'),
      ) +
      (manager
        ? '<div class="toolbar">' +
          tabs(
            'leaveTab',
            [
              ['mine', 'Của tôi', 'beach_access'],
              ['manage', 'Quản lý phép', 'manage_accounts'],
            ],
            leaveTab,
          ) +
          '</div>'
        : '') +
      (leaveTab === 'manage' && manager ? managing : own)
    );
  }
  function leaveForm() {
    const data = snapshot();
    show(
      'Xin nghỉ',
      '<div class="leave-kind">' +
        leaveTypes
          .map(
            (name, i) =>
              '<label><input type="radio" name="type" value="' +
              h(name) +
              '"' +
              (!i ? ' checked' : '') +
              '>' +
              icon(['beach_access', 'medical_services', 'payments', 'event'][i]) +
              h(name) +
              '</label>',
          )
          .join('') +
        '</div>' +
        '<div class="field-grid">' +
        field('Từ ngày', 'startDate', today(), {
          type: 'date',
          required: true,
          min: shift(today(), -30),
        }) +
        field('Đến ngày', 'endDate', today(), { type: 'date', required: true }) +
        '</div>' +
        field('Thời gian nghỉ', 'period', 'Cả ngày', {
          options: ['Cả ngày', 'Buổi sáng', 'Buổi chiều'].map((value) => [value, value]),
        }) +
        '<p id="leave-preview" class="muted"></p>' +
        field('Lý do', 'reason', '', { type: 'textarea', required: true }),
      {
        glyph: 'beach_access',
        submitLabel: 'Gửi đơn',
        submit: (values) => {
          MockApi.saveLeave(values);
          refresh('Đã gửi đơn nghỉ phép.');
        },
      },
    );
    const update = () => {
      const form = D.dialog.querySelector('form');
      const values = Object.fromEntries(new FormData(form));
      const valid =
        values.startDate && values.endDate && values.endDate <= shift(values.startDate, 59);
      form.querySelector('#leave-preview').textContent =
        'Số ngày nghỉ: ' +
        (valid ? leaveDays(values) : '—') +
        ' · Phép năm còn ' +
        remainingLeave(data, data.currentUserId, (values.startDate || today()).slice(0, 4)) +
        ' ngày.';
    };
    D.dialog.querySelector('form').addEventListener('change', update);
    update();
  }
  const conditions = ['Mới', 'Tốt', 'Trung bình', 'Hư hỏng nhẹ', 'Hỏng'];
  const assetCondition = (value) =>
    field('Tình trạng', 'condition', value || 'Tốt', {
      options: conditions.map((name) => [name, name]),
    });
  const assetExtraFields = (row) =>
    '<div class="field-grid">' +
    field('Nhà cung cấp', 'supplier', row.supplier) +
    field('Bảo hành đến', 'warrantyUntil', row.warrantyUntil, { type: 'date' }) +
    field('Chu kỳ bảo trì (ngày)', 'interval', row.interval || '', { type: 'number', min: 1 }) +
    assetCondition(row.condition) +
    '</div>' +
    field('Ghi chú', 'note', row.note, { type: 'textarea' });
  function assetDetailActions(row) {
    if (row.status === 'Disposed') return '';
    const actions = [];
    if (row.status !== 'Lost')
      actions.push(act('assetStatus|' + row.id + '|lost', 'Đánh dấu thất lạc', 'report'));
    if (row.status !== 'Assigned')
      actions.push(act('assetStatus|' + row.id + '|dispose', 'Thanh lý', 'recycling'));
    if (
      row.status === 'Available' &&
      !row.everUsed &&
      !row.maintenance?.length &&
      !(row.history || []).some((event) => /bàn giao|thu hồi/i.test(event.text))
    )
      actions.push(act('assetStatus|' + row.id + '|delete', 'Xóa tài sản', 'delete'));
    return (
      '<details class="asset-more"><summary class="icon-btn" aria-label="Tùy chọn tài sản">' +
      icon('more_vert') +
      '</summary><div>' +
      actions.join('') +
      '</div></details>'
    );
  }
  function assetMaintenancePanel(row) {
    return panel(
      '<h2>Bảo trì & sửa chữa</h2>' +
        table(
          ['Ngày', 'Loại', 'Nội dung', 'Trạng thái', ''],
          (row.maintenance || []).map((ticket) => [
            fmtDate(ticket.date),
            h(ticket.kind),
            h(ticket.note),
            chip(ticket.status, 'indigo'),
            actionRow(
              (ticket.status === 'Đã lên lịch'
                ? act(
                    'maintenanceState|' + row.id + '|' + ticket.id + '|start',
                    'Bắt đầu',
                    'build',
                    'btn sm',
                  )
                : '') +
                (['Đã lên lịch', 'Đang thực hiện'].includes(ticket.status)
                  ? act(
                      'maintenanceState|' + row.id + '|' + ticket.id + '|cancel',
                      'Hủy phiếu',
                      'close',
                      'btn sm',
                    )
                  : ''),
            ),
          ]),
          'Chưa có phiếu bảo trì.',
        ),
    );
  }
  function assetQrPanel(row) {
    return panel(
      '<h2>Mã QR</h2><img class="asset-qr" data-asset-qr="' +
        h(row.id) +
        '" alt="Mã QR của ' +
        h(row.code) +
        '"><p>Quét mã để mở tài sản ' +
        h(row.code) +
        '.</p><div class="qr__actions">' +
        act('assetPrint|' + row.id, 'In tem QR', 'print') +
        '</div>',
      'qr',
    );
  }
  const assetHistory = (row, textValue) => row.history.push({ date: today(), text: textValue });
  function assetUpdate(id, action) {
    const labels = {
      finish: 'Ghi nhận sửa xong',
      found: 'Đã tìm thấy',
      lost: 'Đánh dấu thất lạc',
      dispose: 'Thanh lý',
      delete: 'Xóa tài sản',
    };
    const title = labels[action];
    show(
      title,
      '<p>Thao tác sẽ được lưu vào lịch sử tài sản.</p>' +
        (['lost', 'dispose'].includes(action)
          ? field('Lý do', 'reason', '', { type: 'textarea', required: true })
          : ''),
      {
        glyph: 'inventory_2',
        submitLabel: title,
        submit: (values) => {
          commit((data) => {
            const row = lookup(data, 'assets', id);
            if (row.status === 'Disposed') throw Error('Tài sản đã thanh lý.');
            if (action === 'delete') {
              if (
                row.status !== 'Available' ||
                row.maintenance?.length ||
                row.everUsed ||
                row.history.some((item) => /bàn giao|thu hồi/i.test(item.text))
              )
                throw Error('Chỉ xóa được tài sản trong kho chưa có lịch sử sử dụng.');
              data.assets = data.assets.filter((item) => item.id !== id);
              return;
            }
            if (action === 'dispose' && row.status === 'Assigned')
              throw Error('Thu hồi thiết bị trước khi thanh lý.');
            if (action === 'finish' && row.status !== 'InRepair')
              throw Error('Tài sản chưa vào bảo trì.');
            if (action === 'found' && row.status !== 'Lost')
              throw Error('Tài sản chưa được đánh dấu thất lạc.');
            row.status = {
              finish: 'Available',
              found: 'Available',
              lost: 'Lost',
              dispose: 'Disposed',
            }[action];
            if (action === 'lost') {
              row.holderId = '';
              row.confirmed = false;
            }
            for (const ticket of row.maintenance || []) {
              if (['Đã lên lịch', 'Đang thực hiện'].includes(ticket.status))
                ticket.status = action === 'finish' ? 'Hoàn tất' : 'Đã hủy';
            }
            assetHistory(row, title + (values.reason ? ' · ' + values.reason.trim() : ''));
            audit(data, title + ' ' + row.code, 'Tài sản');
          });
          if (action === 'delete') go('assets');
          refresh('Đã cập nhật thiết bị.');
        },
      },
    );
  }
  function handleQr(scope = document) {
    for (const image of scope.querySelectorAll('img[data-asset-qr]:not([src])')) {
      const url = new URL(location.href);
      url.hash = '#/assets/' + encodeURIComponent(image.dataset.assetQr);
      const qr = globalThis.TeamFlowQR;
      if (qr)
        qr.toDataURL(url.href, { width: 140, margin: 1 })
          .then((result) => {
            image.src = result;
          })
          .catch(() => {});
    }
  }
  const qrObserver = new MutationObserver((records) => {
    if (
      records.some((record) =>
        [...record.addedNodes].some(
          (node) =>
            node.nodeType === 1 &&
            (node.matches('img[data-asset-qr]') || node.querySelector('[data-asset-qr]')),
        ),
      )
    )
      handleQr();
  });
  qrObserver.observe(document.body, { childList: true, subtree: true });
  function security(data) {
    const rows = data.security.filter(
      (row) =>
        (!state.view.securityCategory || row.category === state.view.securityCategory) &&
        matches(state.view.securityQuery, row.text, person(data, row.actor)?.fullName),
    );
    const categories = [...new Set(data.security.map((row) => row.category).filter(Boolean))];
    const recent = data.security.filter((row) => (row.time || row.date) >= D.shift(today(), -1));
    const signIns = recent.filter((row) => row.category === 'Đăng nhập');
    const failures = signIns.filter((row) => /thất bại|đăng nhập sai/i.test(row.text));
    const admins = data.employees.filter((row) => row.role === 'Admin');
    const permissionChanges = data.security
      .filter((row) => row.category === 'Phân quyền')
      .slice(0, 4);
    const latest = data.backups?.[0];
    return (
      header(
        raw('nav.security'),
        'Theo dõi tài khoản, đăng nhập và các thay đổi trong TeamFlow.',
        link('admin/backups', raw('nav.backups'), 'backup') +
          act('securityExport', 'Xuất nhật ký CSV', 'download', 'btn primary'),
      ) +
      stats([
        stat('Lượt đăng nhập gần đây', signIns.length - failures.length, 'login', 'indigo'),
        stat('Đăng nhập sai gần đây', failures.length, 'gpp_bad', 'rose'),
        stat(
          'Tài khoản bị khóa',
          data.employees.filter((row) => row.locked).length,
          'lock',
          'indigo',
        ),
        stat(
          'Lời mời chờ kích hoạt',
          data.employees.filter((row) => row.invited).length,
          'schedule_send',
          'amber',
        ),
        stat(
          'Không hoạt động 90 ngày',
          data.employees.filter((row) => row.lastLoginAt && row.lastLoginAt < D.shift(today(), -90))
            .length,
          'bedtime',
          'indigo',
        ),
        stat('Sao lưu gần nhất', latest ? fmtDate(latest.at) : 'Chưa có', 'cloud_done', 'emerald'),
      ]) +
      '<div class="security-panels">' +
      panel(
        '<h2>' +
          icon('admin_panel_settings') +
          'Quản trị viên (' +
          admins.length +
          ')</h2>' +
          admins
            .map(
              (row) =>
                '<div class="stack"><strong>' +
                h(row.fullName) +
                '</strong><small>' +
                h(row.email) +
                '</small></div>',
            )
            .join(''),
      ) +
      panel(
        '<h2>' +
          icon('gpp_maybe') +
          'Đăng nhập sai gần đây</h2>' +
          (failures.map((row) => '<p>' + h(row.text) + '</p>').join('') ||
            '<p class="muted">Chưa ghi nhận đăng nhập sai.</p>'),
      ) +
      panel(
        '<h2>' +
          icon('history') +
          'Thay đổi quyền gần đây</h2>' +
          (permissionChanges.map((row) => '<p>' + h(row.text) + '</p>').join('') ||
            '<p class="muted">Chưa ghi nhận thay đổi quyền.</p>'),
      ) +
      '</div>' +
      panel(
        '<h2>Nhật ký</h2><div class="toolbar">' +
          searchField('securityQuery', 'Tìm sự kiện hoặc tên…') +
          filter('securityCategory', 'Nhóm', [
            ['', 'Tất cả nhóm'],
            ...categories.map((value) => [value, value]),
          ]) +
          '</div>' +
          table(
            ['Thời gian', 'Hành động', 'Người thực hiện', 'Nhóm', 'Nguồn'],
            rows.map((row) => [
              h(row.time ? D.localDateTime(row.time) : fmtDate(row.date)),
              h(row.text),
              h(person(data, row.actor)?.fullName || '—'),
              chip(row.category || 'Hệ thống'),
              'Demo',
            ]),
          ),
      )
    );
  }
  function capture(data) {
    const { backups, ...snapshot } = data;
    return snapshot;
  }
  function addBackup(data, kind, content = capture(data), name) {
    const at = new Date().toISOString();
    const item = {
      id: uid('backup'),
      kind,
      at,
      name: name || 'teamflow-demo-' + at.replaceAll(':', '-').slice(0, 19) + '.zip',
      content,
    };
    (data.backups ||= []).unshift(item);
    return item;
  }
  function readBackup(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const utf8 = new TextDecoder('utf-8', { fatal: true });
    let offset = 0;
    while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
      const compression = view.getUint16(offset + 8, true);
      const size = view.getUint32(offset + 18, true);
      const nameSize = view.getUint16(offset + 26, true);
      const extra = view.getUint16(offset + 28, true);
      const start = offset + 30 + nameSize + extra;
      const end = start + size;
      if (end > bytes.length) break;
      if (
        utf8.decode(bytes.subarray(offset + 30, offset + 30 + nameSize)) === 'teamflow-demo.json' &&
        compression === 0
      ) {
        const content = bytes.subarray(start, end);
        if (crc32(content) !== view.getUint32(offset + 14, true))
          throw Error('Tệp sao lưu đã hỏng.');
        const payload = JSON.parse(utf8.decode(content));
        const seed = createDemoData();
        if (
          payload.version !== 1 ||
          !payload.data ||
          Object.keys(seed).some(
            (key) =>
              key !== 'currentUserId' &&
              Array.isArray(seed[key]) &&
              !Array.isArray(payload.data[key]),
          ) ||
          !payload.data.employees.some((row) => row.id === payload.data.currentUserId)
        )
          throw Error('Dữ liệu sao lưu demo không hợp lệ.');
        return Object.assign(seed, payload.data);
      }
      offset = end;
    }
    throw Error('Chọn tệp ZIP do TeamFlow Demo xuất.');
  }
  function backups(data) {
    const rows = data.backups || [];
    return (
      header(
        raw('nav.backups'),
        'Sao lưu dữ liệu giả lập trên trình duyệt.',
        link('admin/security', raw('nav.security'), 'shield') +
          act('backupUpload', 'Tải lên bản sao lưu', 'upload') +
          act('backupNow', 'Sao lưu ngay', 'backup', 'btn primary'),
      ) +
      stats([
        stat(
          'Bản sao lưu gần nhất',
          rows[0] ? fmtDate(rows[0].at) : 'Chưa có',
          'cloud_done',
          'emerald',
        ),
        stat('Lịch sao lưu máy chủ', 'Mô phỏng', 'event_repeat', 'indigo'),
        stat('Bản sao lưu đang lưu', rows.length, 'inventory_2', 'indigo'),
        stat(
          'Dữ liệu bản sao lưu',
          Math.round(new Blob([JSON.stringify(rows)]).size / 1024) + ' KB',
          'storage',
          'indigo',
        ),
      ]) +
      '<p class="backup-note muted">' +
      icon('info') +
      'Tệp ZIP chứa một bản chụp dữ liệu demo trên trình duyệt.</p>' +
      panel(
        table(
          ['Bản sao lưu', 'Loại', 'Thời gian', 'Thao tác'],
          rows.map((row) => [
            h(row.name),
            chip(row.kind, 'indigo'),
            h(D.localDateTime(row.at)),
            actionRow(
              iconBtn('backupDownload|' + row.id, 'Tải xuống', 'download') +
                act('backupRestore|' + row.id, 'Khôi phục', 'restore', 'btn sm') +
                iconBtn('backupDelete|' + row.id, 'Xóa bản sao lưu', 'delete'),
            ),
          ]),
          'Chưa có bản sao lưu.',
        ),
        'reference-table',
      )
    );
  }
  function csv(name, rows) {
    const encoded = rows
      .map((row) =>
        row
          .map((value) => {
            const raw = String(value ?? '');
            const clean = /^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw;
            return '"' + clean.replaceAll('"', '""') + '"';
          })
          .join(','),
      )
      .join('\r\n');
    D.download(name, '\ufeff' + encoded, 'text/csv;charset=utf-8');
  }
  Object.assign(D, {
    parseDuration,
    timesheet,
    leavesView,
    assetCondition,
    assetExtraFields,
    assetDetailActions,
    assetMaintenancePanel,
    assetQrPanel,
    xlsx,
    csv,
  });
  Object.assign(views, {
    'admin/security': security,
    'admin/backups': backups,
    system: () =>
      header(
        raw('nav.system'),
        'Kiểm tra kết nối và trạng thái của bản demo.',
        act('systemCheck', 'Kiểm tra lại', 'refresh'),
      ) +
      '<div class="card-grid">' +
      panel(
        '<h2>' +
          icon('monitor_heart') +
          ' TeamFlow API</h2>' +
          chip('Mock API hoạt động', 'emerald') +
          '<p>Phản hồi cục bộ · ' +
          (state.view.systemMs || '0.1') +
          ' ms</p>',
      ) +
      panel(
        '<h2>' +
          icon('storage') +
          ' Cơ sở dữ liệu MySQL</h2>' +
          chip('Mô phỏng', 'indigo') +
          '<p>Trạng thái kiểm tra · ' +
          h(state.view.systemAt || new Date().toLocaleTimeString('vi-VN')) +
          '</p>',
      ) +
      '</div>',
  });
  Object.assign(actions, {
    logPreset: (value) => {
      D.dialog.querySelector('[name=minutes]').value = value;
    },
    logRemove: (id) =>
      confirm(
        'Xóa giờ làm?',
        'Chỉ có thể xóa giờ làm của bạn chưa được duyệt.',
        () => {
          commit((data) => {
            const row = lookup(data, 'worklogs', id);
            if (row.userId !== data.currentUserId || row.status === 'Approved')
              throw Error('Bản ghi này không thể xóa.');
            data.worklogs = data.worklogs.filter((item) => item.id !== id);
          });
          refresh('Đã xóa giờ làm.');
        },
        'Xóa giờ làm',
      ),
    logSelect: (id) => {
      const selection = (state.view.logSelection ||= new Set());
      if (selection.has(id)) selection.delete(id);
      else selection.add(id);
      render();
    },
    logApproveSelected: () =>
      confirm(
        'Duyệt giờ làm đã chọn?',
        'Đơn giá tại thời điểm duyệt được dùng để tính chi phí dự án.',
        () => {
          const ids = [...(state.view.logSelection || [])];
          commit((data) => {
            for (const id of ids) {
              const row = lookup(data, 'worklogs', id);
              if (row.status !== 'Pending' || !canReview(data, row.userId)) continue;
              row.status = 'Approved';
              row.rate = D.rateAt(data, row.userId, row.workDate);
            }
          });
          state.view.logSelection.clear();
          refresh('Đã duyệt các giờ làm đã chọn.');
        },
        'Duyệt',
      ),
    sheetInclude: () => {
      state.view.sheetPending = state.view.sheetPending === false;
      render();
    },
    sheetShift: (delta) => {
      state.view.logMonth = shift(state.view.logMonth || today(), Number(delta) * 7);
      render();
    },
    timesheetXlsx: () => {
      const data = snapshot();
      const { set, days, logs, start } = reports(data, state.view.logMonth || today());
      xlsx('TeamFlow-Timesheet-' + start + '.xlsx', [
        [
          'Bảng giờ',
          [
            ['Nhân viên', ...days, 'Tổng phút', 'Phút chuẩn'],
            ...set.map((row) => [row.employee.fullName, ...row.recorded, row.total, row.target]),
          ],
        ],
        [
          'Chi tiết',
          [
            ['Nhân viên', 'Ngày', 'Task', 'Phút', 'Trạng thái', 'Ghi chú'],
            ...logs.map((row) => [
              person(data, row.userId)?.fullName,
              row.workDate,
              byId(data, 'tasks', row.taskId)?.code,
              row.minutes,
              raw('worklogs.status.' + row.status),
              row.note,
            ]),
          ],
        ],
      ]);
    },
    leaveForm,
    leaveCancel: (id) =>
      confirm(
        'Hủy đơn nghỉ?',
        'Đơn đang chờ duyệt sẽ chuyển sang Đã hủy.',
        () => {
          commit((data) => {
            const row = lookup(data, 'leave', id);
            if (row.status !== 'Pending' || row.userId !== data.currentUserId)
              throw Error('Đơn này không còn có thể hủy.');
            row.status = 'Cancelled';
          });
          refresh('Đã hủy đơn nghỉ.');
        },
        'Hủy đơn',
      ),
    leaveAllowance: (id, year) => {
      const quota = person(snapshot(), id)?.allowances?.[year] || { annual: 12, carry: 0 };
      show(
        'Chỉnh phép năm ' + year,
        field('Phép năm', 'annual', quota.annual, {
          type: 'number',
          min: 0,
          max: 366,
          step: 0.5,
          required: true,
        }) +
          field('Phép tồn', 'carry', quota.carry, {
            type: 'number',
            min: 0,
            max: 366,
            step: 0.5,
            required: true,
          }),
        {
          glyph: 'beach_access',
          submit: (values) => {
            commit((data) => {
              if (person(data, data.currentUserId).role !== 'Admin')
                throw Error('Chỉ Admin có thể chỉnh phép năm.');
              const user = lookup(data, 'employees', id);
              (user.allowances ||= {})[year] = {
                annual: Number(values.annual),
                carry: Number(values.carry),
              };
              audit(data, 'Đã cập nhật phép năm của ' + user.fullName, 'Phép năm');
            });
            refresh('Đã lưu phép năm.');
          },
        },
      );
    },
    leaveExport: () => {
      const data = snapshot();
      const year = state.view.leaveYear || today().slice(0, 4);
      xlsx('TeamFlow-Phep-nam-' + year + '.xlsx', [
        [
          'Phép năm',
          [
            ['Nhân viên', 'Năm', 'Ngày phép còn'],
            ...data.employees
              .filter(
                (row) =>
                  canReview(data, row.id) &&
                  (!state.view.leaveDept || row.departmentId === state.view.leaveDept),
              )
              .map((row) => [row.fullName, year, remainingLeave(data, row.id, year)]),
          ],
        ],
      ]);
    },
    assetStatus: assetUpdate,
    assetPrint: (assetId) => {
      const rows = snapshot().assets.filter((row) => !str(assetId) || row.id === assetId);
      show(
        'In tem QR',
        '<div class="print-assets">' +
          rows
            .map(
              (row) =>
                '<div class="qr-label"><img class="asset-qr" data-asset-qr="' +
                h(row.id) +
                '" alt="QR"><strong>' +
                h(row.code) +
                '</strong><small>' +
                h(row.name) +
                '</small></div>',
            )
            .join('') +
          '</div>' +
          act('printDialog', 'In tem', 'print', 'btn primary'),
        { wide: true },
      );
    },
    printDialog: () => window.print(),
    maintenanceForm: (id) =>
      show(
        'Lập lịch bảo trì',
        field('Loại', 'kind', 'Sửa chữa', {
          options: [
            ['Sửa chữa', 'Sửa chữa'],
            ['Bảo trì định kỳ', 'Bảo trì định kỳ'],
          ],
        }) +
          field('Ngày dự kiến', 'date', today(), { type: 'date', required: true }) +
          field('Nội dung', 'note', '', { type: 'textarea', required: true }) +
          checkBox('Bắt đầu ngay', 'start'),
        {
          glyph: 'build',
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'assets', id);
              if (row.status !== 'Available')
                throw Error('Chỉ tài sản trong kho mới được lập lịch bảo trì.');
              (row.maintenance ||= []).push({
                id: uid('repair'),
                kind: values.kind,
                date: values.date,
                note: clean(values.note, 'Nội dung', 500),
                status: values.start ? 'Đang thực hiện' : 'Đã lên lịch',
              });
              if (values.start) row.status = 'InRepair';
              assetHistory(row, 'Đã lập lịch bảo trì.');
            });
            refresh('Đã lưu phiếu bảo trì.');
          },
        },
      ),
    maintenanceState: (assetId, id, action) => {
      commit((data) => {
        const row = lookup(data, 'assets', assetId);
        const ticket = row.maintenance.find((item) => item.id === id);
        if (!ticket || !['Đã lên lịch', 'Đang thực hiện'].includes(ticket.status))
          throw Error('Phiếu đã kết thúc.');
        if (action === 'start') {
          if (row.status !== 'Available')
            throw Error('Tài sản cần ở trong kho để bắt đầu bảo trì.');
          row.status = 'InRepair';
          ticket.status = 'Đang thực hiện';
        } else {
          if (ticket.status === 'Đang thực hiện') row.status = 'Available';
          ticket.status = 'Đã hủy';
        }
        assetHistory(row, ticket.status + ' · ' + ticket.kind);
      });
      refresh('Đã cập nhật phiếu bảo trì.');
    },
    securityExport: () => {
      const data = snapshot();
      csv('TeamFlow-Nhat-ky.csv', [
        ['Thời gian', 'Sự kiện', 'Người thực hiện', 'Nhóm'],
        ...data.security
          .filter(
            (row) =>
              (!state.view.securityCategory || row.category === state.view.securityCategory) &&
              matches(state.view.securityQuery, row.text, person(data, row.actor)?.fullName),
          )
          .map((row) => [
            row.time || row.date,
            row.text,
            person(data, row.actor)?.fullName,
            row.category,
          ]),
      ]);
    },
    backupNow: () => {
      commit((data) => {
        addBackup(data, 'Thủ công');
        audit(data, 'Đã tạo bản sao lưu demo.', 'Sao lưu');
      });
      refresh('Đã tạo bản sao lưu.');
    },
    backupDownload: (id) => {
      const row = lookup(snapshot(), 'backups', id);
      downloadBlob(
        row.name,
        zip([['teamflow-demo.json', JSON.stringify({ version: 1, data: row.content })]]),
      );
    },
    backupUpload: () =>
      show(
        'Tải lên bản sao lưu',
        field('Tệp ZIP tạo bởi TeamFlow Demo', 'backup', '', { type: 'file', required: true }),
        {
          glyph: 'upload',
          submit: async (values) => {
            if (values.backup.size > 8 * 1024 * 1024) throw Error('Tệp sao lưu mẫu tối đa 8 MB.');
            const data = readBackup(await values.backup.arrayBuffer());
            commit((store) => {
              addBackup(store, 'Tải lên', data, values.backup.name);
            });
            refresh('Đã tải lên bản sao lưu.');
          },
        },
      ),
    backupDelete: (id) =>
      confirm(
        'Xóa bản sao lưu?',
        'Bản sao sẽ được xóa khỏi trình duyệt.',
        () => {
          commit((data) => {
            data.backups = data.backups.filter((row) => row.id !== id);
          });
          refresh('Đã xóa bản sao lưu.');
        },
        'Xóa',
      ),
    backupRestore: (id) =>
      show(
        'Khôi phục từ bản sao lưu',
        '<p class="form-error">Dữ liệu hiện tại của demo sẽ được thay thế. TeamFlow giữ một bản trước khôi phục.</p>' +
          checkBox('Khôi phục cả tệp đính kèm và ảnh đại diện', 'includeFiles', true) +
          field('Nhập KHÔI PHỤC', 'confirm', '', { required: true }),
        {
          glyph: 'restore',
          submitLabel: 'Khôi phục',
          submit: (values) => {
            if (values.confirm.trim() !== 'KHÔI PHỤC') throw Error('Nhập đúng cụm KHÔI PHỤC.');
            commit((data) => {
              const chosen = structuredClone(lookup(data, 'backups', id).content);
              const recent = data.security.filter(
                (row) => row.time && row.time > lookup(data, 'backups', id).at,
              );
              addBackup(data, 'Trước khôi phục');
              if (!values.includeFiles) {
                chosen.files = data.files;
                for (const person of chosen.employees)
                  person.avatar = byId(data, 'employees', person.id)?.avatar;
              }
              for (const key of Object.keys(data)) if (key !== 'backups') delete data[key];
              Object.assign(data, chosen);
              data.security.unshift(
                ...recent.filter((row) => !data.security.some((item) => item.time === row.time)),
              );
              audit(data, 'Đã khôi phục dữ liệu demo.', 'Sao lưu');
            });
            refresh('Đã khôi phục dữ liệu.');
          },
        },
      ),
    systemCheck: () => {
      const start = performance.now();
      snapshot();
      state.view.systemMs = (performance.now() - start).toFixed(2);
      state.view.systemAt = new Date().toLocaleTimeString('vi-VN');
      refresh('Đã kiểm tra trạng thái.');
    },
  });
})();
