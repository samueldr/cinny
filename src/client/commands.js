import initMatrix from './initMatrix';
import { toggleMarkdown } from './action/settings';
import {
  openCreateRoom,
  openPublicRooms,
  openInviteUser,
} from './action/navigation';
import * as roomActions from './action/room';

const CINNY_COMMANDS = [{
  name: 'markdown',
  description: 'Toggle markdown for messages.',
  exe: () => toggleMarkdown(),
}, {
  name: 'startDM',
  isOptions: true,
  description: 'Start direct message with user. Example: /startDM/@johndoe.matrix.org',
  exe: (roomId, searchTerm) => openInviteUser(undefined, searchTerm),
}, {
  name: 'createRoom',
  description: 'Create new room',
  exe: () => openCreateRoom(),
}, {
  name: 'join',
  isOptions: true,
  description: 'Join room with alias. Example: /join/#cinny:matrix.org',
  exe: (roomId, searchTerm) => openPublicRooms(searchTerm),
}, {
  name: 'leave',
  description: 'Leave current room',
  exe: (roomId) => roomActions.leave(roomId),
}, {
  name: 'invite',
  isOptions: true,
  description: 'Invite user to room. Example: /invite/@johndoe:matrix.org',
  exe: (roomId, searchTerm) => openInviteUser(roomId, searchTerm),
}, {
  name: 'shrug',
  description: '¯\\_(ツ)_/¯',
  exe: (roomId, arg) => {
    const txt = ['¯\\_(ツ)_/¯'];
    if (arg) { txt.push(arg); }

    const content = {
      body: txt.join(" "),
      msgtype: 'm.text',
    };

    initMatrix.matrixClient.sendMessage(roomId, content);
  },
}, {
  name: 'me',
  description: 'Send text as an action (emote)',
  exe: (roomId, text) => {
    if (text) {
      const content = {
        body: text,
        msgtype: 'm.emote',
      };

      initMatrix.matrixClient.sendMessage(roomId, content);
    }
  },
}];

export default CINNY_COMMANDS;