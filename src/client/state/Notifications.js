import EventEmitter from 'events';
import cons from './cons';

class Notifications extends EventEmitter {
  constructor(roomList) {
    super();

    this.supportEvents = ['m.room.message', 'm.room.encrypted', 'm.sticker'];
    this.matrixClient = roomList.matrixClient;
    this.roomList = roomList;

    this.roomIdToNoti = new Map();

    this._initNoti();
    this._listenEvents();
  }

  _initNoti() {
    const addNoti = (roomId) => {
      const room = this.matrixClient.getRoom(roomId);
      if (this.doesRoomHaveUnread(room) === false) return;
      const total = room.getUnreadNotificationCount('total');
      const highlight = room.getUnreadNotificationCount('highlight');
      const noti = this.getNoti(room.roomId);
      this._setNoti(room.roomId, total - noti.total, highlight - noti.highlight);
    };
    [...this.roomList.rooms].forEach(addNoti);
    [...this.roomList.directs].forEach(addNoti);
  }

  doesRoomHaveUnread(room) {
    const userId = this.matrixClient.getUserId();
    const readUpToId = room.getEventReadUpTo(userId);

    if (room.timeline.length
      && room.timeline[room.timeline.length - 1].sender
      && room.timeline[room.timeline.length - 1].sender.userId === userId
      && room.timeline[room.timeline.length - 1].getType() !== 'm.room.member') {
      return false;
    }

    for (let i = room.timeline.length - 1; i >= 0; i -= 1) {
      const event = room.timeline[i];

      if (event.getId() === readUpToId) return false;

      if (this.supportEvents.includes(event.getType())) {
        return true;
      }
    }
    return true;
  }

  getNoti(roomId) {
    return this.roomIdToNoti.get(roomId) || { total: 0, highlight: 0, from: null };
  }

  getTotalNoti(roomId) {
    const { total } = this.getNoti(roomId);
    return total;
  }

  getHighlightNoti(roomId) {
    const { highlight } = this.getNoti(roomId);
    return highlight;
  }

  getFromNoti(roomId) {
    const { from } = this.getNoti(roomId);
    return from;
  }

  hasNoti(roomId) {
    return this.roomIdToNoti.has(roomId);
  }

  _getAllParentIds(roomId) {
    let allParentIds = this.roomList.roomIdToParents.get(roomId);
    if (allParentIds === undefined) return new Set();
    const parentIds = [...allParentIds];

    parentIds.forEach((pId) => {
      allParentIds = new Set(
        [...allParentIds, ...this._getAllParentIds(pId)],
      );
    });

    return allParentIds;
  }

  _setNoti(roomId, total, highlight, childId) {
    const prevTotal = this.roomIdToNoti.get(roomId)?.total ?? null;
    const noti = this.getNoti(roomId);

    if (!childId || this._remainingParentIds?.has(roomId)) {
      noti.total += total;
      noti.highlight += highlight;
    }
    if (childId) {
      if (noti.from === null) noti.from = new Set();
      noti.from.add(childId);
    }

    this.roomIdToNoti.set(roomId, noti);
    this.emit(cons.events.notifications.NOTI_CHANGED, roomId, noti.total, prevTotal);

    if (!childId) this._remainingParentIds = this._getAllParentIds(roomId);
    else this._remainingParentIds.delete(roomId);

    const parentIds = this.roomList.roomIdToParents.get(roomId);
    if (typeof parentIds === 'undefined') {
      if (!childId) this._remainingParentIds = undefined;
      return;
    }
    [...parentIds].forEach((parentId) => this._setNoti(parentId, total, highlight, roomId));
    if (!childId) this._remainingParentIds = undefined;
  }

  _deleteNoti(roomId, total, highlight, childId) {
    if (this.roomIdToNoti.has(roomId) === false) return;

    const noti = this.getNoti(roomId);
    const prevTotal = noti.total;
    noti.total -= total;
    noti.highlight -= highlight;
    if (noti.total < 0) {
      noti.total = 0;
      noti.highlight = 0;
    }
    if (childId && noti.from !== null) {
      if (!this.hasNoti(childId)) noti.from.delete(childId);
    }
    if (noti.from === null || noti.from.size === 0) {
      this.roomIdToNoti.delete(roomId);
      this.emit(cons.events.notifications.FULL_READ, roomId);
      this.emit(cons.events.notifications.NOTI_CHANGED, roomId, null, prevTotal);
    } else {
      this.roomIdToNoti.set(roomId, noti);
      this.emit(cons.events.notifications.NOTI_CHANGED, roomId, noti.total, prevTotal);
    }

    const parentIds = this.roomList.roomIdToParents.get(roomId);
    if (typeof parentIds === 'undefined') return;
    [...parentIds].forEach((parentId) => this._deleteNoti(parentId, total, highlight, roomId));
  }

  _listenEvents() {
    this.matrixClient.on('Room.timeline', (mEvent, room) => {
      if (!this.supportEvents.includes(mEvent.getType())) return;

      const lastTimelineEvent = room.timeline[room.timeline.length - 1];
      if (lastTimelineEvent.getId() !== mEvent.getId()) return;
      if (mEvent.getSender() === this.matrixClient.getUserId()) return;

      const total = room.getUnreadNotificationCount('total');
      const highlight = room.getUnreadNotificationCount('highlight');

      const noti = this.getNoti(room.roomId);
      this._setNoti(room.roomId, total - noti.total, highlight - noti.highlight);
    });

    this.matrixClient.on('Room.receipt', (mEvent, room) => {
      if (mEvent.getType() === 'm.receipt') {
        const content = mEvent.getContent();
        const readedEventId = Object.keys(content)[0];
        const readerUserId = Object.keys(content[readedEventId]['m.read'])[0];
        if (readerUserId !== this.matrixClient.getUserId()) return;

        if (this.hasNoti(room.roomId)) {
          const noti = this.getNoti(room.roomId);
          this._deleteNoti(room.roomId, noti.total, noti.highlight);
        }
      }
    });

    this.matrixClient.on('Room.myMembership', (room, membership) => {
      if (membership === 'leave' && this.hasNoti(room.roomId)) {
        const noti = this.getNoti(room.roomId);
        this._deleteNoti(room.roomId, noti.total, noti.highlight);
      }
    });
  }
}

export default Notifications;
