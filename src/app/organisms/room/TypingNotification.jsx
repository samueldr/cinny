/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './TypingNotification.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';

import Text from '../../atoms/text/Text';

import { getUsersActionJsx } from './common';

function TypingNotification({
  roomId,
  roomTimeline,
}) {
  const [typingMembers, setTypingMembers] = useState(new Set());
  const mx = initMatrix.matrixClient;

  function isSomeoneTyping(members) {
    const m = members;
    m.delete(mx.getUserId());
    if (m.size === 0) return false;
    return true;
  }

  function getTypingMessage(members) {
    const userIds = members;
    userIds.delete(mx.getUserId());
    return getUsersActionJsx(roomId, [...userIds], 'typing...');
  }

  function updateTyping(members) {
    setTypingMembers(members);
  }

  useEffect(() => {
    setTypingMembers(new Set());
  }, [roomId]);

  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, updateTyping);
    return () => {
      roomTimeline?.removeListener(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, updateTyping);
    };
  }, [roomTimeline]);

  return (
    <div className={`typing-notification${isSomeoneTyping(typingMembers) ? ' typing-notification--open' : ''}`}>
      <div className="bouncing-loader"><div /></div>
      <Text variant="b2">{getTypingMessage(typingMembers)}</Text>
    </div>
  );
}
TypingNotification.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
};

export default TypingNotification;
