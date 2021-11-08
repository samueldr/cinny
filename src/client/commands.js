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
}];

export default CINNY_COMMANDS;
