import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import './Message.scss';

import initMatrix from '../../../client/initMatrix';
import Linkify from 'linkify-react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import parse from 'html-react-parser';
import sanitizeHtml from 'sanitize-html';
import { getUsername } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Button from '../../atoms/button/Button';
import Tooltip from '../../atoms/tooltip/Tooltip';
import Input from '../../atoms/input/Input';

import ReplyArrowIC from '../../../../public/res/ic/outlined/reply-arrow.svg';

const components = {
  code({
    // eslint-disable-next-line react/prop-types
    inline, className, children,
  }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={coy}
        language={match[1]}
        PreTag="div"
        showLineNumbers
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className}>{String(children)}</code>
    );
  },
};

function linkifyContent(content) {
  return <Linkify options={{ target: { url: '_blank' } }}>{content}</Linkify>;
}

function sanitizeColorizedTag(tagName, attributes) {
  const attribs = { ...attributes };
  const styles = [];
  if (attributes["data-mx-color"]) {
    styles.push(`color: ${attributes["data-mx-color"]};`);
  }
  if (attributes["data-mx-bg-color"]) {
    styles.push(`background-color: ${attributes["data-mx-bg-color"]};`);
  }
  attribs.style = styles.join(" ");

  return {
    tagName,
    attribs
  };
}

function sanitizeLinkTag(tagName, attribs) {
  return {
    tagName,
    attribs: {
      ...attribs,
      'target': '_blank',
      'rel': 'noreferrer noopener',
    },
  };
}

function sanitizeCodeTag(tagName, attributes) {
  const attribs = { ...attributes };
  let classes = [];
  if (attributes["class"]) {
    classes = attributes["class"].split(/\s+/).filter((className) => className.match(/^language-(\w+)/));
  }

  return {
    tagName,
    attribs: {
      ...attribs,
      'class': classes.join(" "),
    },
  };
}

function sanitizeImgTag(tagName, attributes) {
  const mx = initMatrix.matrixClient;
  const { src } = attributes;
  const attribs = { ...attributes };
  delete attribs["src"]

  if (src.match(/^mxc:\/\//)) {
    attribs["src"] = mx.mxcUrlToHttp(src);
  }

  return {
    tagName,
    attribs,
  };
}

function fromHTML(str) {
  // See: https://spec.matrix.org/unstable/client-server-api/#mroommessage-msgtypes
  const sanitized = sanitizeHtml(str, {
    allowedTags: [
      'font',
      'del',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'p',
      'a',
      'ul',
      'ol',
      'sup',
      'sub',
      'li',
      'b',
      'i',
      'u',
      'strong',
      'em',
      'strike',
      'code',
      'hr',
      'br',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'caption',
      'pre',
      'span',
      'img',
      'details',
      'summary',
    ],
    allowedClasses: {},
    allowedAttributes: {
      'ol': ['start'],
      'img': ['width', 'height', 'alt', 'title', 'src'],
      'a': ['name', 'target', 'href', 'rel'],
      'code': ['class'],
      'font': ['data-mx-bg-color', 'data-mx-color', 'color', /* sanitized for data-mx-* */, 'style'],
      'span': ['data-mx-bg-color', 'data-mx-color', 'data-mx-spoiler', /* sanitized for data-mx-* */, 'style'],
    },
    allowProtocolRelative: false,
    allowedSchemesByTag: {
      // href (provided the value is not relative and has a scheme matching one of: https, http, ftp, mailto, magnet)
      a: [ 'https', 'http', 'ftp', 'mailto', 'magnet' ],
      // src will be sanitized from mxc://
      img: [ 'https', 'http' ],
    },
    // Allowed only when allowed in attributes.
    // Note that we should **always** use `sanitizeColorizedTag` on tags with styles enabled.
    allowedStyles: {
      '*': {
        'color': [/^#(0x)?[0-9a-f]+$/i],
        'background-color': [/^#(0x)?[0-9a-f]+$/i],
      },
    },
    nestingLimit: 100,
    nonTextTags: [
      'style', 'script', 'textarea', 'option',
      // We re-define `nonTextTags` as a cheaty way to discard `<mx-reply>`.
      'mx-reply',
    ],
    transformTags: {
      'a': sanitizeLinkTag,
      'img': sanitizeImgTag,
      'code': sanitizeCodeTag,
      'font': sanitizeColorizedTag,
      'span': sanitizeColorizedTag,
    },
  });

  return linkifyContent(parse(sanitized));
}

function PlaceholderMessage() {
  return (
    <div className="ph-msg">
      <div className="ph-msg__avatar-container">
        <div className="ph-msg__avatar" />
      </div>
      <div className="ph-msg__main-container">
        <div className="ph-msg__header" />
        <div className="ph-msg__content">
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
    </div>
  );
}

function MessageHeader({
  userId, name, color, time,
}) {
  return (
    <div className="message__header">
      <div style={{ color }} className="message__profile">
        <Text variant="b1">{name}</Text>
        <Text variant="b1">{userId}</Text>
      </div>
      <div className="message__time">
        <Text variant="b3">{time}</Text>
      </div>
    </div>
  );
}
MessageHeader.propTypes = {
  userId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
};

function MessageReply({ name, color, content }) {
  return (
    <div className="message__reply">
      <Text variant="b2">
        <RawIcon color={color} size="extra-small" src={ReplyArrowIC} />
        <span style={{ color }}>{name}</span>
        <>{` ${content}`}</>
      </Text>
    </div>
  );
}

MessageReply.propTypes = {
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
};

function MessageContent({
  senderName,
  content,
  formattedContent,
  isCustomHTML,
  isEdited,
  msgType,
}) {
  return (
    <div className={[
      "message__content",
      `message__content--format-${isCustomHTML ? "html" : "text"}`,
    ].join(" ")}>
      <div className="text text-b1">
        { msgType === 'm.emote' && `* ${senderName} ` }
        { isCustomHTML ? fromHTML(formattedContent) : <p>{linkifyContent(content)}</p> }
      </div>
      { isEdited && <Text className="message__content-edited" variant="b3">(edited)</Text>}
    </div>
  );
}
MessageContent.defaultProps = {
  isCustomHTML: false,
  isEdited: false,
};
MessageContent.propTypes = {
  senderName: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
  formattedContent: PropTypes.node,
  isCustomHTML: PropTypes.bool,
  isEdited: PropTypes.bool,
  msgType: PropTypes.string.isRequired,
};

function MessageEdit({ content, onSave, onCancel }) {
  const editInputRef = useRef(null);

  function handleKeyDown(e) {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault();
      onSave(editInputRef.current.value);
    }
  }

  return (
    <form className="message__edit" onSubmit={(e) => { e.preventDefault(); onSave(editInputRef.current.value); }}>
      <Input
        forwardRef={editInputRef}
        onKeyDown={handleKeyDown}
        value={content}
        placeholder="Edit message"
        required
        resizable
      />
      <div className="message__edit-btns">
        <Button type="submit" variant="primary">Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
MessageEdit.propTypes = {
  content: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function MessageReactionGroup({ children }) {
  return (
    <div className="message__reactions text text-b3 noselect">
      { children }
    </div>
  );
}
MessageReactionGroup.propTypes = {
  children: PropTypes.node.isRequired,
};

function genReactionMsg(userIds, reaction) {
  const genLessContText = (text) => <span style={{ opacity: '.6' }}>{text}</span>;
  let msg = <></>;
  userIds.forEach((userId, index) => {
    if (index === 0) msg = <>{getUsername(userId)}</>;
    // eslint-disable-next-line react/jsx-one-expression-per-line
    else if (index === userIds.length - 1) msg = <>{msg}{genLessContText(' and ')}{getUsername(userId)}</>;
    // eslint-disable-next-line react/jsx-one-expression-per-line
    else msg = <>{msg}{genLessContText(', ')}{getUsername(userId)}</>;
  });
  return (
    <>
      {msg}
      {genLessContText(' reacted with')}
      {reaction}
    </>
  );
}

function MessageReaction({
  reaction, users, isActive, onClick,
}) {
  return (
    <Tooltip
      className="msg__reaction-tooltip"
      content={<Text variant="b2">{genReactionMsg(users, reaction)}</Text>}
    >
      <button
        onClick={onClick}
        type="button"
        className={`msg__reaction${isActive ? ' msg__reaction--active' : ''}`}
      >
        { reaction }
        <Text variant="b3" className="msg__reaction-count">{users.length}</Text>
      </button>
    </Tooltip>
  );
}
MessageReaction.propTypes = {
  reaction: PropTypes.node.isRequired,
  users: PropTypes.arrayOf(PropTypes.string).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

function MessageOptions({ children }) {
  return (
    <div className="message__options">
      {children}
    </div>
  );
}
MessageOptions.propTypes = {
  children: PropTypes.node.isRequired,
};

function Message({
  avatar, header, reply, content, editContent, reactions, options,
  msgType,
}) {
  const className = [
    'message',
    header === null ? ' message--content-only' : ' message--full',
  ];
  switch (msgType) {
    case 'm.text':
      className.push('message--type-text');
      break;
    case 'm.emote':
      className.push('message--type-emote');
      break;
    case 'm.notice':
      className.push('message--type-notice');
      break;
    default:
  }

  return (
    <div className={className.join(' ')}>
      <div className="message__avatar-container">
        {avatar !== null && avatar}
      </div>
      <div className="message__main-container">
        {header !== null && header}
        {reply !== null && reply}
        {content !== null && content}
        {editContent !== null && editContent}
        {reactions !== null && reactions}
        {options !== null && options}
      </div>
    </div>
  );
}
Message.defaultProps = {
  avatar: null,
  header: null,
  reply: null,
  content: null,
  editContent: null,
  reactions: null,
  options: null,
  msgType: 'm.text',
};
Message.propTypes = {
  avatar: PropTypes.node,
  header: PropTypes.node,
  reply: PropTypes.node,
  content: PropTypes.node,
  editContent: PropTypes.node,
  reactions: PropTypes.node,
  options: PropTypes.node,
  msgType: PropTypes.string,
};

const MessageRedacted = ({ avatar, header, options }) =>
  <div className={`message message-redacted`}>
    <div className="message__avatar-container">
      {avatar !== null && avatar}
    </div>
    <div className="message__main-container">
      {header !== null && header}
      <div className="message__content">
        <div className="">
          <p>
            Message deleted
          </p>
        </div>
      </div>
      {options !== null && options}
    </div>
  </div>

export {
  Message,
  MessageHeader,
  MessageReply,
  MessageContent,
  MessageEdit,
  MessageReactionGroup,
  MessageReaction,
  MessageOptions,
  MessageRedacted,
  PlaceholderMessage,
};
