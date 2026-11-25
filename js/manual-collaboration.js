'use strict';

(() => {
  const D = Demo;
  const {
    views,
    actions,
    state,
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
    chip,
    header,
    panel,
    placeholder,
    table,
    tabs,
    searchField,
    field,
    show,
    confirm,
    refresh,
    render,
    go,
    today,
    uid,
    clean,
    lookup,
    actionRow,
    formError,
  } = D;
  const { snapshot, commit } = MockApi;
  const emoji = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  const allowed =
    /\.(jpe?g|png|webp|gif|pdf|txt|csv|md|json|docx?|xlsx?|pptx?|odt|ods|odp|zip|rar|7z|mp3|wav|mp4|mov)$/i;
  const memory = new Map();
  let dbPromise;
  function filesDb() {
    if (!dbPromise)
      dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDB.open('teamflow.demo.attachments', 1);
          request.onupgradeneeded = () => request.result.createObjectStore('files');
          request.onerror = () => resolve(null);
          request.onsuccess = () => resolve(request.result);
        } catch {
          resolve(null);
        }
      });
    return dbPromise;
  }
  async function saveAttachments(list) {
    const files = [...list].filter((file) => file?.size > 0);
    if (files.length > 5) throw Error('Mỗi lần chọn tối đa 5 tệp.');
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) throw Error('Mỗi tệp tối đa 20 MB.');
      if (!allowed.test(file.name)) throw Error('Định dạng tệp chưa được hỗ trợ.');
    }
    const db = await filesDb();
    return Promise.all(
      files.map(async (file) => {
        const id = uid('attachment');
        if (db)
          await new Promise((resolve, reject) => {
            const request = db.transaction('files', 'readwrite');
            request.objectStore('files').put(file, id);
            request.oncomplete = resolve;
            request.onerror = () => reject(Error('Trình duyệt không lưu được tệp đính kèm.'));
            request.onabort = () => reject(Error('Thao tác lưu tệp đã dừng.'));
          });
        else memory.set(id, file);
        return {
          id,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
        };
      }),
    );
  }
  async function getAttachment(id) {
    const db = await filesDb();
    if (!db) return memory.get(id);
    return await new Promise((resolve) => {
      const request = db.transaction('files').objectStore('files').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
  async function openAttachment(id, name) {
    const file = await getAttachment(id);
    if (!file) {
      D.showToast('Tệp này không còn trong bộ nhớ trình duyệt.', true);
      return;
    }
    const url = URL.createObjectURL(file);
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      show(
        name || file.name,
        '<img class="attachment-preview" src="' +
          h(url) +
          '" alt="' +
          h(name || file.name) +
          '"><a class="btn" href="' +
          h(url) +
          '" download="' +
          h(name || file.name) +
          '">' +
          icon('download') +
          'Tải xuống</a>',
        { glyph: 'image', wide: true },
      );
      D.dialog.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    if (file.type === 'application/pdf') {
      anchor.target = '_blank';
      anchor.rel = 'noopener';
    } else anchor.download = name || file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const attachmentRows = (files) =>
    (files || [])
      .map((file) =>
        act(
          'attachment|' + file.id + '|' + encodeURIComponent(file.name),
          file.name,
          'attachment',
          'btn sm',
        ),
      )
      .join('');
  function attachInput(label = 'Đính kèm tệp') {
    return (
      '<label class="attach-label">' +
      icon('attach_file') +
      '<span>' +
      h(label) +
      '</span><input name="attachment" type="file" multiple aria-label="' +
      h(label) +
      '"></label>'
    );
  }

  function chats(data) {
    const room = data.chats.find((row) => row.id === 'general');
    if (room && !room.memberIds) {
      room.memberIds = ['lan', 'an', 'vy', 'bao'];
      room.ownerId = 'lan';
    }
    if (!data.chats.some((row) => row.id === 'direct-demo'))
      data.chats.push({
        id: 'direct-demo',
        name: 'Trần Gia An',
        type: 'direct',
        memberIds: ['lan', 'an'],
        ownerId: 'lan',
        messages: [],
      });
    return data.chats;
  }
  const userChats = (data) =>
    chats(data).filter(
      (row) =>
        row.memberIds.includes(data.currentUserId) && !row.hidden?.includes(data.currentUserId),
    );
  const chatTitle = (data, chat) =>
    chat.type === 'direct'
      ? person(
          data,
          chat.memberIds.find((id) => id !== data.currentUserId),
        )?.fullName || chat.name
      : chat.name;
  function selectedChat(data, id) {
    const chat = chats(data).find((row) => row.id === id);
    if (!chat || !chat.memberIds.includes(data.currentUserId))
      throw Error('Bạn chưa có quyền mở cuộc trò chuyện này.');
    return chat;
  }
  function stableMessages(chat) {
    return chat.messages.map((row, i) => ({ ...row, id: row.id || 'initial-' + i }));
  }
  function messageAt(chat, id) {
    const row = chat.messages.find((row, index) => (row.id || 'initial-' + index) === id);
    if (!row) throw Error('Không tìm thấy tin nhắn.');
    return row;
  }
  function toggledReaction(row, value, userId) {
    const set = (row.reactions ||= {});
    const current = set[value] || [];
    set[value] = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
  }
  const reactionBar = (action, row) =>
    '<div class="reactions">' +
    emoji
      .filter((value) => row.reactions?.[value]?.length)
      .map((value) =>
        act(
          action + '|' + encodeURIComponent(value),
          value + ' ' + row.reactions[value].length,
          '',
          'btn sm',
        ),
      )
      .join('') +
    '</div>';
  const reactionPicker = (action) =>
    '<div class="reactions picker">' +
    emoji
      .map((value) => act(action + '|' + encodeURIComponent(value), value, '', 'btn sm'))
      .join('') +
    '</div>';
  function messages(data, id) {
    const rooms = userChats(data).filter((row) =>
      matches(state.view.chatQuery, chatTitle(data, row)),
    );
    const ordered = rooms.sort(
      (a, b) =>
        Number(!!b.pinned?.includes(data.currentUserId)) -
        Number(!!a.pinned?.includes(data.currentUserId)),
    );
    const chatting = userChats(data);
    const current = chatting.find((row) => row.id === id) || chatting[0];
    const sidebar =
      '<aside class="message-list"><div class="toolbar"><strong>Tin nhắn</strong><span class="spacer"></span>' +
      iconBtn('newConversation', 'Tin nhắn mới', 'edit_square') +
      '</div>' +
      searchField('chatQuery', 'Tìm cuộc trò chuyện…') +
      ordered
        .map((row) =>
          rawLink(
            'messages/' + row.id,
            avatar(chatTitle(data, row), 'sm') +
              '<div class="stack"><strong>' +
              h(chatTitle(data, row)) +
              '</strong><small>' +
              h(row.messages.at(-1)?.text || 'Chưa có tin nhắn.') +
              '</small></div>' +
              (row.pinned?.includes(data.currentUserId) ? icon('push_pin') : ''),
            'message-list-item' + (row.id === current?.id ? ' active' : ''),
          ),
        )
        .join('') +
      '</aside>';
    const chatMessages = current ? stableMessages(current) : [];
    const title = current ? chatTitle(data, current) : '';
    const editing = state.view.chatEdit
      ? chatMessages.find((row) => row.id === state.view.chatEdit)
      : null;
    const reply = state.view.chatReply
      ? chatMessages.find((row) => row.id === state.view.chatReply)
      : null;
    const content = current
      ? '<section class="message-content"><header class="message-head">' +
        avatar(title, 'sm') +
        '<strong>' +
        h(title) +
        '</strong><span class="spacer"></span>' +
        (current.type === 'direct'
          ? iconBtn('startCall|' + current.id + '|audio', 'Gọi thoại', 'call') +
            iconBtn('startCall|' + current.id + '|video', 'Gọi video', 'videocam')
          : '') +
        iconBtn('conversationSettings|' + current.id, 'Thông tin trò chuyện', 'info') +
        '</header><div class="message-stream" data-chat-scroll>' +
        (chatMessages
          .map((row) => {
            const own = row.sender === data.currentUserId;
            const sender = person(data, row.sender);
            const replied = chatMessages.find((item) => item.id === row.replyTo);
            const action = 'messageReaction|' + current.id + '|' + row.id;
            return (
              '<article class="message-line' +
              (own ? ' mine' : '') +
              '">' +
              avatar(sender?.fullName, 'sm') +
              '<div class="message-bubble">' +
              (!own ? '<small>' + h(sender?.fullName) + '</small>' : '') +
              (replied
                ? '<blockquote>' + h(replied.text || 'Tệp đính kèm') + '</blockquote>'
                : '') +
              (row.retracted
                ? '<em>Tin nhắn đã được thu hồi</em>'
                : '<p class="pre-wrap">' + h(row.text) + '</p>' + attachmentRows(row.files)) +
              (row.callMode
                ? '<p>' +
                  act('startCall|' + current.id + '|' + row.callMode, 'Gọi lại', 'call', 'btn sm') +
                  '</p>'
                : '') +
              '<small class="message-meta">' +
              (row.sentAt
                ? h(
                    new Date(row.sentAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  )
                : fmtDate(row.date)) +
              (own ? ' · Đã gửi' : '') +
              (row.edited ? ' · Đã sửa' : '') +
              '</small>' +
              reactionBar(action, row) +
              '</div>' +
              (!row.retracted
                ? iconBtn(
                    'messageActions|' + current.id + '|' + row.id,
                    'Thao tác tin nhắn',
                    'more_horiz',
                  )
                : '') +
              '</article>'
            );
          })
          .join('') ||
          placeholder('Chưa có tin nhắn. Hãy bắt đầu trò chuyện.', 'chat_bubble_outline')) +
        '</div>' +
        '<form class="message-compose" data-chat-form="' +
        h(current.id) +
        '">' +
        (reply || editing
          ? '<div class="compose-context">' +
            (editing ? 'Sửa tin nhắn' : 'Trả lời · ' + h(reply.text)) +
            iconBtn('chatCancel', 'Hủy', 'close') +
            '</div>'
          : '') +
        '<div class="compose-row">' +
        attachInput('Tệp') +
        '<textarea name="text" rows="1" aria-label="Nhập tin nhắn" placeholder="Nhập tin nhắn…">' +
        h(editing?.text || '') +
        '</textarea><button class="icon-btn" type="submit" aria-label="Gửi tin nhắn">' +
        icon('send') +
        '</button></div>' +
        '<p class="form-error" role="alert" hidden></p></form></section>'
      : panel(placeholder('Chọn hoặc tạo cuộc trò chuyện.', 'chat_bubble_outline'));
    queueMicrotask(() => {
      const stream = document.querySelector('[data-chat-scroll]');
      if (stream) stream.scrollTop = stream.scrollHeight;
    });
    return (
      '<div class="messages-manual">' +
      header(raw('nav.messages')) +
      '<div class="messages-grid">' +
      sidebar +
      content +
      '</div></div>'
    );
  }
  function newConversation() {
    const data = snapshot();
    const items = data.employees.filter(
      (row) => row.id !== data.currentUserId && !row.locked && !row.invited,
    );
    show(
      'Tin nhắn mới',
      '<div class="toolbar">' +
        act('conversationMode|direct', 'Cá nhân', 'person', 'btn sm selected') +
        act('conversationMode|group', 'Nhóm', 'groups', 'btn sm') +
        '</div><div id="conversation-inputs"></div>',
      {
        glyph: 'chat_bubble_outline',
        submitLabel: 'Bắt đầu trò chuyện',
        submit: (values, form) => {
          const mode = state.view.newChatMode || 'direct';
          const members =
            mode === 'direct' ? [values.contact] : new FormData(form).getAll('members');
          if (!members.length || !members[0] || members.length > 19)
            throw Error('Chọn từ 1 đến 19 người.');
          const id = commit((data) => {
            const all = chats(data);
            const existing =
              mode === 'direct'
                ? all.find(
                    (row) =>
                      row.type === 'direct' &&
                      row.memberIds.includes(data.currentUserId) &&
                      row.memberIds.includes(members[0]),
                  )
                : null;
            if (existing) {
              existing.hidden = (existing.hidden || []).filter((id) => id !== data.currentUserId);
              return existing.id;
            }
            const chat = {
              id: uid('chat'),
              name:
                mode === 'group'
                  ? clean(values.name, 'Tên nhóm')
                  : person(data, members[0]).fullName,
              type: mode,
              memberIds: [data.currentUserId, ...members],
              ownerId: data.currentUserId,
              messages: [],
            };
            all.unshift(chat);
            return chat.id;
          });
          go('messages/' + id);
          refresh();
        },
      },
    );
    state.view.newChatMode = 'direct';
    const container = D.dialog.querySelector('#conversation-inputs');
    D.drawChatMode = (mode) => {
      container.innerHTML =
        mode === 'direct'
          ? field('Người nhận', 'contact', '', {
              options: [['', 'Chọn người nhận'], ...items.map((row) => [row.id, row.fullName])],
              required: true,
            })
          : field('Tên nhóm', 'name', '', { required: true }) +
            items
              .map(
                (row) =>
                  '<label class="form-check"><input type="checkbox" name="members" value="' +
                  h(row.id) +
                  '">' +
                  h(row.fullName) +
                  '</label>',
              )
              .join('');
      for (const button of D.dialog.querySelectorAll('[data-act^="conversationMode|"]'))
        button.classList.toggle('selected', button.dataset.act.endsWith('|' + mode));
    };
    D.drawChatMode('direct');
  }
  document.addEventListener('keydown', (event) => {
    if (
      event.target.matches('[data-chat-form] textarea') &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.isComposing
    ) {
      event.preventDefault();
      event.target.form.requestSubmit();
    }
  });
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-chat-form]');
    if (!form) return;
    event.preventDefault();
    const values = new FormData(form);
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      const files = await saveAttachments(values.getAll('attachment'));
      const contents = String(values.get('text') || '').trim();
      if (!contents && !files.length) throw Error('Nhập nội dung hoặc chọn tệp.');
      if (contents.length > 2000) throw Error('Tin nhắn tối đa 2.000 ký tự.');
      commit((data) => {
        const chat = selectedChat(data, form.dataset.chatForm);
        if (state.view.chatEdit) {
          const row = messageAt(chat, state.view.chatEdit);
          if (
            row.sender !== data.currentUserId ||
            !row.sentAt ||
            Date.now() - row.sentAt > 15 * 60000
          )
            throw Error('Chỉ sửa tin của bạn trong 15 phút.');
          row.text = contents;
          row.edited = true;
          row.files = [...(row.files || []), ...files];
        } else
          chat.messages.push({
            id: uid('message'),
            sender: data.currentUserId,
            text: contents,
            files,
            replyTo: state.view.chatReply,
            date: today(),
            sentAt: Date.now(),
          });
        chat.hidden = [];
      });
      delete state.view.chatReply;
      delete state.view.chatEdit;
      render();
    } catch (error) {
      formError(form, error);
    } finally {
      submit.disabled = false;
    }
  });
  function conversationSettings(id) {
    const data = snapshot();
    const chat = selectedChat(data, id);
    const name = chatTitle(data, chat);
    const group = chat.type !== 'direct';
    show(
      name,
      '<h3>Thành viên</h3>' +
        chat.memberIds
          .map(
            (member) =>
              '<div class="item-line">' +
              D.accountCell(data, member) +
              (group && chat.ownerId === data.currentUserId && member !== data.currentUserId
                ? iconBtn(
                    'chatRemovePerson|' + id + '|' + member,
                    'Xóa thành viên',
                    'person_remove',
                  )
                : '') +
              '</div>',
          )
          .join('') +
        '<h3>Tệp đã chia sẻ</h3>' +
        (attachmentRows(chat.messages.flatMap((row) => (row.retracted ? [] : row.files || []))) ||
          '<p class="muted">Chưa có tệp đính kèm.</p>') +
        '<div class="toolbar panel-tools">' +
        act(
          'chatPin|' + id,
          chat.pinned?.includes(data.currentUserId) ? 'Bỏ ghim' : 'Ghim trò chuyện',
          'push_pin',
        ) +
        act('chatHide|' + id, 'Ẩn trò chuyện', 'visibility_off') +
        (group
          ? act('chatManage|' + id, 'Đổi tên hoặc thêm người', 'group_add') +
            act('chatLeave|' + id, 'Rời nhóm', 'logout', 'btn danger')
          : '') +
        '</div>',
      { drawer: true, glyph: 'info' },
    );
  }
  function callPage(data, id) {
    const chat = chats(data).find((row) => row.id === id);
    if (!chat || chat.type !== 'direct' || !chat.memberIds.includes(data.currentUserId))
      return header('Cuộc gọi', '', link('messages', 'Về tin nhắn'));
    const connected = state.view.callConnected;
    return (
      '<div class="call-manual"><div class="call-body">' +
      avatar(chatTitle(data, chat), 'lg') +
      '<h1>' +
      h(chatTitle(data, chat)) +
      '</h1><p>' +
      (connected ? 'Đã kết nối · Mô phỏng trên trình duyệt' : 'Đang đổ chuông…') +
      '</p></div><div class="room-controls">' +
      (connected
        ? iconBtn(
            'callToggle|mic',
            'Micrô',
            state.view.callMicOff ? 'mic_off' : 'mic',
            state.view.callMicOff ? '' : 'selected',
          ) +
          (state.activeCall?.mode === 'video'
            ? iconBtn(
                'callToggle|camera',
                'Máy ảnh',
                state.view.callCameraOff ? 'videocam_off' : 'videocam',
                state.view.callCameraOff ? '' : 'selected',
              )
            : '')
        : act('acceptDemoCall', 'Giả lập trả lời', 'call', 'btn primary')) +
      act('endDemoCall|' + id, 'Kết thúc', 'call_end', 'btn room-leave') +
      '</div></div>'
    );
  }
  function feed(data) {
    const posts = data.posts.filter((row) =>
      matches(state.view.feedQuery, row.title, row.text, person(data, row.authorId)?.fullName),
    );
    const announcements = posts.filter((row) => row.announcement).slice(0, 5);
    const rest = posts.filter((row) => !announcements.includes(row));
    const card = (row) =>
      panel(
        '<div class="toolbar">' +
          D.accountCell(data, row.authorId) +
          '<small class="muted">' +
          fmtDate(row.date) +
          '</small><span class="spacer"></span>' +
          (row.announcement ? chip('Thông báo', 'amber') : '') +
          (row.authorId === data.currentUserId || D.access(data).admin
            ? iconBtn('postActions|' + row.id, 'Thao tác bài viết', 'more_horiz')
            : '') +
          '</div><h2>' +
          h(row.title || '') +
          '</h2><p class="pre-wrap">' +
          h(row.text) +
          '</p>' +
          attachmentRows(row.files) +
          '<div class="toolbar panel-tools">' +
          act(
            'postReactMenu|' + row.id,
            'Cảm xúc' + (row.likes ? ' · ' + row.likes : ''),
            'favorite_border',
            'btn sm',
          ) +
          act(
            'postComments|' + row.id,
            'Bình luận · ' + (row.comments?.length || 0),
            'chat_bubble_outline',
            'btn sm',
          ) +
          reactionBar('postReaction|' + row.id, row) +
          '</div>',
        row.announcement ? 'announcement' : '',
      );
    return (
      '<div class="feed-manual">' +
      header(raw('nav.feed'), 'Chia sẻ tin tức và trao đổi cùng đồng nghiệp.') +
      panel(
        '<div class="person-cell">' +
          avatar(person(data, data.currentUserId)?.fullName, 'sm') +
          act('composePost', 'Bạn đang nghĩ gì?', 'edit', 'feed-compose') +
          '</div>',
      ) +
      '<div class="toolbar panel-tools">' +
      searchField('feedQuery', 'Tìm bài viết…') +
      '</div>' +
      (announcements.length ? '<h2>Thông báo chung</h2>' + announcements.map(card).join('') : '') +
      (rest.map(card).join('') ||
        (announcements.length ? '' : panel(placeholder('Chưa có bài viết.')))) +
      '</div>'
    );
  }
  function postForm(id) {
    const data = snapshot();
    const old = id ? lookup(data, 'posts', id) : null;
    show(
      old ? 'Chỉnh sửa bài viết' : 'Tạo bài viết',
      field('Tiêu đề', 'title', old?.title) +
        field('Bạn đang nghĩ gì?', 'text', old?.text, { type: 'textarea', required: true }) +
        '<div class="toolbar">' +
        attachInput() +
        '</div>' +
        (D.access(data).admin
          ? field('Thông báo', 'announcement', old?.announcement, { type: 'checkbox' })
          : '') +
        '<label class="sr-only" for="post-mention">Nhắc đến đồng nghiệp</label><select id="post-mention"><option value="">@ Nhắc đến</option>' +
        data.employees
          .map((row) => '<option value="' + h(row.fullName) + '">' + h(row.fullName) + '</option>')
          .join('') +
        '</select>',
      {
        glyph: 'dynamic_feed',
        submitLabel: old ? 'Lưu' : 'Đăng',
        submit: async (values, form) => {
          const files = await saveAttachments(new FormData(form).getAll('attachment'));
          commit((data) => {
            const content = {
              title: values.title.trim(),
              text: clean(values.text, 'Nội dung', 4000),
              announcement: !!values.announcement,
            };
            if (old) {
              const row = lookup(data, 'posts', id);
              if (row.authorId !== data.currentUserId) throw Error('Chỉ tác giả sửa được bài.');
              Object.assign(row, content, { files: [...(row.files || []), ...files] });
            } else
              data.posts.unshift({
                ...content,
                id: uid('post'),
                authorId: data.currentUserId,
                date: today(),
                files,
                likes: 0,
                comments: [],
              });
          });
          refresh('Đã lưu bài viết.');
        },
      },
    );
    D.dialog.querySelector('#post-mention').onchange = (event) => {
      if (!event.target.value) return;
      const input = D.dialog.querySelector('[name=text]');
      input.value += ' @' + event.target.value + ' ';
      input.focus();
      event.target.value = '';
    };
  }
  function postComments(id) {
    const data = snapshot();
    const post = lookup(data, 'posts', id);
    const renderLine = (row) =>
      '<div class="item-line"><span class="stack"><strong>' +
      h(person(data, row.authorId)?.fullName) +
      '</strong><p class="pre-wrap">' +
      h(row.text) +
      '</p><small>' +
      fmtDate(row.date) +
      '</small></span>' +
      (!row.replyTo ? iconBtn('postComment|' + id + '|' + row.id, 'Trả lời', 'reply') : '') +
      (row.authorId === data.currentUserId || D.access(data).admin
        ? iconBtn('commentDelete|' + id + '|' + row.id, 'Xóa bình luận', 'delete')
        : '') +
      '</div>';
    const comments = (post.comments || [])
      .filter((row) => !row.replyTo)
      .map(
        (row) =>
          renderLine(row) +
          '<div class="nested-comments">' +
          post.comments
            .filter((other) => other.replyTo === row.id)
            .map(renderLine)
            .join('') +
          '</div>',
      )
      .join('');
    show(
      post.title || 'Bình luận',
      '<p class="pre-wrap">' +
        h(post.text) +
        '</p><h3>Bình luận</h3>' +
        (comments || '<p class="muted">Chưa có bình luận.</p>') +
        act('postComment|' + id, 'Viết bình luận', 'chat_bubble_outline', 'btn primary'),
      { drawer: true, glyph: 'chat_bubble_outline' },
    );
  }
  function notifications(data) {
    const current = state.view.noticeTab || 'all';
    const own = data.notifications.filter(
      (row) => !row.userId || row.userId === data.currentUserId,
    );
    const unread = own.filter((row) => !row.read).length;
    const rows = own
      .filter((row) => current !== 'unread' || !row.read)
      .sort((a, b) => b.date.localeCompare(a.date));
    const shown = rows.slice(0, Number(state.view.noticeLimit || 30));
    const groups = [...new Set(shown.map((row) => row.date))];
    return (
      header(
        raw('notifications.title'),
        unread ? unread + ' thông báo chưa đọc' : 'Bạn đã đọc tất cả thông báo.',
        unread ? act('readAll', raw('notifications.markAll'), 'done_all') : '',
      ) +
      '<div class="toolbar">' +
      tabs(
        'noticeTab',
        [
          ['all', 'Tất cả'],
          ['unread', 'Chưa đọc · ' + unread],
        ],
        current,
      ) +
      '</div>' +
      (groups
        .map(
          (date) =>
            '<section class="notice-day"><h2>' +
            h(
              date === today()
                ? 'Hôm nay'
                : date === D.shift(today(), -1)
                  ? 'Hôm qua'
                  : fmtDate(date),
            ) +
            '</h2>' +
            panel(
              shown
                .filter((row) => row.date === date)
                .map(
                  (row) =>
                    '<button type="button" class="notice-row' +
                    (!row.read ? ' unread' : '') +
                    '" data-act="notice|' +
                    h(row.id) +
                    '">' +
                    '<span class="notice-icon">' +
                    icon(row.icon) +
                    '</span><span class="stack"><strong>' +
                    h(row.title) +
                    '</strong><small>' +
                    h(row.text) +
                    '</small></span>' +
                    (!row.read ? '<span class="notice-unread" aria-label="Chưa đọc"></span>' : '') +
                    icon('chevron_right') +
                    '</button>',
                )
                .join(''),
            ) +
            '</section>',
        )
        .join('') || panel(placeholder('Không có thông báo.', 'notifications'))) +
      (shown.length < rows.length
        ? '<div class="toolbar panel-tools">' +
          act('view|noticeLimit|' + (shown.length + 30), 'Tải thêm', 'expand_more') +
          '</div>'
        : '')
    );
  }

  Object.assign(views, { messages, feed, calls: callPage, notifications });
  Object.assign(D, {
    attachInput,
    saveAttachments,
    attachmentRows,
    openAttachment,
    userChats,
    chatTitle,
  });
  Object.assign(actions, {
    attachment: (id, name) => {
      openAttachment(id, decodeURIComponent(name || '')).catch((error) =>
        D.showToast(error.message, true),
      );
    },
    newConversation,
    conversationMode: (mode) => {
      state.view.newChatMode = mode;
      D.drawChatMode(mode);
    },
    conversationSettings,
    messageActions: (id, messageId) => {
      const data = snapshot();
      const chat = selectedChat(data, id);
      const row = messageAt(chat, messageId);
      const own = row.sender === data.currentUserId;
      show(
        'Thao tác tin nhắn',
        '<p class="pre-wrap">' +
          h(row.text) +
          '</p>' +
          reactionPicker('messageReaction|' + id + '|' + messageId) +
          '<div class="toolbar">' +
          act('chatReply|' + messageId, 'Trả lời', 'reply') +
          (own && row.sentAt && Date.now() - row.sentAt <= 15 * 60000
            ? act('chatEdit|' + messageId, 'Sửa', 'edit')
            : '') +
          (own && row.sentAt && Date.now() - row.sentAt <= 24 * 3600000
            ? act('chatWithdraw|' + id + '|' + messageId, 'Thu hồi', 'undo', 'btn danger')
            : '') +
          '</div>',
        { glyph: 'chat_bubble_outline' },
      );
    },
    messageReaction: (id, messageId, value) => {
      commit((data) =>
        toggledReaction(
          messageAt(selectedChat(data, id), messageId),
          decodeURIComponent(value),
          data.currentUserId,
        ),
      );
      D.close();
      render();
    },
    chatReply: (id) => {
      state.view.chatReply = id;
      delete state.view.chatEdit;
      D.close();
      render();
      document.querySelector('[data-chat-form] textarea')?.focus();
    },
    chatEdit: (id) => {
      state.view.chatEdit = id;
      delete state.view.chatReply;
      D.close();
      render();
      document.querySelector('[data-chat-form] textarea')?.focus();
    },
    chatCancel: () => {
      delete state.view.chatEdit;
      delete state.view.chatReply;
      render();
    },
    chatWithdraw: (id, messageId) =>
      confirm(
        'Thu hồi tin nhắn?',
        'Mọi người sẽ thấy thông báo tin đã được thu hồi.',
        () => {
          commit((data) => {
            const row = messageAt(selectedChat(data, id), messageId);
            if (
              row.sender !== data.currentUserId ||
              !row.sentAt ||
              Date.now() - row.sentAt > 24 * 3600000
            )
              throw Error('Đã quá thời gian thu hồi.');
            Object.assign(row, { retracted: true, files: [], text: '' });
          });
          refresh('Đã thu hồi tin nhắn.');
        },
        'Thu hồi',
      ),
    chatPin: (id) => {
      commit((data) => {
        const chat = selectedChat(data, id);
        const user = data.currentUserId;
        const pinned = (chat.pinned ||= []);
        if (pinned.includes(user)) chat.pinned = pinned.filter((id) => id !== user);
        else {
          if (userChats(data).filter((row) => row.pinned?.includes(user)).length >= 5)
            throw Error('Tối đa 5 cuộc trò chuyện được ghim.');
          pinned.push(user);
        }
      });
      refresh();
      conversationSettings(id);
    },
    chatHide: (id) =>
      confirm(
        'Ẩn cuộc trò chuyện?',
        'Cuộc trò chuyện sẽ xuất hiện lại khi có tin mới.',
        () => {
          commit((data) => {
            const chat = selectedChat(data, id);
            (chat.hidden ||= []).push(data.currentUserId);
          });
          go('messages');
          refresh('Đã ẩn cuộc trò chuyện.');
        },
        'Ẩn trò chuyện',
      ),
    chatManage: (id) => {
      const data = snapshot();
      const chat = selectedChat(data, id);
      show(
        'Quản lý nhóm chat',
        field('Tên nhóm', 'name', chat.name, { required: true }) +
          data.employees
            .filter((row) => !chat.memberIds.includes(row.id) && !row.locked)
            .map(
              (row) =>
                '<label class="form-check"><input type="checkbox" name="member" value="' +
                h(row.id) +
                '">' +
                h(row.fullName) +
                '</label>',
            )
            .join(''),
        {
          submit: (values, form) => {
            commit((data) => {
              const chat = selectedChat(data, id);
              const members = new FormData(form).getAll('member');
              if (chat.memberIds.length + members.length > 20)
                throw Error('Một nhóm có tối đa 20 thành viên.');
              chat.memberIds.push(...members);
              chat.name = clean(values.name, 'Tên nhóm');
            });
            refresh();
            conversationSettings(id);
          },
        },
      );
    },
    chatRemovePerson: (id, member) => {
      commit((data) => {
        const chat = selectedChat(data, id);
        if (chat.ownerId !== data.currentUserId) throw Error('Chỉ trưởng nhóm được xóa người.');
        chat.memberIds = chat.memberIds.filter((row) => row !== member);
      });
      refresh();
      conversationSettings(id);
    },
    chatLeave: (id) =>
      confirm(
        'Rời nhóm?',
        'Nhóm sẽ biến mất khỏi danh sách của bạn.',
        () => {
          commit((data) => {
            const chat = selectedChat(data, id);
            chat.memberIds = chat.memberIds.filter((row) => row !== data.currentUserId);
            if (chat.ownerId === data.currentUserId) chat.ownerId = chat.memberIds[0];
          });
          go('messages');
          refresh('Đã rời nhóm.');
        },
        'Rời nhóm',
      ),
    startCall: (id, mode) => {
      state.activeCall = { id, mode, at: Date.now() };
      go('calls/' + id);
      setTimeout(() => {
        if (
          state.route === 'calls/' + id &&
          !state.view.callConnected &&
          state.activeCall?.id === id
        )
          actions.endDemoCall(id);
      }, 30000);
    },
    acceptDemoCall: () => {
      state.view.callConnected = true;
      if (state.activeCall) state.activeCall.connectedAt = Date.now();
      render();
    },
    callToggle: (name) => {
      const key = name === 'mic' ? 'callMicOff' : 'callCameraOff';
      state.view[key] = !state.view[key];
      render();
    },
    endDemoCall: (id) => {
      if (state.activeCall?.id === id)
        commit((data) => {
          const chat = selectedChat(data, id);
          const connected = state.activeCall.connectedAt;
          const length = connected ? Math.max(1, Math.round((Date.now() - connected) / 1000)) : 0;
          chat.messages.push({
            id: uid('message'),
            sender: data.currentUserId,
            text: length ? 'Cuộc gọi kết thúc · ' + length + ' giây' : 'Cuộc gọi nhỡ',
            date: today(),
            sentAt: Date.now(),
            callMode: state.activeCall.mode,
          });
        });
      delete state.activeCall;
      go('messages/' + id);
    },
    composePost: () => postForm(),
    postActions: (id) => {
      const data = snapshot();
      const row = lookup(data, 'posts', id);
      show(
        'Thao tác bài viết',
        actionRow(
          (row.authorId === data.currentUserId ? act('postEdit|' + id, 'Sửa bài', 'edit') : '') +
            act('postDelete|' + id, 'Xóa bài', 'delete', 'btn danger'),
        ),
        { glyph: 'dynamic_feed' },
      );
    },
    postEdit: postForm,
    postDelete: (id) =>
      confirm(
        'Xóa bài viết?',
        'Bình luận có liên quan sẽ được xóa cùng bài.',
        () => {
          commit((data) => {
            const row = lookup(data, 'posts', id);
            if (!D.access(data).admin && row.authorId !== data.currentUserId)
              throw Error('Bạn chưa có quyền xóa.');
            data.posts = data.posts.filter((row) => row.id !== id);
          });
          refresh('Đã xóa bài viết.');
        },
        'Xóa bài',
      ),
    postReactMenu: (id) => show('Thả cảm xúc', reactionPicker('postReaction|' + id)),
    postReaction: (id, value) => {
      commit((data) =>
        toggledReaction(lookup(data, 'posts', id), decodeURIComponent(value), data.currentUserId),
      );
      D.close();
      render();
    },
    postComments,
    postComment: (id, replyId) =>
      show('Viết bình luận', field('Nội dung', 'text', '', { type: 'textarea', required: true }), {
        glyph: 'chat_bubble_outline',
        submitLabel: 'Gửi',
        submit: (values) => {
          commit((data) => {
            const post = lookup(data, 'posts', id);
            (post.comments ||= []).push({
              id: uid('comment'),
              authorId: data.currentUserId,
              text: clean(values.text, 'Nội dung', 2000),
              date: today(),
              replyTo: typeof replyId === 'string' ? replyId : '',
            });
          });
          refresh();
          postComments(id);
        },
      }),
    commentDelete: (postId, comment) =>
      confirm(
        'Xóa bình luận?',
        'Các câu trả lời của bình luận này cũng được xóa.',
        () => {
          commit((data) => {
            const post = lookup(data, 'posts', postId);
            const row = post.comments.find((item) => item.id === comment);
            if (row.authorId !== data.currentUserId && !D.access(data).admin)
              throw Error('Bạn chưa có quyền xóa.');
            post.comments = post.comments.filter(
              (row) => row.id !== comment && row.replyTo !== comment,
            );
          });
          refresh();
          postComments(postId);
        },
        'Xóa',
      ),
    readAll: () => {
      commit((data) =>
        data.notifications
          .filter((row) => !row.userId || row.userId === data.currentUserId)
          .forEach((row) => {
            row.read = true;
          }),
      );
      refresh('Đã đánh dấu tất cả là đã đọc.');
    },
  });
})();
