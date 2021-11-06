/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomViewFloating.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import TypingNotification from './TypingNotification';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';

import { getUsersActionJsx } from './common';

function RoomViewFloating({
  roomId, roomTimeline, viewEvent,
}) {
  const [reachedBottom, setReachedBottom] = useState(true);
  const [isTypingNotificationsInStatusbar, setIsTypingNotificationsInStatusbar] = useState(settings.isTypingNotificationsInStatusbar);
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
  const handleTimelineScroll = (position) => {
    setReachedBottom(position === 'BOTTOM');
  };

  useEffect(() => {
    setReachedBottom(true);
    viewEvent.on('timeline-scroll', handleTimelineScroll);
    return () => viewEvent.removeListener('timeline-scroll', handleTimelineScroll);
  }, [roomId]);

  useEffect(() => {
    settings.on(cons.events.settings.TYPING_NOTIFICATION_IN_STATUSBAR_TOGGLED, setIsTypingNotificationsInStatusbar);
    return () => {
      settings.removeListener(cons.events.settings.TYPING_NOTIFICATION_IN_STATUSBAR_TOGGLED, setIsTypingNotificationsInStatusbar);
    };
  }, []);

  return (
    <>
      { settings.isTypingNotificationsInStatusbar ||
        <TypingNotification roomId={roomId} roomTimeline={roomTimeline} />
      }
      <div className={`room-view__STB${reachedBottom ? '' : ' room-view__STB--open'}`}>
        <IconButton
          onClick={() => {
            viewEvent.emit('scroll-to-live');
            setReachedBottom(true);
          }}
          src={ChevronBottomIC}
          tooltip="Scroll to Bottom"
        />
      </div>
    </>
  );
}
RoomViewFloating.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewFloating;
