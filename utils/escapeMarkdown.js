function escapeMarkdown(text) {
  return (typeof text === 'string' ? text : String(text ?? '―')).replace(/([*_`~|])/g, '\\$1');
}

module.exports = { escapeMarkdown };
