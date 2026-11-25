'use strict';

window.MockApi = (() => {
  const { today, shift } = DemoDates;
  const read = DemoStorage.read;
  const update = (change) => {
    const data = read();
    const result = change(data);
    DemoStorage.write(data);
    return result;
  };
  let fallbackId = 0;
  const id = (prefix) =>
    prefix + '-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + ++fallbackId);
  const required = (value, label, limit = 150) => {
    const clean = String(value ?? '').trim();
    if (!clean || clean.length > limit) throw Error(label + ' cần từ 1 đến ' + limit + ' ký tự.');
    return clean;
  };
  const get = (data, key, keyId) => {
    const item = data[key].find((row) => row.id === keyId);
    if (!item) throw Error('Không tìm thấy bản ghi.');
    return item;
  };
  const save = (data, key, item, keyId) => {
    if (keyId) Object.assign(get(data, key, keyId), item);
    else data[key].push(item);
    return get(data, key, keyId || item.id);
  };
  const range = (start, end) => {
    if (start && end && start > end) throw Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  };
  const enumValue = (value, allowed) => {
    if (!allowed.includes(value)) throw Error('Trạng thái hoặc lựa chọn không hợp lệ.');
    return value;
  };
  const nonnegative = (number) => {
    if (!Number.isFinite(Number(number)) || Number(number) < 0)
      throw Error('Giá trị phải là số không âm.');
    return Number(number);
  };
  function notify(data, title, text, icon, route, target) {
    data.notifications.unshift({
      id: id('notice'),
      title,
      text,
      icon,
      route,
      target,
      date: today(),
      read: false,
    });
  }
  function history(item, text) {
    item.history ||= [];
    item.history.push({ date: today(), text });
  }
  const statuses = ['Todo', 'InProgress', 'Done'];
  function statusTask(task, status) {
    const wasDone = task.status === 'Done';
    task.status = enumValue(status, statuses);
    if (status === 'Done') {
      task.progress = 100;
      if (!wasDone) task.completedAt = today();
    } else if (wasDone) {
      task.progress = Math.min(task.progress, 90);
      delete task.completedAt;
    }
  }
  function taskSave(data, values, keyId) {
    const project = get(data, 'projects', values.projectId);
    const workspace = get(data, 'workspaces', project.workspaceId);
    const existing = keyId ? get(data, 'tasks', keyId) : null;
    const previous = existing ? { ...existing } : null;
    const title = required(values.title, 'Tiêu đề', 200);
    range(values.startDate, values.dueDate);
    if (values.assigneeId && !workspace.memberIds.includes(values.assigneeId))
      throw Error('Người phụ trách phải là thành viên workspace.');
    const fields = {
      title,
      projectId: project.id,
      assigneeId: values.assigneeId || '',
      description: String(values.description || '').trim(),
      startDate: values.startDate || '',
      dueDate: values.dueDate || '',
      estimateHours:
        values.estimateHours === ''
          ? null
          : nonnegative(values.estimateHours ?? existing?.estimateHours ?? 0),
      priority: enumValue(values.priority || 'Medium', ['Low', 'Medium', 'High', 'Urgent']),
    };
    let task = existing;
    if (task) Object.assign(task, fields);
    else {
      const next = (data.taskSequence[project.id] || 0) + 1;
      data.taskSequence[project.id] = next;
      task = {
        ...fields,
        id: id('task'),
        code: project.key + '-' + next,
        progress: 0,
        checklist: [],
        comments: [],
        creatorId: data.currentUserId,
      };
      data.tasks.push(task);
    }
    statusTask(task, values.status || 'Todo');
    if (values.progress !== undefined && task.status !== 'Done') {
      const progress = Math.min(100, Math.max(0, Number(values.progress) || 0));
      if (progress > 0 && task.status === 'Todo') task.status = 'InProgress';
      task.progress = task.progress === 90 && progress === 100 ? 90 : progress;
    }
    const changes = previous
      ? [
          ['status', 'Trạng thái'],
          ['assigneeId', 'Người thực hiện'],
          ['startDate', 'Ngày bắt đầu'],
          ['dueDate', 'Hạn hoàn thành'],
          ['progress', 'Tiến độ'],
          ['estimateHours', 'Ước tính'],
        ]
          .filter(([field]) => previous[field] !== task[field])
          .map(([, label]) => label)
      : [];
    if (!previous || changes.length)
      history(task, previous ? 'Đã cập nhật: ' + changes.join(', ') : 'Đã tạo công việc.');
    return task;
  }
  function saveWorkspace(values, keyId) {
    return update((data) =>
      save(
        data,
        'workspaces',
        {
          ...(keyId
            ? {}
            : {
                id: id('workspace'),
                memberIds: [data.currentUserId],
                ownerId: data.currentUserId,
                createdAt: today(),
              }),
          name: required(values.name, 'Tên workspace', 100),
          description: values.description.trim(),
        },
        keyId,
      ),
    );
  }
  function saveProject(values, keyId) {
    return update((data) => {
      get(data, 'workspaces', values.workspaceId);
      const previous = keyId ? get(data, 'projects', keyId).key : '';
      const key = required(values.key || previous, 'Mã dự án', 10).toUpperCase();
      if (!/^[A-Z][A-Z0-9]{1,9}$/.test(key))
        throw Error('Mã dự án gồm 2–10 chữ in hoa hoặc chữ số, bắt đầu bằng chữ.');
      if (
        data.projects.some(
          (row) => row.id !== keyId && row.workspaceId === values.workspaceId && row.key === key,
        )
      )
        throw Error('Mã dự án đã được sử dụng.');
      if (previous && previous !== key)
        for (const task of data.tasks.filter((row) => row.projectId === keyId)) {
          task.code = key + task.code.slice(previous.length);
          history(task, 'Đã cập nhật mã công việc theo dự án.');
        }
      return save(
        data,
        'projects',
        {
          ...(keyId
            ? {}
            : { id: id('project'), createdAt: today(), budget: 0, creatorId: data.currentUserId }),
          name: required(values.name, 'Tên dự án'),
          key,
          workspaceId: values.workspaceId,
          description: values.description.trim(),
          color: /^#[\da-f]{6}$/i.test(values.color) ? values.color : '#6366f1',
        },
        keyId,
      );
    });
  }
  function saveMeeting(values, keyId) {
    return update((data) => {
      const workspace = get(data, 'workspaces', values.workspaceId);
      if (!values.startAt || !values.endAt || values.endAt <= values.startAt)
        throw Error('Giờ kết thúc phải sau giờ bắt đầu.');
      if (new Date(values.endAt) - new Date(values.startAt) > 12 * 3600000)
        throw Error('Cuộc họp tối đa 12 giờ.');
      const attendeeIds = (values.attendeeIds || []).filter(
        (value) => value !== data.currentUserId,
      );
      if (attendeeIds.length > 49) throw Error('Cuộc họp có tối đa 50 người kể cả người tổ chức.');
      if (attendeeIds.some((value) => !workspace.memberIds.includes(value)))
        throw Error('Chỉ mời thành viên của workspace.');
      const existing = keyId ? get(data, 'meetings', keyId) : null;
      const changedTime =
        existing && (existing.startAt !== values.startAt || existing.endAt !== values.endAt);
      if (values.onlineUrl && !/^https?:\/\//i.test(values.onlineUrl))
        throw Error('Link họp phải dùng HTTP hoặc HTTPS.');
      if (values.projectId && get(data, 'projects', values.projectId).workspaceId !== workspace.id)
        throw Error('Dự án cần thuộc workspace đã chọn.');
      const meeting = save(
        data,
        'meetings',
        {
          ...(keyId
            ? {}
            : { id: id('meeting'), organizerId: data.currentUserId, response: 'Accepted' }),
          title: required(values.title, 'Tiêu đề'),
          workspaceId: workspace.id,
          projectId: values.projectId || '',
          onlineUrl: values.onlineUrl || '',
          startAt: values.startAt,
          endAt: values.endAt,
          attendeeIds,
          responses: Object.fromEntries(
            attendeeIds.map((personId) => [
              personId,
              changedTime ? 'Pending' : existing?.responses?.[personId] || 'Pending',
            ]),
          ),
          description: values.description.trim(),
        },
        keyId,
      );
      for (const personId of attendeeIds) {
        if (personId === data.currentUserId) continue;
        const saved = existing?.notificationsSent || [];
        if (changedTime || !saved.includes(personId)) {
          notify(
            data,
            changedTime ? 'Cuộc họp đổi giờ' : 'Bạn có lời mời họp',
            meeting.title,
            'event',
            'calendar',
            'meeting:' + meeting.id,
          );
          data.notifications[0].userId = personId;
        }
      }
      meeting.notificationsSent = [...attendeeIds];
      return meeting;
    });
  }
  function saveWorklog(values, keyId) {
    return update((data) => {
      const task = get(data, 'tasks', values.taskId);
      const project = get(data, 'projects', task.projectId);
      if (!get(data, 'workspaces', project.workspaceId).memberIds.includes(data.currentUserId))
        throw Error('Bạn cần là thành viên workspace.');
      const log = keyId ? get(data, 'worklogs', keyId) : null;
      if (log && (log.status === 'Approved' || log.userId !== data.currentUserId))
        throw Error('Giờ làm này không thể sửa.');
      if (!values.workDate || values.workDate < '2000-01-01' || values.workDate > today())
        throw Error('Ngày làm việc phải là hôm nay hoặc trước đó.');
      const minutes = Number(values.minutes);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)
        throw Error('Thời lượng phải từ 1 đến 1.440 phút.');
      const total = data.worklogs
        .filter(
          (row) =>
            row.userId === data.currentUserId &&
            row.workDate === values.workDate &&
            row.id !== keyId,
        )
        .reduce((sum, row) => sum + row.minutes, 0);
      if (total + minutes > 1440) throw Error('Một ngày chỉ có thể ghi tối đa 24 giờ.');
      const item = save(
        data,
        'worklogs',
        {
          ...(log ? {} : { id: id('log'), userId: data.currentUserId }),
          taskId: task.id,
          workDate: values.workDate,
          minutes,
          note: values.note.trim(),
          status: 'Pending',
          reason: '',
        },
        keyId,
      );
      return item;
    });
  }
  function canReview(data, subjectId) {
    const me = get(data, 'employees', data.currentUserId);
    if (me.role === 'Admin') return true;
    if (subjectId === me.id) return false;
    let departmentId = get(data, 'employees', subjectId).departmentId;
    const visited = new Set();
    while (departmentId && !visited.has(departmentId)) {
      visited.add(departmentId);
      const department = data.departments.find((row) => row.id === departmentId);
      if (department?.managerId === me.id) return true;
      departmentId = department?.parentId;
    }
    return false;
  }
  function leaveDays(row) {
    let days = 0;
    for (let date = row.startDate; date && date <= row.endDate; date = shift(date, 1)) {
      const day = DemoDates.from(date).getDay();
      if (day > 0 && day < 6) days++;
    }
    return row.period && row.period !== 'Cả ngày' ? days / 2 : days;
  }
  function remainingLeave(data, personId, year) {
    const user = get(data, 'employees', personId);
    const quota = user.allowances?.[year];
    const entitlement = quota
      ? quota.annual + quota.carry
      : (user.level && user.level !== 'Chính thức') || user.employment === 'Bên ngoài'
        ? 0
        : 12;
    return (
      entitlement -
      data.leave
        .filter(
          (row) =>
            row.userId === personId &&
            row.startDate.startsWith(year) &&
            row.type === 'Nghỉ phép năm' &&
            row.status === 'Approved',
        )
        .reduce((total, row) => total + leaveDays(row), 0)
    );
  }
  function decide(key, keyId, decision, reason = '') {
    return update((data) => {
      const row = get(data, key, keyId);
      if (!canReview(data, row.userId)) throw Error('Bạn chưa có quyền duyệt bản ghi này.');
      if (row.status !== 'Pending') throw Error('Bản ghi đã được xử lý.');
      if (
        key === 'leave' &&
        decision === 'Approved' &&
        row.type === 'Nghỉ phép năm' &&
        leaveDays(row) > remainingLeave(data, row.userId, row.startDate.slice(0, 4))
      )
        throw Error('Số ngày nghỉ vượt quá phép năm còn lại.');
      row.status = enumValue(decision, ['Approved', 'Rejected']);
      if (decision === 'Rejected') row.reason = required(reason, 'Lý do từ chối', 500);
      if (key === 'worklogs' && decision === 'Approved')
        row.rate =
          typeof Demo !== 'undefined' && Demo.rateAt
            ? Demo.rateAt(data, row.userId, row.workDate)
            : get(data, 'employees', row.userId).rate;
      if (row.userId === data.currentUserId)
        notify(
          data,
          decision === 'Approved' ? 'Đã duyệt' : 'Đã từ chối',
          key === 'leave' ? 'Đơn nghỉ phép' : 'Giờ làm đã ghi',
          key === 'leave' ? 'beach_access' : 'schedule',
          key === 'leave' ? 'leaves' : 'worklogs',
        );
    });
  }
  function saveAsset(values, keyId) {
    return update((data) => {
      get(data, 'categories', values.categoryId);
      const serial = values.serial.trim();
      if (
        serial &&
        data.assets.some(
          (row) => row.id !== keyId && row.serial.toLowerCase() === serial.toLowerCase(),
        )
      )
        throw Error('Số serial đã được dùng.');
      const item = save(
        data,
        'assets',
        {
          ...(keyId
            ? {}
            : {
                id: id('asset'),
                code: 'TS-' + String(++data.counters.asset).padStart(4, '0'),
                status: 'Available',
                holderId: '',
                history: [],
              }),
          name: required(values.name, 'Tên tài sản'),
          categoryId: values.categoryId,
          price: nonnegative(values.price),
          serial,
          location: values.location.trim(),
          purchasedOn: values.purchasedOn,
          ...(values.condition
            ? {
                condition: values.condition,
                supplier: values.supplier.trim(),
                warrantyUntil: values.warrantyUntil,
                interval: Number(values.interval) || 0,
                note: values.note.trim(),
              }
            : {}),
        },
        keyId,
      );
      if (!keyId) history(item, 'Đã thêm tài sản vào kho.');
      return item;
    });
  }
  function handover(data, asset, values) {
    if (asset.status !== 'Available') throw Error('Chỉ có thể bàn giao tài sản trong kho.');
    const employee = get(data, 'employees', values.holderId);
    if (employee.locked) throw Error('Tài khoản người nhận đang bị khóa.');
    if (!values.assignedOn || values.assignedOn > shift(today(), 30))
      throw Error('Ngày bàn giao tối đa 30 ngày tới.');
    range(values.assignedOn, values.expectedReturnOn);
    Object.assign(asset, {
      status: 'Assigned',
      holderId: employee.id,
      assignedOn: values.assignedOn,
      expectedReturnOn: values.expectedReturnOn,
      confirmed: false,
      condition: values.condition || asset.condition || 'Tốt',
      assignedBy: data.currentUserId,
    });
    history(
      asset,
      'Đã bàn giao cho ' + employee.fullName + (values.note ? '. ' + values.note : '.'),
    );
    if (employee.id === data.currentUserId)
      notify(
        data,
        'Bạn được bàn giao tài sản',
        asset.name,
        'devices',
        'my-assets',
        'asset:' + asset.id,
      );
  }
  function saveTemplate(values, keyId) {
    return update((data) => {
      get(data, 'departments', values.departmentId);
      if (!values.fields.length || values.fields.length > 30)
        throw Error('Mẫu cần từ 1 đến 30 trường.');
      const labels = values.fields.map((field) =>
        required(field.label, 'Tên trường', 100).toLowerCase(),
      );
      if (new Set(labels).size !== labels.length)
        throw Error('Tên trường trong mẫu không được trùng.');
      return save(
        data,
        'templates',
        {
          id: keyId || id('template'),
          name: required(values.name, 'Tên mẫu'),
          departmentId: values.departmentId,
          description: String(values.description || '').trim(),
          defaultHandler: values.defaultHandler || '',
          fields: values.fields,
          active: values.active,
        },
        keyId,
      );
    });
  }
  function saveRequest(values) {
    return update((data) => {
      const template = get(data, 'templates', values.templateId);
      if (!template.active) throw Error('Mẫu này đã ngừng sử dụng.');
      const answers = template.fields.map((field, i) => {
        if (field.type === 'file') {
          const files = values.requestFiles?.[i] || [];
          if (!files.length && field.required)
            throw Error('Vui lòng chọn tệp cho “' + field.label + '”.');
          return { label: field.label, value: files.map((file) => file.name).join(', '), files };
        }
        const value = String(values['answer' + i] || '').trim();
        if (!value && field.required) throw Error('Vui lòng điền “' + field.label + '”.');
        if (field.type === 'select' && value && !field.options.includes(value))
          throw Error('Lựa chọn không có trong mẫu.');
        return { label: field.label, value };
      });
      const row = {
        id: id('request'),
        code: 'YC-' + ++data.counters.request,
        title: required(values.title, 'Tiêu đề'),
        priority: values.priority || 'Normal',
        templateId: template.id,
        departmentId: template.departmentId,
        requesterId: data.currentUserId,
        assigneeId:
          template.defaultHandler ||
          get(data, 'departments', template.departmentId).managerId ||
          data.currentUserId,
        status: 'Pending',
        answers,
        createdAt: today(),
        history: [],
      };
      history(row, 'Đã gửi yêu cầu.');
      data.requests.unshift(row);
      return row;
    });
  }
  function requestAction(keyId, action, values = {}) {
    return update((data) => {
      const row = get(data, 'requests', keyId);
      if (action === 'comment') return history(row, required(values.note, 'Bình luận', 2000));
      if (action === 'approve' && row.status === 'Pending') {
        row.status = 'Approved';
        return history(row, 'Đã tiếp nhận yêu cầu.');
      }
      if (
        action === 'cancel' &&
        row.status === 'Pending' &&
        row.requesterId === data.currentUserId
      ) {
        row.status = 'Cancelled';
        return history(row, 'Đã hủy yêu cầu.');
      }
      if (action === 'reject' && ['Pending', 'Approved'].includes(row.status)) {
        row.status = 'Rejected';
        return history(row, 'Từ chối: ' + required(values.note, 'Lý do từ chối', 500));
      }
      if (row.status !== 'Approved') throw Error('Yêu cầu cần được tiếp nhận trước.');
      if (action === 'done') {
        row.status = 'Done';
        return history(row, 'Đã hoàn thành yêu cầu.');
      }
      if (action === 'assign') {
        const employee = get(data, 'employees', values.assigneeId);
        if (employee.departmentId !== row.departmentId)
          throw Error('Người xử lý phải thuộc bộ phận nhận yêu cầu.');
        row.assigneeId = employee.id;
        return history(row, 'Đã giao cho ' + employee.fullName + '.');
      }
      if (action === 'convert') {
        if (row.taskId) throw Error('Yêu cầu đã có công việc liên kết.');
        const task = taskSave(data, {
          ...values,
          title: row.code + ' · ' + row.title,
          description: row.answers.map((answer) => answer.label + ': ' + answer.value).join('\n'),
        });
        row.taskId = task.id;
        return history(row, 'Đã tạo công việc ' + task.code + '.');
      }
      if (action === 'handover') {
        handover(data, get(data, 'assets', values.assetId), {
          ...values,
          holderId: row.requesterId,
        });
        row.status = 'Done';
        return history(row, 'Đã bàn giao tài sản và hoàn thành yêu cầu.');
      }
      throw Error('Không thể thực hiện thao tác này.');
    });
  }
  function budget(data, project) {
    const taskIds = new Set(
      data.tasks.filter((row) => row.projectId === project.id).map((row) => row.id),
    );
    const logs = data.worklogs.filter(
      (row) => row.status === 'Approved' && taskIds.has(row.taskId),
    );
    const expenses = data.expenses.filter((row) => row.projectId === project.id);
    const labor = logs.reduce(
      (total, row) => total + Math.round((row.minutes * (row.rate || 0)) / 60),
      0,
    );
    const other = expenses.reduce((total, row) => total + row.amount, 0);
    return {
      labor,
      other,
      spent: labor + other,
      limit: project.budget,
      expenses,
      percent: project.budget ? ((labor + other) / project.budget) * 100 : 0,
    };
  }
  function remove(data, key, keyId) {
    get(data, key, keyId);
    data[key] = data[key].filter((row) => row.id !== keyId);
  }
  return {
    snapshot: read,
    commit: update,
    canReview,
    leaveDays,
    remainingLeave,
    reset: DemoStorage.reset,
    getTasks: (projectId) =>
      read().tasks.filter((row) => !projectId || row.projectId === projectId),
    saveWorkspace,
    saveProject,
    saveMeeting,
    saveWorklog,
    saveAsset,
    saveTemplate,
    saveRequest,
    requestAction,
    budget,
    saveTask: (values, keyId) => update((data) => taskSave(data, values, keyId)),
    moveTask: (keyId, status, before) =>
      update((data) => {
        const task = get(data, 'tasks', keyId);
        const previous = task.status;
        statusTask(task, status);
        if (previous !== status) history(task, 'Đã đổi trạng thái công việc.');
        if (before === keyId) return;
        const next = before
          ? data.tasks.find(
              (row) =>
                row.id === before && row.projectId === task.projectId && row.status === status,
            )
          : null;
        data.tasks = data.tasks.filter((row) => row.id !== keyId);
        data.tasks.splice(next ? data.tasks.indexOf(next) : data.tasks.length, 0, task);
      }),
    progress: (keyId, progress) =>
      update((data) => {
        const task = get(data, 'tasks', keyId);
        if (task.status === 'Done' && Number(progress) < 100)
          throw Error('Hãy mở lại công việc trước khi đổi tiến độ.');
        task.progress = Math.min(100, Math.max(0, Number(progress) || 0));
        if (task.status === 'Todo' && task.progress > 0) task.status = 'InProgress';
        history(task, 'Đã cập nhật tiến độ ' + task.progress + '%.');
      }),
    deleteTask: (keyId) =>
      update((data) => {
        if (data.worklogs.some((row) => row.taskId === keyId))
          throw Error('Công việc đã có giờ làm và không thể xóa.');
        remove(data, 'tasks', keyId);
        data.requests
          .filter((row) => row.taskId === keyId)
          .forEach((row) => {
            delete row.taskId;
          });
      }),
    taskComment: (keyId, text) =>
      update((data) =>
        get(data, 'tasks', keyId).comments.push({
          authorId: data.currentUserId,
          text: required(text, 'Bình luận', 2000),
          date: today(),
        }),
      ),
    taskCheck: (keyId, checkId) =>
      update((data) => {
        const task = get(data, 'tasks', keyId);
        const check = task.checklist.find((row) => row.id === checkId);
        if (check) check.done = !check.done;
        if (task.autoProgress && task.checklist.length && task.status !== 'Done') {
          task.progress = Math.round(
            (100 * task.checklist.filter((row) => row.done).length) / task.checklist.length,
          );
          if (task.progress > 0 && task.status === 'Todo') task.status = 'InProgress';
        }
      }),
    addCheck: (keyId, text) =>
      update((data) => {
        const task = get(data, 'tasks', keyId);
        if (task.checklist.length >= 50) throw Error('Mỗi công việc có tối đa 50 mục checklist.');
        task.checklist.push({
          id: id('check'),
          title: required(text, 'Mục checklist'),
          done: false,
        });
      }),
    addMember: (workspaceId, employeeId) =>
      update((data) => {
        get(data, 'employees', employeeId);
        const members = get(data, 'workspaces', workspaceId).memberIds;
        if (!members.includes(employeeId)) members.push(employeeId);
      }),
    respondMeeting: (keyId, response) =>
      update((data) => {
        const meeting = get(data, 'meetings', keyId);
        if (!meeting.attendeeIds.includes(data.currentUserId))
          throw Error('Bạn không có trong danh sách được mời.');
        (meeting.responses ||= {})[data.currentUserId] = enumValue(response, [
          'Accepted',
          'Declined',
        ]);
        if (data.currentUserId === 'lan') meeting.response = response;
      }),
    deleteMeeting: (keyId) =>
      update((data) => {
        if (get(data, 'meetings', keyId).organizerId !== data.currentUserId)
          throw Error('Chỉ người tổ chức có thể xóa lịch.');
        remove(data, 'meetings', keyId);
        data.notifications = data.notifications.filter((row) => row.target !== 'meeting:' + keyId);
      }),
    decide,
    saveLeave: (values) =>
      update((data) => {
        if (!values.startDate || !values.endDate) throw Error('Chọn ngày bắt đầu và kết thúc.');
        range(values.startDate, values.endDate);
        const period = values.period || 'Cả ngày';
        if (values.startDate < shift(today(), -30) || values.endDate > shift(values.startDate, 59))
          throw Error('Đơn tối đa 60 ngày và không bắt đầu quá 30 ngày trước.');
        if (period !== 'Cả ngày' && values.startDate !== values.endDate)
          throw Error('Nghỉ nửa ngày chỉ áp dụng cho đơn một ngày.');
        const requested = leaveDays({ ...values, period });
        if (!requested) throw Error('Đơn cần ít nhất một ngày làm việc.');
        if (
          values.type === 'Nghỉ phép năm' &&
          requested > remainingLeave(data, data.currentUserId, values.startDate.slice(0, 4))
        )
          throw Error('Không đủ phép năm. Bạn có thể chọn Nghỉ không lương.');
        if (
          data.leave.some(
            (row) =>
              row.userId === data.currentUserId &&
              ['Pending', 'Approved'].includes(row.status) &&
              row.startDate <= values.endDate &&
              row.endDate >= values.startDate,
          )
        )
          throw Error('Đã có đơn nghỉ phép trùng ngày.');
        return save(data, 'leave', {
          id: id('leave'),
          userId: data.currentUserId,
          type: values.type,
          startDate: values.startDate,
          endDate: values.endDate,
          period,
          reason: required(values.reason, 'Lý do', 500),
          status: 'Pending',
        });
      }),
    saveDepartment: (values, keyId) =>
      update((data) => {
        if (values.managerId) get(data, 'employees', values.managerId);
        return save(
          data,
          'departments',
          {
            id: keyId || id('department'),
            name: required(values.name, 'Tên phòng ban'),
            managerId: values.managerId,
            description: values.description.trim(),
          },
          keyId,
        );
      }),
    saveEmployee: (values, keyId) =>
      update((data) => {
        get(data, 'departments', values.departmentId);
        const email = required(values.email, 'Email', 254).toLowerCase();
        if (!email.endsWith('@example.test'))
          throw Error('Dùng địa chỉ dữ liệu mẫu có đuôi @example.test.');
        if (data.employees.some((row) => row.id !== keyId && row.email === email))
          throw Error('Email mẫu đã có trong hệ thống.');
        return save(
          data,
          'employees',
          {
            id: keyId || id('employee'),
            fullName: required(values.fullName, 'Họ tên'),
            email,
            departmentId: values.departmentId,
            jobTitle: values.jobTitle.trim(),
            role: values.role || 'Member',
            rate: keyId ? get(data, 'employees', keyId).rate : 0,
          },
          keyId,
        );
      }),
    handoverAsset: (keyId, values) =>
      update((data) => handover(data, get(data, 'assets', keyId), values)),
    returnAsset: (keyId, values) =>
      update((data) => {
        const asset = get(data, 'assets', keyId);
        if (asset.status !== 'Assigned') throw Error('Tài sản chưa được bàn giao.');
        if (!values.date || values.date > today())
          throw Error('Ngày thu hồi phải là hôm nay hoặc trước đó.');
        range(asset.assignedOn, values.date);
        Object.assign(asset, {
          status: values.toRepair ? 'InRepair' : 'Available',
          holderId: '',
          confirmed: false,
          assignedOn: '',
          expectedReturnOn: '',
          condition: values.condition || asset.condition || 'Tốt',
        });
        if (values.toRepair)
          (asset.maintenance ||= []).push({
            id: id('repair'),
            kind: 'Sửa chữa',
            date: values.date,
            note: values.note,
            status: 'Đang thực hiện',
          });
        history(asset, 'Đã thu hồi về kho.' + (values.note ? ' ' + values.note : ''));
      }),
    confirmAsset: (keyId) =>
      update((data) => {
        const asset = get(data, 'assets', keyId);
        if (asset.holderId !== data.currentUserId || asset.status !== 'Assigned')
          throw Error('Chỉ người giữ tài sản mới xác nhận đã nhận.');
        if (!asset.confirmed) history(asset, 'Đã xác nhận nhận tài sản.');
        asset.confirmed = true;
      }),
    saveCategory: (values, keyId) =>
      update((data) => {
        const name = required(values.name, 'Tên danh mục');
        if (
          data.categories.some(
            (row) => row.id !== keyId && row.name.toLowerCase() === name.toLowerCase(),
          )
        )
          throw Error('Danh mục đã tồn tại.');
        return save(
          data,
          'categories',
          {
            id: keyId || id('category'),
            name,
            glyph: values.glyph || 'devices',
            intervalMonths: Number(values.intervalMonths) || 0,
          },
          keyId,
        );
      }),
    setBudget: (keyId, amount) =>
      update((data) => {
        get(data, 'projects', keyId).budget = nonnegative(amount);
      }),
    setRate: (keyId, amount) =>
      update((data) => {
        get(data, 'employees', keyId).rate = nonnegative(amount);
      }),
    saveExpense: (projectId, values, keyId) =>
      update((data) => {
        get(data, 'projects', projectId);
        const amount = nonnegative(values.amount);
        if (!amount) throw Error('Chi phí phải lớn hơn 0.');
        return save(
          data,
          'expenses',
          {
            id: keyId || id('expense'),
            projectId,
            title: required(values.title, 'Tên chi phí'),
            amount,
            date: values.date,
          },
          keyId,
        );
      }),
    deleteExpense: (keyId) => update((data) => remove(data, 'expenses', keyId)),
    saveCycle: (values) =>
      update((data) => {
        range(values.startDate, values.dueDate);
        return save(data, 'cycles', {
          id: id('cycle'),
          name: required(values.name, 'Tên kỳ đánh giá'),
          startDate: values.startDate,
          dueDate: values.dueDate,
          status: 'Draft',
        });
      }),
    saveReviewTemplate: (values) =>
      update((data) =>
        save(data, 'reviewTemplates', {
          id: id('review-template'),
          name: required(values.name, 'Tên mẫu'),
          description: values.description.trim(),
        }),
      ),
    review: (keyId, stage, values) =>
      update((data) => {
        const row = get(data, 'reviews', keyId);
        if (row.status !== stage) throw Error('Đánh giá đã chuyển sang bước khác.');
        if (stage === 'HrPending') {
          row.status = 'Finalized';
          return;
        }
        const score = Number(values.score);
        if (!Number.isInteger(score) || score < 1 || score > 5)
          throw Error('Điểm đánh giá từ 1 đến 5.');
        const note = required(values.note, 'Nội dung đánh giá', 2000);
        if (stage === 'SelfPending')
          Object.assign(row, { status: 'ManagerPending', self: note, selfScore: score });
        else Object.assign(row, { status: 'HrPending', manager: note, managerScore: score });
      }),
    markRead: (keyId) =>
      update((data) => {
        if (keyId) get(data, 'notifications', keyId).read = true;
        else
          data.notifications.forEach((row) => {
            row.read = true;
          });
      }),
    chat: (chatId, text) =>
      update((data) =>
        get(data, 'chats', chatId).messages.push({
          sender: data.currentUserId,
          text: required(text, 'Tin nhắn', 2000),
          date: today(),
        }),
      ),
    post: (values) =>
      update((data) =>
        data.posts.unshift({
          id: id('post'),
          authorId: data.currentUserId,
          title: required(values.title, 'Tiêu đề'),
          text: required(values.text, 'Nội dung', 4000),
          date: today(),
          likes: 0,
          liked: false,
          comments: [],
        }),
      ),
    like: (keyId) =>
      update((data) => {
        const post = get(data, 'posts', keyId);
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
      }),
    trainingEnroll: (keyId) =>
      update((data) => {
        const row = get(data, 'training', keyId);
        row.enrolled = !row.enrolled;
      }),
    offboardingCheck: (keyId, index) =>
      update((data) => {
        const row = get(data, 'offboarding', keyId);
        if (row.status !== 'Đang bàn giao') throw Error('Hồ sơ phải được duyệt trước.');
        row.checks[index].done = !row.checks[index].done;
      }),
    offboardingApprove: (keyId) =>
      update((data) => {
        get(data, 'offboarding', keyId).status = 'Đang bàn giao';
      }),
    saveProfile: (values) =>
      update((data) => {
        const person = get(data, 'employees', data.currentUserId);
        person.fullName = required(values.fullName, 'Họ tên');
        person.jobTitle = values.jobTitle.trim();
      }),
    addAudit: () =>
      update((data) =>
        save(data, 'audits', {
          id: id('audit'),
          name: 'Kiểm kê ' + today(),
          date: today(),
          checked: [],
        }),
      ),
    checkAudit: (keyId, assetId) =>
      update((data) => {
        const row = get(data, 'audits', keyId);
        row.checked = row.checked.includes(assetId)
          ? row.checked.filter((value) => value !== assetId)
          : [...row.checked, assetId];
      }),
    addFile: (projectId, name, content) =>
      update((data) => save(data, 'files', { id: id('file'), projectId, name, content })),
    deleteFile: (keyId) => update((data) => remove(data, 'files', keyId)),
  };
})();
