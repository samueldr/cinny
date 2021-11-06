import appDispatcher from '../dispatcher';
import cons from '../state/cons';

function toggleMarkdown() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_MARKDOWN,
  });
}

function togglePeopleDrawer() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_PEOPLE_DRAWER,
  });
}

function toggleTypingNotificationsInStatusbar() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_TYPING_NOTIFICATION_IN_STATUSBAR,
  });
}

export {
  toggleMarkdown,
  togglePeopleDrawer,
  toggleTypingNotificationsInStatusbar,
};
