/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomViewCmdBar.scss';
import parse from 'html-react-parser';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import CINNY_COMMANDS from '../../../client/commands';
import settings from '../../../client/state/settings';
import {
  selectTab,
  selectRoom,
  openReadReceipts,
} from '../../../client/action/navigation';
import { emojis } from '../emoji-board/emoji';
import AsyncSearch from '../../../util/AsyncSearch';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import ContextMenu, { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import ScrollView from '../../atoms/scroll/ScrollView';
import SettingTile from '../../molecules/setting-tile/SettingTile';
import TimelineChange from '../../molecules/message/TimelineChange';
import TypingNotification from './TypingNotification';

import CmdIC from '../../../../public/res/ic/outlined/cmd.svg';

import { getUsersActionJsx } from './common';

function CmdHelp() {
  return (
    <ContextMenu
      placement="top"
      content={(
        <>
          <MenuHeader>General command</MenuHeader>
          <Text variant="b2">/command_name</Text>
          <MenuHeader>Go-to commands</MenuHeader>
          <Text variant="b2">{'>*space_name'}</Text>
          <Text variant="b2">{'>#room_name'}</Text>
          <Text variant="b2">{'>@people_name'}</Text>
          <MenuHeader>Autofill commands</MenuHeader>
          <Text variant="b2">:emoji_name</Text>
          <Text variant="b2">@name</Text>
          <Text variant="b2">#room</Text>
        </>
      )}
      render={(toggleMenu) => (
        <IconButton
          src={CmdIC}
          size="extra-small"
          onClick={toggleMenu}
          tooltip="Commands"
        />
      )}
    />
  );
}

function ViewCmd() {
  function renderAllCmds() {
    return CINNY_COMMANDS.map((command) => (
      <SettingTile
        key={command.name}
        title={command.name}
        content={(<Text variant="b3">{command.description}</Text>)}
      />
    ));
  }
  return (
    <ContextMenu
      maxWidth={250}
      placement="top"
      content={(
        <>
          <MenuHeader>General commands</MenuHeader>
          {renderAllCmds()}
        </>
      )}
      render={(toggleMenu) => (
        <span>
          <Button onClick={toggleMenu}><span className="text text-b3">View all</span></Button>
        </span>
      )}
    />
  );
}

function FollowingMembers({ roomId, roomTimeline, viewEvent }) {
  const [followingMembers, setFollowingMembers] = useState([]);
  const mx = initMatrix.matrixClient;

  function handleOnMessageSent() {
    setFollowingMembers([]);
  }

  function updateFollowingMembers() {
    const room = mx.getRoom(roomId);
    const { timeline } = room;
    const userIds = room.getUsersReadUpTo(timeline[timeline.length - 1]);
    const myUserId = mx.getUserId();
    setFollowingMembers(userIds.filter((userId) => userId !== myUserId));
  }

  useEffect(() => updateFollowingMembers(), [roomId]);

  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
    viewEvent.on('message_sent', handleOnMessageSent);
    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
      viewEvent.removeListener('message_sent', handleOnMessageSent);
    };
  }, [roomTimeline]);

  const { timeline } = roomTimeline.room;
  const lastMEvent = timeline[timeline.length - 1];
  return followingMembers.length !== 0 && (
    <TimelineChange
      variant="follow"
      content={getUsersActionJsx(roomId, followingMembers, 'following the conversation.')}
      time=""
      onClick={() => openReadReceipts(roomId, lastMEvent.getId())}
    />
  );
}

FollowingMembers.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

function CmdItem({ onClick, children }) {
  return (
    <button className="cmd-item" onClick={onClick} type="button">
      {children}
    </button>
  );
}
CmdItem.propTypes = {
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

function getCmdSuggestions({ prefix, option, suggestions }, fireCmd) {
  function getGenCmdSuggestions(cmdPrefix, cmds) {
    const cmdOptString = (typeof option === 'string') ? `/${option}` : '/?';
    return cmds.map((cmd) => (
      <CmdItem
        key={cmd.name}
        onClick={() => {
          fireCmd({
            prefix: cmdPrefix,
            option,
            result: cmd,
          });
        }}
      >
        <Text variant="b2">{`${cmd.name}${cmd.isOptions ? cmdOptString : ''}`}</Text>
      </CmdItem>
    ));
  }

  function getRoomsSuggestion(cmdPrefix, rooms) {
    return rooms.map((room) => (
      <CmdItem
        key={room.roomId}
        onClick={() => {
          fireCmd({
            prefix: cmdPrefix,
            result: room,
          });
        }}
      >
        <Text variant="b2">{room.name}</Text>
      </CmdItem>
    ));
  }

  function getEmojiSuggestion(emPrefix, emos) {
    return emos.map((emoji) => (
      <CmdItem
        key={emoji.hexcode}
        onClick={() => fireCmd({
          prefix: emPrefix,
          result: emoji,
        })}
      >
        {
            emoji.unicode
        }
        <Text variant="b2">{`:${emoji.shortcode}:`}</Text>
      </CmdItem>
    ));
  }

  function getNameSuggestion(namePrefix, members) {
    return members.map((member) => (
      <CmdItem
        key={member.userId}
        onClick={() => {
          fireCmd({
            prefix: namePrefix,
            result: member,
          });
        }}
      >
        <Text variant="b2">{member.name}</Text>
      </CmdItem>
    ));
  }

  const cmd = {
    '/': (cmds) => getGenCmdSuggestions(prefix, cmds),
    '>*': (spaces) => getRoomsSuggestion(prefix, spaces),
    '>#': (rooms) => getRoomsSuggestion(prefix, rooms),
    '>@': (peoples) => getRoomsSuggestion(prefix, peoples),
    ':': (emos) => getEmojiSuggestion(prefix, emos),
    '@': (members) => getNameSuggestion(prefix, members),
    '#': (rooms) => getRoomsSuggestion(prefix, rooms),
  };
  return cmd[prefix]?.(suggestions);
}

const asyncSearch = new AsyncSearch();
let cmdPrefix;
let cmdOption;
function RoomViewCmdBar({ roomId, roomTimeline, viewEvent }) {
  const [cmd, setCmd] = useState(null);
  const [isTypingNotificationsInStatusbar, setIsTypingNotificationsInStatusbar] = useState(settings.isTypingNotificationsInStatusbar);

  function displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
      setCmd({ prefix: cmd?.prefix || cmdPrefix, error: 'No suggestion found.' });
      viewEvent.emit('cmd_error');
      return;
    }
    setCmd({ prefix: cmd?.prefix || cmdPrefix, suggestions, option: cmdOption });
  }

  function getCmdActivationMessage(prefix) {
    function genMessage(prime, secondary) {
      return (
        <>
          <span>{prime}</span>
          <span>{secondary}</span>
        </>
      );
    }
    const cmd = {
      '/': () => getCmdSuggestions(cmd, fireCmd),
      '>*': () => genMessage('Go-to command mode activated. ', 'Type space name for suggestions.'),
      '>#': () => genMessage('Go-to command mode activated. ', 'Type room name for suggestions.'),
      '>@': () => genMessage('Go-to command mode activated. ', 'Type people name for suggestions.'),
      ':': () => genMessage('Emoji autofill command mode activated. ', 'Type emoji shortcut for suggestions.'),
      '@': () => genMessage('Name autofill command mode activated. ', 'Type name for suggestions.'),
      '#': () => genMessage('Room completion command mode activated. ', 'Type room for suggestions.'),
    };
    return cmd[prefix]?.();
  }

  function processCmd(prefix, slug) {
    let searchTerm = slug;
    cmdOption = undefined;
    cmdPrefix = prefix;
    if (prefix === '/') {
      const cmdSlugParts = slug.split('/');
      [searchTerm, cmdOption] = cmdSlugParts;
    }
    if (prefix === ':') {
      if (searchTerm.length <= 3) {
        if (searchTerm.match(/^[-]?(\))$/)) searchTerm = 'smile';
        else if (searchTerm.match(/^[-]?(s|S)$/)) searchTerm = 'confused';
        else if (searchTerm.match(/^[-]?(o|O|0)$/)) searchTerm = 'astonished';
        else if (searchTerm.match(/^[-]?(\|)$/)) searchTerm = 'neutral_face';
        else if (searchTerm.match(/^[-]?(d|D)$/)) searchTerm = 'grin';
        else if (searchTerm.match(/^[-]?(\/)$/)) searchTerm = 'frown';
        else if (searchTerm.match(/^[-]?(p|P)$/)) searchTerm = 'stuck_out_tongue';
        else if (searchTerm.match(/^'[-]?(\()$/)) searchTerm = 'cry';
        else if (searchTerm.match(/^[-]?(x|X)$/)) searchTerm = 'dizzy_face';
        else if (searchTerm.match(/^[-]?(\()$/)) searchTerm = 'pleading_face';
        else if (searchTerm.match(/^[-]?(\$)$/)) searchTerm = 'money';
        else if (searchTerm.match(/^(<3)$/)) searchTerm = 'heart';
        else if (searchTerm.match(/^(c|ca|cat)$/)) searchTerm = '_cat';
      }
    }

    asyncSearch.search(searchTerm);
  }
  function activateCmd(prefix) {
    setCmd({ prefix });
    cmdPrefix = prefix;

    const { roomList, matrixClient } = initMatrix;
    function getRooms(roomIds) {
      return roomIds.map((rId) => {
        const room = matrixClient.getRoom(rId);
        return {
          name: room.name,
          alias: room.getCanonicalAlias(),
          roomId: room.roomId,
        };
      });
    }
    const setupSearch = {
      '/': () => asyncSearch.setup(CINNY_COMMANDS, { keys: ['name'], isContain: true, suggestAllOnEmpty: true }),
      '>*': () => asyncSearch.setup(getRooms([...roomList.spaces]), { keys: ['name'], limit: 20 }),
      '>#': () => asyncSearch.setup(getRooms([...roomList.rooms]), { keys: ['name'], limit: 20 }),
      '>@': () => asyncSearch.setup(getRooms([...roomList.directs]), { keys: ['name'], limit: 20 }),
      ':': () => asyncSearch.setup(emojis, { keys: ['shortcode'], isContain: true, limit: 20 }),
      '@': () => asyncSearch.setup(matrixClient.getRoom(roomId).getJoinedMembers().map((member) => ({
        name: member.name,
        userId: member.userId.slice(1),
      })), { keys: ['name', 'userId'], limit: 20 }),
      '#': () => asyncSearch.setup(getRooms([...roomList.rooms]), { keys: ['name'], limit: 20 }),
    };
    setupSearch[prefix]?.();
  }
  function deactivateCmd() {
    setCmd(null);
    cmdOption = undefined;
    cmdPrefix = undefined;
  }
  function fireCmd(myCmd) {
    if (myCmd.prefix.match(/^>[*#@]$/)) {
      if (cmd.prefix === '>*') selectTab(myCmd.result.roomId);
      else selectRoom(myCmd.result.roomId);
      viewEvent.emit('cmd_fired');
    }
    if (myCmd.prefix === '/') {
      viewEvent.emit('cmd_fired', {
        result: myCmd.result,
        replace: `/${myCmd.result.name} `,
      });
    }
    if (myCmd.prefix === ':') {
      viewEvent.emit('cmd_fired', {
        replace: myCmd.result.unicode,
      });
    }
    if (myCmd.prefix === '@') {
      viewEvent.emit('cmd_fired', {
        // FIXME: https://spec.matrix.org/unstable/client-server-api/#user-room-and-group-mentions
        // When sending with a `formatted_body`, the user mention should be an <a> element with a matrix.to link.
        // `/html <a href="https://matrix.to/#/@samueldr:matrix.org">[actually not used when rendering the actual pill... should be the current username]</a>`
        // XXX: if not markdown message
        // replace: `@${myCmd.result.name} `,
        // leadingReplacement: `@${myCmd.result.name}: `,
        // XXX: if markdown message
        replace: `[${myCmd.result.name}](https://matrix.to/#/@${myCmd.result.userId}) `,
        leadingReplacement: `[${myCmd.result.name}](https://matrix.to/#/@${myCmd.result.userId}): `,
      });
    }
    if (myCmd.prefix === '#') {
      // FIXME: https://spec.matrix.org/unstable/client-server-api/#user-room-and-group-mentions
      // When sending with a `formatted_body`, the user mention should be an <a> element with a matrix.to link.
      // `/html <a href="https://matrix.to/#/#nixos-on-arm:nixos.org">[actually not used when rendering the actual pill...]</a>`
      viewEvent.emit('cmd_fired', {
        // XXX: if not markdown message
        // replace: myCmd.result.alias,
        // XXX: if markdown message
        replace: `[${myCmd.result.alias}](https://matrix.to/#/${myCmd.result.roomId}) `,
      });
    }
    deactivateCmd();
  }
  function executeCmd() {
    if (!cmd.suggestions || cmd.suggestions.length === 0) return;
    fireCmd({
      prefix: cmd.prefix,
      option: cmd.option,
      result: cmd.suggestions[0],
    });
  }

  function listenKeyboard(event) {
    const { activeElement } = document;
    const lastCmdItem = document.activeElement.parentNode.lastElementChild;
    if (event.keyCode === 27) {
      if (activeElement.className !== 'cmd-item') return;
      viewEvent.emit('focus_msg_input');
    }
    if (event.keyCode === 9) {
      if (lastCmdItem.className !== 'cmd-item') return;
      if (lastCmdItem !== activeElement) return;
      if (event.shiftKey) return;
      viewEvent.emit('focus_msg_input');
      event.preventDefault();
    }
  }

  useEffect(() => {
    viewEvent.on('cmd_activate', activateCmd);
    viewEvent.on('cmd_deactivate', deactivateCmd);
    return () => {
      deactivateCmd();
      viewEvent.removeListener('cmd_activate', activateCmd);
      viewEvent.removeListener('cmd_deactivate', deactivateCmd);
    };
  }, [roomId]);

  useEffect(() => {
    if (cmd !== null) document.body.addEventListener('keydown', listenKeyboard);
    viewEvent.on('cmd_process', processCmd);
    viewEvent.on('cmd_exe', executeCmd);
    asyncSearch.on(asyncSearch.RESULT_SENT, displaySuggestions);
    return () => {
      if (cmd !== null) document.body.removeEventListener('keydown', listenKeyboard);

      viewEvent.removeListener('cmd_process', processCmd);
      viewEvent.removeListener('cmd_exe', executeCmd);
      asyncSearch.removeListener(asyncSearch.RESULT_SENT, displaySuggestions);
    };
  }, [cmd]);

  useEffect(() => {
    settings.on(cons.events.settings.TYPING_NOTIFICATION_IN_STATUSBAR_TOGGLED, setIsTypingNotificationsInStatusbar);
    return () => {
      settings.removeListener(cons.events.settings.TYPING_NOTIFICATION_IN_STATUSBAR_TOGGLED, setIsTypingNotificationsInStatusbar);
    };
  }, []);

  if (typeof cmd?.error === 'string') {
    return (
      <div className="cmd-bar">
        <div className="cmd-bar__info">
          <div className="cmd-bar__info-indicator--error" />
        </div>
        <div className="cmd-bar__content">
          <Text className="cmd-bar__content-error" variant="b2">{cmd.error}</Text>
        </div>
      </div>
    );
  }

  const inSuggestionMode = cmd !== null;
  const hasSuggestions = inSuggestionMode && (typeof cmd.suggestions === 'undefined' || cmd.suggestions?.length > 0);

  return (
    <div className="cmd-bar">
      <div className="cmd-bar__info">
        {!inSuggestionMode && <CmdHelp />}
        {inSuggestionMode && !hasSuggestions && <div className="cmd-bar__info-indicator" /> }
        {inSuggestionMode && hasSuggestions && <Text variant="b3">TAB</Text>}
      </div>
      <div className="cmd-bar__content">
        {!inSuggestionMode && settings.isTypingNotificationsInStatusbar &&
          <TypingNotification roomId={roomId} roomTimeline={roomTimeline} />
        }
        {!inSuggestionMode && (
          <FollowingMembers
            roomId={roomId}
            roomTimeline={roomTimeline}
            viewEvent={viewEvent}
          />
        )}
        {inSuggestionMode && !hasSuggestions && <Text className="cmd-bar__content-help" variant="b2">{getCmdActivationMessage(cmd.prefix)}</Text>}
        {inSuggestionMode && hasSuggestions && (
          <ScrollView horizontal vertical={false} invisible>
            <div className="cmd-bar__content__suggestions">{getCmdSuggestions(cmd, fireCmd)}</div>
          </ScrollView>
        )}
      </div>
      <div className="cmd-bar__more">
        {inSuggestionMode && cmd.prefix === '/' && <ViewCmd />}
      </div>
    </div>
  );
}
RoomViewCmdBar.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewCmdBar;
